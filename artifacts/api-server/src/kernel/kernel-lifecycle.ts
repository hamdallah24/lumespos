// ECP-035: Kernel Lifecycle — organization lifecycle manager
// Frozen. BOOT → READY → ACTIVE → MAINTENANCE → RECOVERY → SHUTDOWN

import type { OrgLifecycle, OrgState } from "./kernel-types";
import { kernelRegistry } from "./kernel-registry";
import { kernelEventBus } from "./kernel-event-bus";

class KernelLifecycle {
  private _lifecycle: OrgLifecycle = "BOOT";
  private _state: OrgState = "HEALTHY";

  get lifecycle(): OrgLifecycle { return this._lifecycle; }
  get state(): OrgState { return this._state; }

  async boot(): Promise<void> {
    this._lifecycle = "BOOT";
    kernelEventBus.emit({ type: "org_booting", source: "kernel", payload: {} });

    const components = kernelRegistry.getAll();
    for (const comp of components) {
      if (comp.boot) {
        comp.status = "booting";
        try { await comp.boot(); comp.status = "ready"; }
        catch { comp.status = "crashed"; }
      } else {
        comp.status = "ready";
      }
    }

    this._lifecycle = "READY";
    this._state = "HEALTHY";
    kernelEventBus.emit({ type: "org_ready", source: "kernel", payload: { componentCount: components.length } });
  }

  async activate(): Promise<void> {
    this._lifecycle = "ACTIVE";
    for (const comp of kernelRegistry.getAll()) {
      comp.status = "active";
    }
    kernelEventBus.emit({ type: "org_active", source: "kernel", payload: {} });
  }

  maintenance(): void {
    this._lifecycle = "MAINTENANCE";
    this._state = "MAINTENANCE";
    kernelEventBus.emit({ type: "org_maintenance", source: "kernel", payload: {} });
  }

  recovery(): void {
    this._lifecycle = "RECOVERY";
    this._state = "RECOVERY";
    kernelEventBus.emit({ type: "org_recovery", source: "kernel", payload: {} });
  }

  async shutdown(): Promise<void> {
    this._lifecycle = "SHUTDOWN";
    kernelEventBus.emit({ type: "org_shutdown", source: "kernel", payload: {} });

    for (const comp of kernelRegistry.getAll()) {
      if (comp.shutdown) {
        try { await comp.shutdown(); comp.status = "stopped"; }
        catch { /* forced stop */ }
      }
    }
  }

  emergency(): void {
    this._state = "EMERGENCY";
    kernelEventBus.emit({ type: "org_emergency", source: "kernel", payload: {} });
  }

  restore(): void {
    this._state = "HEALTHY";
    this._lifecycle = "ACTIVE";
    kernelEventBus.emit({ type: "org_restored", source: "kernel", payload: {} });
  }
}

export const kernelLifecycle = new KernelLifecycle();
