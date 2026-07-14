import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";

export type ConflictResolutionStrategy = "keep_newer" | "keep_older" | "keep_higher_importance" | "keep_higher_confidence" | "merge";

export interface ConflictResolution {
  survivingRecord: MemoryRecord;
  discardedIds: string[];
  strategy: ConflictResolutionStrategy;
  resolution: string;
}

export class ConflictResolver {
  resolve(
    records: MemoryRecord[],
    strategy: ConflictResolutionStrategy = "keep_higher_importance",
  ): ConflictResolution {
    if (records.length === 0) {
      throw new Error("Cannot resolve conflict with zero records");
    }
    if (records.length === 1) {
      return {
        survivingRecord: records[0],
        discardedIds: [],
        strategy,
        resolution: "Single record, no conflict",
      };
    }

    const sorted = [...records].sort((a, b) => this.compare(a, b, strategy));
    const survivor = sorted[0];
    const discarded = sorted.slice(1);

    const mergedTrace: MemoryTraceEvent[] = [...survivor.trace];

    for (const disc of discarded) {
      mergedTrace.push({
        event: "merged",
        timestamp: new Date().toISOString(),
        previousState: disc.lifecycleState,
        newState: survivor.lifecycleState,
        detail: `Merged from ${disc.id}: ${disc.content.slice(0, 100)}`,
      });
    }

    const survivingRecord: MemoryRecord = {
      ...survivor,
      trace: mergedTrace,
      updatedAt: new Date().toISOString(),
      mergedFrom: [...(survivor.mergedFrom ?? []), ...discarded.map(d => d.id)],
      accessCount: survivor.accessCount + discarded.reduce((sum, d) => sum + d.accessCount, 0),
      recurrenceCount: survivor.recurrenceCount + discarded.reduce((sum, d) => sum + d.recurrenceCount, 0),
    };

    return {
      survivingRecord,
      discardedIds: discarded.map(d => d.id),
      strategy,
      resolution: `Kept ${survivor.id} (${this.describeStrategy(strategy)}), discarded ${discarded.length} record(s)`,
    };
  }

  private compare(a: MemoryRecord, b: MemoryRecord, strategy: ConflictResolutionStrategy): number {
    switch (strategy) {
      case "keep_newer":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "keep_older":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "keep_higher_importance":
        return b.importance.total - a.importance.total;
      case "keep_higher_confidence":
        return b.confidence - a.confidence;
      case "merge":
        return b.importance.total + b.confidence - (a.importance.total + a.confidence);
      default:
        return b.importance.total - a.importance.total;
    }
  }

  private describeStrategy(strategy: ConflictResolutionStrategy): string {
    switch (strategy) {
      case "keep_newer": return "newer record wins";
      case "keep_older": return "older record wins";
      case "keep_higher_importance": return "higher importance wins";
      case "keep_higher_confidence": return "higher confidence wins";
      case "merge": return "merged by combined score";
    }
  }
}
