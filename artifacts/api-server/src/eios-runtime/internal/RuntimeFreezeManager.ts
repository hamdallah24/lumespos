import { RegistryLifecycle } from "./runtime-metadata/RegistryLifecycle";

export const RuntimeFreezeManager = {
  freezeAll(): void {
    RegistryLifecycle.transition("FROZEN");
  },

  unfreezeAll(): void {
    RegistryLifecycle.reset();
    RegistryLifecycle.transition("REGISTERING");
  },

  isFrozen(): boolean {
    return RegistryLifecycle.isFrozen();
  },
};
