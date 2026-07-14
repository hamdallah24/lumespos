import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";
import { ForgettingPolicy } from "../policy/ForgettingPolicy";

export interface ForgettingCandidate {
  record: MemoryRecord;
  reason: string;
  action: "archive" | "forget";
}

export interface ForgettingResult {
  archived: MemoryRecord[];
  forgotten: MemoryRecord[];
  kept: MemoryRecord[];
}

export class ForgettingEngine {
  constructor(private policy: ForgettingPolicy = new ForgettingPolicy()) {}

  evaluate(records: MemoryRecord[], executive?: string): ForgettingResult {
    const archived: MemoryRecord[] = [];
    const forgotten: MemoryRecord[] = [];
    const kept: MemoryRecord[] = [];

    for (const record of records) {
      const candidate = this.evaluateOne(record, executive);
      if (!candidate) {
        kept.push(record);
        continue;
      }

      if (candidate.action === "archive") {
        archived.push(this.applyTransition(record, "ARCHIVED", candidate.reason));
      } else {
        forgotten.push(this.applyTransition(record, "FORGOTTEN", candidate.reason));
      }
    }

    return { archived, forgotten, kept };
  }

  private evaluateOne(record: MemoryRecord, executive?: string): ForgettingCandidate | null {
    const config = this.policy.getConfig();

    if (record.lifecycleState === "FORGOTTEN") return null;

    if (record.importance.total < config.minImportanceToKeep) {
      return {
        record,
        reason: `Importance (${record.importance.total}) below minimum threshold (${config.minImportanceToKeep})`,
        action: "forget",
      };
    }

    if (record.lifecycleState === "ARCHIVED") {
      const age = Date.now() - new Date(record.updatedAt).getTime();
      if (age > config.forgetAfterArchiveAgeMs) {
        return {
          record,
          reason: `Archived for ${Math.round(age / 86400000)} days without access`,
          action: "forget",
        };
      }
      return null;
    }

    if (record.lifecycleState === "WORKING" || record.lifecycleState === "CONSOLIDATED" || record.lifecycleState === "LONG_TERM") {
      const maxAge = this.policy.getMaxAgeForState(record.lifecycleState, executive);
      const age = Date.now() - new Date(record.updatedAt).getTime();

      if (age > maxAge) {
        const daysSinceUpdate = Math.round(age / 86400000);
        const daysSinceAccess = Math.round((Date.now() - new Date(record.lastAccessedAt).getTime()) / 86400000);

        if (
          daysSinceAccess > 90 &&
          record.accessCount < config.minAccessCountBeforeArchive &&
          record.importance.total < 40
        ) {
          return {
            record,
            reason: `No access for ${daysSinceAccess} days, only ${record.accessCount} accesses, importance ${record.importance.total}`,
            action: "forget",
          };
        }

        return {
          record,
          reason: `Exceeded max age for ${record.lifecycleState} (${daysSinceUpdate} days, max ${Math.round(maxAge / 86400000)} days)`,
          action: "archive",
        };
      }
    }

    return null;
  }

  private applyTransition(record: MemoryRecord, to: "ARCHIVED" | "FORGOTTEN", reason: string): MemoryRecord {
    const event: MemoryTraceEvent = {
      event: to === "ARCHIVED" ? "archived" : "forgotten",
      timestamp: new Date().toISOString(),
      previousState: record.lifecycleState,
      newState: to,
      detail: reason,
    };

    return {
      ...record,
      lifecycleState: to,
      updatedAt: new Date().toISOString(),
      trace: [...record.trace, event],
    };
  }
}
