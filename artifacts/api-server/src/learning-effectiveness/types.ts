export type TelemetryEventType =
  | "retrieve" | "ingest" | "feedback" | "maintenance"
  | "executive_decision" | "council_decision"
  | "confidence_adjustment" | "promotion" | "deprecation" | "archive";

export type TelemetryResult = "success" | "failure" | "partial";

export type TelemetrySeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type TelemetryCategory =
  | "retrieve" | "ingest" | "feedback" | "maintenance"
  | "decision" | "memory" | "knowledge" | "council" | "health";

export interface TelemetryEvent {
  id: string;
  eventVersion: number;
  type: TelemetryEventType;
  category: TelemetryCategory;
  severity: TelemetrySeverity;
  timestamp: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  queuedTime?: number;
  processingTime?: number;
  result: TelemetryResult;
  traceId?: string;
  sessionId?: string;
  parentTraceId?: string;
  parentEventId?: string;
  sequence: number;
  runtime?: string;
  environment?: string;
  executive?: string;
  mission?: string;
  engine?: string;
  adapter?: string;
  capability?: string;
  correlationId?: string;
  executiveRole?: string;
  missionType?: string;
  learningEngine?: string;
  decisionId?: string;
  missionId?: string;
  organizationId?: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
}

export type ExportFormat = "json" | "csv" | "ndjson";

export interface TelemetryStoreHealth {
  size: number;
  maxSize: number;
  memoryUsage: number;
  droppedEvents: number;
  oldestEvent: string | null;
  newestEvent: string | null;
  eventsPerMinute: number;
  averageLatency: number;
}

export class TelemetryStore {
  private events: TelemetryEvent[] = [];
  private readonly maxEvents = 50000;
  private idCounter = 0;
  private seqCounter = 0;
  private droppedEvents = 0;
  private creationTime = Date.now();

  private nextId(): string {
    this.idCounter++;
    return `tel-${Date.now().toString(36)}-${this.idCounter}`;
  }

  nextSequence(): number {
    this.seqCounter++;
    return this.seqCounter;
  }

  record(event: Omit<TelemetryEvent, "id" | "eventVersion" | "sequence">): TelemetryEvent {
    const full: TelemetryEvent = {
      id: this.nextId(),
      eventVersion: 1,
      sequence: this.nextSequence(),
      ...event,
    };
    this.events.push(full);
    if (this.events.length > this.maxEvents) {
      const excess = this.events.length - this.maxEvents;
      this.events.splice(0, excess);
      this.droppedEvents += excess;
    }
    return full;
  }

  // ── Queries ──

  query(filter?: {
    type?: TelemetryEventType; executive?: string; engine?: string;
    since?: string; until?: string; limit?: number; offset?: number;
    severity?: TelemetrySeverity; category?: TelemetryCategory;
    result?: TelemetryResult; sessionId?: string; traceId?: string;
  }): TelemetryEvent[] {
    let result = [...this.events];
    if (filter?.type) result = result.filter(e => e.type === filter.type);
    if (filter?.executive) result = result.filter(e => e.executive === filter.executive);
    if (filter?.engine) result = result.filter(e => e.engine === filter.engine);
    if (filter?.severity) result = result.filter(e => e.severity === filter.severity);
    if (filter?.category) result = result.filter(e => e.category === filter.category);
    if (filter?.result) result = result.filter(e => e.result === filter.result);
    if (filter?.sessionId) result = result.filter(e => e.sessionId === filter.sessionId);
    if (filter?.traceId) result = result.filter(e => e.traceId === filter.traceId);
    if (filter?.since) result = result.filter(e => e.timestamp >= filter.since!);
    if (filter?.until) result = result.filter(e => e.timestamp <= filter.until!);
    result.sort((a, b) => b.sequence - a.sequence);
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    return result.slice(offset, offset + limit);
  }

  findByTrace(traceId: string): TelemetryEvent[] {
    return this.query({ traceId, limit: 5000 });
  }

  findBySession(sessionId: string): TelemetryEvent[] {
    return this.query({ sessionId, limit: 5000 });
  }

  findChildren(parentEventId: string): TelemetryEvent[] {
    return this.events.filter(e => e.parentEventId === parentEventId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  findParents(eventId: string): TelemetryEvent[] {
    const event = this.events.find(e => e.id === eventId);
    if (!event?.parentEventId) return [];
    const parent = this.events.find(e => e.id === event.parentEventId);
    return parent ? [parent] : [];
  }

  rebuildTimeline(traceId: string): TelemetryEvent[] {
    return this.findByTrace(traceId).sort((a, b) => a.sequence - b.sequence);
  }

  // ── Aggregations ──

  countByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) counts[e.category] = (counts[e.category] ?? 0) + 1;
    return counts;
  }

  countBySeverity(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) counts[e.severity] = (counts[e.severity] ?? 0) + 1;
    return counts;
  }

  countByExecutive(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      if (e.executive) counts[e.executive] = (counts[e.executive] ?? 0) + 1;
    }
    return counts;
  }

  countByEngine(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      if (e.engine) counts[e.engine] = (counts[e.engine] ?? 0) + 1;
    }
    return counts;
  }

  countByMission(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      if (e.missionId) counts[e.missionId] = (counts[e.missionId] ?? 0) + 1;
    }
    return counts;
  }

  groupBy(field: keyof TelemetryEvent): Record<string, TelemetryEvent[]> {
    const groups: Record<string, TelemetryEvent[]> = {};
    for (const e of this.events) {
      const key = String((e as any)[field] ?? "undefined");
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }

  aggregate(field: keyof TelemetryEvent): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      const key = String((e as any)[field] ?? "undefined");
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  histogram(field: keyof TelemetryEvent, bucketSize: number = 10): { bucket: string; count: number }[] {
    const values = this.events.map(e => Number((e as any)[field])).filter(v => !isNaN(v));
    if (values.length === 0) return [];
    const max = Math.max(...values);
    const buckets: { bucket: string; count: number }[] = [];
    for (let i = 0; i <= max; i += bucketSize) {
      const end = i + bucketSize;
      buckets.push({
        bucket: `${i}-${end}`,
        count: values.filter(v => v >= i && v < end).length,
      });
    }
    return buckets;
  }

  timeSeries(intervalMs: number = 60000): { window: string; count: number }[] {
    if (this.events.length === 0) return [];
    const sorted = [...this.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const start = new Date(sorted[0].timestamp).getTime();
    const end = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const series: { window: string; count: number }[] = [];
    for (let t = start; t <= end; t += intervalMs) {
      const windowEnd = t + intervalMs;
      series.push({
        window: new Date(t).toISOString(),
        count: sorted.filter(e => {
          const et = new Date(e.timestamp).getTime();
          return et >= t && et < windowEnd;
        }).length,
      });
    }
    return series;
  }

  percentile(field: keyof TelemetryEvent, p: number): number {
    const values = this.events.map(e => Number((e as any)[field])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const idx = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, idx)];
  }

  // ── Export ──

  exportEvents(format: ExportFormat, filter?: { type?: TelemetryEventType; since?: string; until?: string }): string {
    const events = this.query({ ...filter, limit: 50000 });
    switch (format) {
      case "json": return JSON.stringify(events, null, 2);
      case "ndjson": return events.map(e => JSON.stringify(e)).join("\n");
      case "csv": {
        if (events.length === 0) return "";
        const headers = Object.keys(events[0]).join(",");
        const rows = events.map(e => Object.values(e).map(v => {
          if (typeof v === "object") return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
          return String(v ?? "");
        }).join(","));
        return [headers, ...rows].join("\n");
      }
    }
  }

  // ── Health ──

  getHealth(): TelemetryStoreHealth {
    const now = Date.now();
    const elapsedMin = (now - this.creationTime) / 60000;
    const sorted = [...this.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const avgLat = this.events.length > 0
      ? Math.round(this.events.reduce((s, e) => s + e.durationMs, 0) / this.events.length)
      : 0;
    return {
      size: this.events.length,
      maxSize: this.maxEvents,
      memoryUsage: Math.round((this.events.length / this.maxEvents) * 100),
      droppedEvents: this.droppedEvents,
      oldestEvent: sorted.length > 0 ? sorted[0].timestamp : null,
      newestEvent: sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null,
      eventsPerMinute: elapsedMin > 0 ? Math.round(this.events.length / elapsedMin) : 0,
      averageLatency: avgLat,
    };
  }

  clear(): void {
    this.events = [];
    this.droppedEvents = 0;
  }

  count(): number {
    return this.events.length;
  }

  getStats(): {
    total: number; byType: Record<string, number>; byEngine: Record<string, number>;
    byExecutive: Record<string, number>; avgDuration: number; successRate: number;
  } {
    const total = this.events.length;
    if (total === 0) return { total: 0, byType: {}, byEngine: {}, byExecutive: {}, avgDuration: 0, successRate: 0 };
    const byType: Record<string, number> = {};
    const byEngine: Record<string, number> = {};
    const byExecutive: Record<string, number> = {};
    let totalDuration = 0;
    let successCount = 0;
    for (const e of this.events) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      if (e.engine) byEngine[e.engine] = (byEngine[e.engine] ?? 0) + 1;
      if (e.executive) byExecutive[e.executive] = (byExecutive[e.executive] ?? 0) + 1;
      totalDuration += e.durationMs;
      if (e.result === "success") successCount++;
    }
    return {
      total, byType, byEngine, byExecutive,
      avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    };
  }
}
