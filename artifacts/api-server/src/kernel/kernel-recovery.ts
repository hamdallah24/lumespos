// ECP-035: Kernel Recovery — crash recovery and mission resume
// Frozen. Detects crashed runtimes, restores from checkpoint, resumes missions.

import { kernelRegistry } from "./kernel-registry";
import { kernelHeartbeat } from "./kernel-heartbeat";
import { kernelCheckpoint } from "./kernel-checkpoint";
import { kernelEventBus } from "./kernel-event-bus";

class KernelRecovery {
  /** Attempt to recover a crashed runtime */
  async recover(name: string): Promise<boolean> {
    const comp = kernelRegistry.get(name);
    if (!comp) return false;

    console.log(`[Kernel] Recovery attempt for ${name}...`);
    comp.status = "recovering";

    // Attempt restore from checkpoint
    const checkpoint = kernelCheckpoint.latest;
    if (checkpoint && checkpoint.components[name]) {
      try {
        await comp.restore?.(checkpoint.components[name].data);
        comp.status = "active";
        kernelHeartbeat.beat(name);
        kernelEventBus.emit({ type: "runtime_recovered", source: "kernel", payload: { component: name } });
        console.log(`[Kernel] ${name} recovered successfully`);
        return true;
      } catch {
        // Restore failed — try reboot
      }
    }

    // Fallback: reboot
    try {
      await comp.boot?.();
      comp.status = "active";
      kernelHeartbeat.beat(name);
      kernelEventBus.emit({ type: "runtime_rebooted", source: "kernel", payload: { component: name } });
      return true;
    } catch {
      comp.status = "crashed";
      console.error(`[Kernel] ${name} recovery failed`);
      return false;
    }
  }

  /** Auto-recover dead runtimes detected by heartbeat */
  async autoRecover(): Promise<number> {
    const dead = kernelHeartbeat.getAllStatus().filter(b => b.status === "dead");
    let recovered = 0;

    for (const beat of dead) {
      const success = await this.recover(beat.component);
      if (success) recovered++;
    }

    return recovered;
  }
}

export const kernelRecovery = new KernelRecovery();
