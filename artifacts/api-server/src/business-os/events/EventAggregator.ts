import { EventPriority } from "./EventPriority";
import type { EventEnvelope } from "./EventEnvelope";
import { createEnvelope } from "./EventEnvelope";

interface AggregationWindow {
  eventType: string;
  branchId: number;
  envelopes: EventEnvelope[];
  timer: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

const WINDOW_MS: Record<EventPriority, number> = {
  [EventPriority.INFO]: 30000,
  [EventPriority.WARNING]: 15000,
  [EventPriority.HIGH]: 5000,
  [EventPriority.CRITICAL]: 0,
};

const activeWindows = new Map<string, AggregationWindow>();

type FlushCallback = (aggregated: EventEnvelope) => void;

let onFlush: FlushCallback | null = null;

function windowKey(type: string, branchId: number): string {
  return `${type}:${branchId}`;
}

function createAggregated(envelopes: EventEnvelope[]): EventEnvelope {
  const first = envelopes[0];
  const highestPriority = envelopes.reduce((max, e) =>
    EventPriority[e.priority] > EventPriority[max] ? e.priority : max,
    first.priority,
  );
  const totalCount = envelopes.length;
  const summarizedData: Record<string, unknown> = {
    ...first.data,
    aggregated: true,
    eventCount: totalCount,
    firstEvent: first.timestamp.toISOString(),
    lastEvent: envelopes[envelopes.length - 1].timestamp.toISOString(),
    timestamps: envelopes.map(e => e.timestamp.toISOString()),
    allEventIds: envelopes.map(e => e.id),
  };
  return createEnvelope(
    first.type,
    highestPriority,
    summarizedData,
    `aggregator:${first.source}`,
    first.branchId,
    first.aggregateId,
    first.aggregateType,
    first.userId,
  );
}

function flushWindow(key: string): void {
  const window = activeWindows.get(key);
  if (!window || window.envelopes.length === 0) return;

  if (window.envelopes.length === 1) {
    if (onFlush) onFlush(window.envelopes[0]);
  } else {
    const aggregated = createAggregated(window.envelopes);
    if (onFlush) onFlush(aggregated);
  }

  if (window.timer) clearTimeout(window.timer);
  activeWindows.delete(key);
}

export function push(event: EventEnvelope): void {
  if (event.priority === EventPriority.CRITICAL) {
    if (onFlush) onFlush(event);
    return;
  }

  const key = windowKey(event.type, event.branchId);
  let window = activeWindows.get(key);

  if (!window) {
    window = { eventType: event.type, branchId: event.branchId, envelopes: [], timer: null, startedAt: Date.now() };
    activeWindows.set(key, window);
  }

  window.envelopes.push(event);

  if (window.timer) clearTimeout(window.timer);
  window.timer = setTimeout(() => flushWindow(key), WINDOW_MS[event.priority] || 30000);
}

export function setFlushHandler(callback: FlushCallback): void {
  onFlush = callback;
}

export function forceFlush(eventType?: string, branchId?: number): void {
  if (eventType && branchId !== undefined) {
    flushWindow(windowKey(eventType, branchId));
    return;
  }
  if (eventType) {
    for (const [key] of activeWindows) {
      if (key.startsWith(`${eventType}:`)) flushWindow(key);
    }
    return;
  }
  for (const [key] of activeWindows) {
    flushWindow(key);
  }
}

export function getActiveWindowCount(): number {
  return activeWindows.size;
}

export function getWindowSizes(): { eventType: string; branchId: number; count: number; ageMs: number }[] {
  const now = Date.now();
  return Array.from(activeWindows.values()).map(w => ({
    eventType: w.eventType,
    branchId: w.branchId,
    count: w.envelopes.length,
    ageMs: now - w.startedAt,
  }));
}
