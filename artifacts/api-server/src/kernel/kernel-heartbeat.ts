// ECP-035: Kernel Heartbeat — monitors runtime liveness
// Frozen. If a Runtime misses heartbeats, Kernel recovers it.

import type { HeartbeatRecord } from "./kernel-types";
import { kernelRegistry } from "./kernel-registry";
import { kernelEventBus } from "./kernel-event-bus";

const HEARTBEAT_INTERVAL = 10000;   // 10 seconds
const MAX_MISSES = 3;               // 3 missed = dead

class KernelHeartbeat {
  private _beats = new Map<string, HeartbeatRecord>();
  private _interval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    for (const comp of kernelRegistry.getAll()) {
      this._beats.set(comp.name, {
        component: comp.name, lastBeat: Date.now(),
        intervalMs: HEARTBEAT_INTERVAL, missCount: 0, status: "alive",
      });
    }

    this._interval = setInterval(() => this.check(), HEARTBEAT_INTERVAL);
  }

  stop(): void {
    if (this._interval) clearInterval(this._interval);
  }

  /** Runtime sends a heartbeat */
  beat(component: string): void {
    const record = this._beats.get(component);
    if (record) {
      record.lastBeat = Date.now();
      record.missCount = 0;
      record.status = "alive";
    }
  }

  /** Check all heartbeats */
  private check(): void {
    const now = Date.now();
    for (const [name, record] of this._beats) {
      const elapsed = now - record.lastBeat;
      if (elapsed > HEARTBEAT_INTERVAL * MAX_MISSES) {
        if (record.status !== "dead") {
          record.status = "dead";
          kernelEventBus.emit({ type: "runtime_dead", source: "kernel", payload: { component: name } });
        }
      } else if (elapsed > HEARTBEAT_INTERVAL) {
        record.missCount++;
        record.status = "late";
      }
    }
  }

  getStatus(component: string): HeartbeatRecord | undefined {
    return this._beats.get(component);
  }

  getAllStatus(): HeartbeatRecord[] {
    return [...this._beats.values()];
  }
}

export const kernelHeartbeat = new KernelHeartbeat();
