import type { RegistryState } from "../../contracts/RegistryContracts";
import { RegistryFrozenError } from "../../contracts/RegistryContracts";

let _state: RegistryState = "BOOT";

export const RegistryLifecycle = {
  get state(): RegistryState { return _state; },

  transition(to: RegistryState): void {
    const valid: Record<string, string[]> = {
      BOOT: ["REGISTERING"],
      REGISTERING: ["VALIDATING"],
      VALIDATING: ["FROZEN"],
      FROZEN: ["RUNNING"],
      RUNNING: ["SHUTDOWN"],
      SHUTDOWN: [],
    };
    if (!valid[_state]?.includes(to)) {
      throw new Error(`Invalid registry transition: ${_state} -> ${to}`);
    }
    _state = to;
  },

  assertMutable(): void {
    if (_state === "FROZEN" || _state === "RUNNING") {
      throw new RegistryFrozenError();
    }
  },

  isFrozen(): boolean {
    return _state === "FROZEN" || _state === "RUNNING";
  },

  reset(): void {
    _state = "BOOT";
  },
};
