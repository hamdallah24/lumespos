import type { ComponentId, SemVer } from "./ComponentId";

export interface Capability {
  id: ComponentId;
  name: string;
  provider: ComponentId;
  priority: number;
  cost: number;
  latency: number;
}

export interface CapabilityConstraint {
  minVersion?: SemVer;
  maxVersion?: SemVer;
  maxCost?: number;
  maxLatency?: number;
  preferredProvider?: string;
}
