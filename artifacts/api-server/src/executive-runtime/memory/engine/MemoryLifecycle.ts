import type { MemoryLifecycleState } from "../models/MemoryLifecycle";
import { LifecyclePolicy } from "../policy/LifecyclePolicy";
import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";

export class MemoryLifecycleEngine {
  private policy = new LifecyclePolicy();

  transition(record: MemoryRecord, to: MemoryLifecycleState, detail?: string): MemoryRecord {
    const validation = this.policy.validateTransition(record.lifecycleState, to);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const event: MemoryTraceEvent = {
      event: this.getEventType(to),
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

  validate(record: MemoryRecord): MemoryRecord {
    if (record.lifecycleState !== "NEW") {
      throw new Error(`Cannot validate memory in state ${record.lifecycleState}`);
    }

    const event: MemoryTraceEvent = {
      event: "validated",
      timestamp: new Date().toISOString(),
      previousState: "NEW",
      newState: "VALIDATED",
    };

    return {
      ...record,
      lifecycleState: "VALIDATED",
      updatedAt: new Date().toISOString(),
      trace: [...record.trace, event],
    };
  }

  forget(record: MemoryRecord, reason?: string): MemoryRecord {
    return this.transition(record, "FORGOTTEN", reason ?? "Scheduled forgetting");
  }

  isPromotable(record: MemoryRecord): boolean {
    return this.policy.isActive(record.lifecycleState);
  }

  private getEventType(to: MemoryLifecycleState): MemoryTraceEvent["event"] {
    switch (to) {
      case "VALIDATED": return "validated";
      case "WORKING": return "modified";
      case "CONSOLIDATED": return "merged";
      case "LONG_TERM": return "promoted";
      case "ARCHIVED": return "archived";
      case "FORGOTTEN": return "forgotten";
      default: return "modified";
    }
  }
}
