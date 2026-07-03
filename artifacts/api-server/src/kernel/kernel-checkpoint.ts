// ECP-035: Kernel Checkpoint — state snapshots for recovery
// Frozen. Kernel takes periodic snapshots. Used for crash recovery.

import type { KernelCheckpoint } from "./kernel-types";
import { kernelRegistry } from "./kernel-registry";
import { kernelLifecycle } from "./kernel-lifecycle";

let _checkpoints: KernelCheckpoint[] = [];
const MAX_CHECKPOINTS = 10;

class KernelCheckpointManager {
  /** Take a snapshot of current organization state */
  take(): KernelCheckpoint {
    const components: KernelCheckpoint["components"] = {};
    for (const comp of kernelRegistry.getAll()) {
      const data = comp.checkpoint ? comp.checkpoint() : {};
      components[comp.name] = { status: comp.status, data };
    }

    const checkpoint: KernelCheckpoint = {
      id: `ckpt-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      state: kernelLifecycle.state,
      components,
      activeMissions: [],
      pendingDecisions: [],
    };

    _checkpoints.push(checkpoint);
    if (_checkpoints.length > MAX_CHECKPOINTS) _checkpoints.shift();
    return checkpoint;
  }

  /** Restore from the most recent checkpoint */
  async restore(): Promise<boolean> {
    const last = _checkpoints[_checkpoints.length - 1];
    if (!last) return false;

    kernelLifecycle.recovery();

    for (const [name, snapshot] of Object.entries(last.components)) {
      const comp = kernelRegistry.get(name);
      if (comp && comp.restore && snapshot.status === "active") {
        try {
          await comp.restore(snapshot.data);
          comp.status = "active";
        } catch {
          comp.status = "crashed";
        }
      }
    }

    kernelLifecycle.restore();
    return true;
  }

  get latest(): KernelCheckpoint | undefined {
    return _checkpoints[_checkpoints.length - 1];
  }

  get all(): KernelCheckpoint[] {
    return [..._checkpoints];
  }
}

export const kernelCheckpoint = new KernelCheckpointManager();
