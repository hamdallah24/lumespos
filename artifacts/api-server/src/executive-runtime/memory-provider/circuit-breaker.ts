// T.0.2 Phase 6 — Circuit breaker for memory stores
// LOCKED: T01_MEMORY_ERROR_HANDLING.md

import { memoryConfig } from "./config";
import { memoryMetrics } from "./metrics";

type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerEntry {
  state: BreakerState;
  errors: number[];
  openedAt: number;
}

export class CircuitBreaker {
  private stores = new Map<string, BreakerEntry>();

  isOpen(store: string): boolean {
    const entry = this.stores.get(store);
    if (!entry) return false;

    if (entry.state === "OPEN") {
      if (Date.now() - entry.openedAt >= memoryConfig.circuitBreakerRetryMs) {
        entry.state = "HALF_OPEN";
        return false;
      }
      return true;
    }

    this.pruneErrors(entry);
    if (entry.errors.length >= memoryConfig.circuitBreakerThreshold) {
      entry.state = "OPEN";
      entry.openedAt = Date.now();
      return true;
    }

    return false;
  }

  reportSuccess(store: string): void {
    const entry = this.stores.get(store);
    if (!entry) return;

    if (entry.state === "HALF_OPEN") {
      entry.state = "CLOSED";
      entry.errors = [];
      entry.openedAt = 0;
      memoryMetrics.recordCircuitClose();
    }
  }

  reportError(store: string): void {
    let entry = this.stores.get(store);
    if (!entry) {
      entry = { state: "CLOSED", errors: [], openedAt: 0 };
      this.stores.set(store, entry);
    }

    entry.errors.push(Date.now());
    this.pruneErrors(entry);

    if (entry.errors.length >= memoryConfig.circuitBreakerThreshold) {
      entry.state = "OPEN";
      entry.openedAt = Date.now();
      memoryMetrics.recordCircuitOpen();
    }
  }

  private pruneErrors(entry: BreakerEntry): void {
    const cutoff = Date.now() - memoryConfig.circuitBreakerWindowMs;
    entry.errors = entry.errors.filter(t => t > cutoff);
  }

  reset(store: string): void {
    this.stores.delete(store);
  }

  getState(store: string): BreakerState {
    return this.stores.get(store)?.state ?? "CLOSED";
  }
}

export const circuitBreaker = new CircuitBreaker();
