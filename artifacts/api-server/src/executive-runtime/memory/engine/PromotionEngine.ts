import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";
import type { MemoryLifecycleState } from "../models/MemoryLifecycle";
import { PromotionPolicy } from "../policy/PromotionPolicy";

export interface PromotionResult {
  promoted: MemoryRecord[];
  unchanged: MemoryRecord[];
}

export class PromotionEngine {
  constructor(private policy: PromotionPolicy = new PromotionPolicy()) {}

  evaluate(records: MemoryRecord[]): PromotionResult {
    const promoted: MemoryRecord[] = [];
    const unchanged: MemoryRecord[] = [];

    for (const record of records) {
      const result = this.evaluateOne(record);
      if (result) {
        promoted.push(result);
      } else {
        unchanged.push(record);
      }
    }

    return { promoted, unchanged };
  }

  private evaluateOne(record: MemoryRecord): MemoryRecord | null {
    const config = this.policy.getConfig();

    if (record.lifecycleState === "VALIDATED") {
      if (this.policy.shouldPromoteToWorking(record.importance.total)) {
        return this.promote(record, "WORKING", "Importance meets working threshold");
      }
      return null;
    }

    if (record.lifecycleState === "CONSOLIDATED") {
      const daysSinceUpdate = (Date.now() - new Date(record.updatedAt).getTime()) / 86400000;
      if (daysSinceUpdate < config.minDaysInCurrentStateBeforePromotion) return null;

      if (this.policy.shouldPromoteToLongTerm(record.importance.total, record.recurrenceCount, record.confidence)) {
        return this.promote(record, "LONG_TERM", `Importance ${record.importance.total}, recurrence ${record.recurrenceCount}, confidence ${record.confidence}`);
      }
      return null;
    }

    return null;
  }

  private promote(record: MemoryRecord, to: MemoryLifecycleState, detail: string): MemoryRecord {
    const event: MemoryTraceEvent = {
      event: to === "LONG_TERM" ? "promoted" : "modified",
      timestamp: new Date().toISOString(),
      previousState: record.lifecycleState,
      newState: to,
      detail,
    };

    return {
      ...record,
      lifecycleState: to,
      updatedAt: new Date().toISOString(),
      trace: [...record.trace, event],
    };
  }
}
