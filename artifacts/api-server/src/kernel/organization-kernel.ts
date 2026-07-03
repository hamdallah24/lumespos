// ECP-035: Organization Kernel — central nervous system
// Frozen. Coordinates all Runtimes. No direct runtime-to-runtime calls.
// All communication flows through the Kernel.

import { kernelRegistry } from "./kernel-registry";
import { kernelEventBus } from "./kernel-event-bus";
import { kernelLifecycle } from "./kernel-lifecycle";
import { kernelHeartbeat } from "./kernel-heartbeat";
import { kernelCheckpoint } from "./kernel-checkpoint";
import { kernelRecovery } from "./kernel-recovery";
import { kernelScheduler } from "./kernel-scheduler";
import type { KernelComponent } from "./kernel-types";

class OrganizationKernel {
  private _started = false;

  /** Register a component with the kernel */
  register(component: KernelComponent): void {
    kernelRegistry.register(component);
  }

  /** Start the organization */
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;

    console.log(`[Kernel] Starting organization with ${kernelRegistry.size} components...`);

    // Phase 1: Boot
    await kernelLifecycle.boot();

    // Phase 2: Health check
    const health = kernelRegistry.health();
    const unhealthy = Object.entries(health).filter(([, h]) => h.status !== "healthy" && h.status !== "ready" && h.status !== "active");
    if (unhealthy.length > 0) {
      console.warn(`[Kernel] ${unhealthy.length} unhealthy components: ${unhealthy.map(([n]) => n).join(", ")}`);
    }

    // Phase 3: Activate
    await kernelLifecycle.activate();

    // Phase 4: Heartbeat
    kernelHeartbeat.start();

    // Phase 5: Checkpoint
    kernelCheckpoint.take();

    console.log(`[Kernel] Organization ACTIVE. ${kernelRegistry.size} components. State: ${kernelLifecycle.state}`);
  }

  /** Graceful shutdown */
  async shutdown(): Promise<void> {
    kernelHeartbeat.stop();
    kernelScheduler.stop();
    kernelCheckpoint.take();
    await kernelLifecycle.shutdown();
    this._started = false;
  }

  /** Emit an event through the kernel event bus */
  emit(type: string, source: string, payload: unknown): void {
    kernelEventBus.emit({ type, source, payload });
  }

  /** Subscribe to a kernel event */
  on(type: string, handler: (event: import("./kernel-types").KernelEvent) => void): void {
    kernelEventBus.on(type, handler);
  }

  /** Send a heartbeat for a runtime */
  heartbeat(component: string): void {
    kernelHeartbeat.beat(component);
  }

  /** Run auto-recovery */
  async autoRecover(): Promise<number> {
    return kernelRecovery.autoRecover();
  }

  get health() { return kernelRegistry.health(); }
  get state() { return kernelLifecycle.state; }
  get lifecycle() { return kernelLifecycle.lifecycle; }
  get components() { return kernelRegistry.getAll(); }

  isReady(): boolean {
    return this._started && kernelLifecycle.lifecycle === "ACTIVE";
  }
}

export const organizationKernel = new OrganizationKernel();
