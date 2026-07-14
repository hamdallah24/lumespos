import type { MemoryTraceEvent } from "../models/MemoryRecord";

export type TraceFilter = {
  eventTypes?: string[];
  since?: string;
  until?: string;
  executive?: string;
};

export class MemoryTrace {
  filter(events: MemoryTraceEvent[], filter?: TraceFilter): MemoryTraceEvent[] {
    let filtered = [...events];

    if (filter?.eventTypes) {
      filtered = filtered.filter(e => filter.eventTypes!.includes(e.event));
    }

    if (filter?.since) {
      const since = new Date(filter.since).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= since);
    }

    if (filter?.until) {
      const until = new Date(filter.until).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= until);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  summary(events: MemoryTraceEvent[]): {
    total: number;
    byEvent: Record<string, number>;
    firstEvent?: MemoryTraceEvent;
    lastEvent?: MemoryTraceEvent;
  } {
    const byEvent: Record<string, number> = {};
    for (const e of events) {
      byEvent[e.event] = (byEvent[e.event] ?? 0) + 1;
    }

    return {
      total: events.length,
      byEvent,
      firstEvent: events.length > 0 ? events[events.length - 1] : undefined,
      lastEvent: events.length > 0 ? events[0] : undefined,
    };
  }
}
