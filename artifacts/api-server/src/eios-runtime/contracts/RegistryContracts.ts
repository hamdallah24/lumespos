import type { ComponentId } from "./ComponentId";

export type RegistryState =
  | "BOOT" | "REGISTERING" | "VALIDATING"
  | "FROZEN" | "RUNNING" | "SHUTDOWN";

export type ComponentStatus =
  | "ACTIVE" | "DEPRECATED" | "DISABLED";

export interface Registry<T> {
  register(component: T): void;
  get(id: ComponentId): T | undefined;
  getAll(): T[];
  setStatus(id: ComponentId, status: ComponentStatus): void;
  getStatus(id: ComponentId): ComponentStatus;
}

export class RegistryFrozenError extends Error {
  constructor() {
    super("Registry is FROZEN — mutations not allowed");
    this.name = "RegistryFrozenError";
  }
}
