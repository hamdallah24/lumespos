import type { MemoryLifecycleState } from "../models/MemoryLifecycle";
import { ALLOWED_TRANSITIONS } from "../models/MemoryLifecycle";

export class LifecyclePolicy {
  canTransition(from: MemoryLifecycleState, to: MemoryLifecycleState): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed.includes(to);
  }

  validateTransition(from: MemoryLifecycleState, to: MemoryLifecycleState): { valid: boolean; reason?: string } {
    if (from === to) {
      return { valid: false, reason: "Same state transition is not allowed" };
    }
    if (!this.canTransition(from, to)) {
      return {
        valid: false,
        reason: `Transition from ${from} to ${to} is not allowed. Allowed: [${ALLOWED_TRANSITIONS[from].join(", ")}]`,
      };
    }
    return { valid: true };
  }

  isTerminal(state: MemoryLifecycleState): boolean {
    return state === "FORGOTTEN";
  }

  isActive(state: MemoryLifecycleState): boolean {
    return !this.isTerminal(state) && state !== "ARCHIVED";
  }
}
