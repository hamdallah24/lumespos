import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";
import { DuplicateDetector } from "./DuplicateDetector";
import { ConflictResolver, type ConflictResolutionStrategy } from "./ConflictResolver";

export interface ConsolidationResult {
  consolidated: MemoryRecord[];
  removedIds: string[];
  mergedPairs: { keptId: string; removedId: string; reason: string }[];
}

export class ConsolidationEngine {
  constructor(
    private detector: DuplicateDetector = new DuplicateDetector(),
    private resolver: ConflictResolver = new ConflictResolver(),
  ) {}

  consolidate(
    records: MemoryRecord[],
    strategy: ConflictResolutionStrategy = "keep_higher_importance",
  ): ConsolidationResult {
    if (records.length <= 1) {
      return { consolidated: records, removedIds: [], mergedPairs: [] };
    }

    let working = [...records];
    const removedIds: string[] = [];
    const mergedPairs: { keptId: string; removedId: string; reason: string }[] = [];

    let changed = true;
    while (changed) {
      changed = false;

      for (let i = 0; i < working.length; i++) {
        for (let j = i + 1; j < working.length; j++) {
          const dupResult = this.detector.checkPair(working[i], working[j]);

          if (dupResult && (dupResult.relation === "identical" || dupResult.relation === "similar" || dupResult.relation === "conflicting")) {
            const resolution = this.resolver.resolve(
              [working[i], working[j]],
              dupResult.relation === "conflicting" ? strategy : "keep_higher_importance",
            );

            const removedId = working[j].id;
            const keptId = working[i].id;

            working[i] = resolution.survivingRecord;
            working.splice(j, 1);

            removedIds.push(removedId);
            mergedPairs.push({
              keptId,
              removedId,
              reason: `Detected as ${dupResult.relation} (similarity: ${(dupResult.similarityScore * 100).toFixed(0)}%)`,
            });

            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    return {
      consolidated: working,
      removedIds: [...new Set(removedIds)],
      mergedPairs,
    };
  }
}
