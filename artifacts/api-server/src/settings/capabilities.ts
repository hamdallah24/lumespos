// ConfigCenter — Capability Discovery.
// Lets Package System / Marketplace / subsystems discover available capabilities
// without hardcoding. Each capability is declared by the owning milestone and
// queried at runtime. Packages can gate their install on required capabilities.

export type ConfigCapabilityId =
  | "simulation"
  | "snapshot"
  | "marketplace"
  | "multiTenant"
  | "packages"
  | "distributedEventBus"
  | "replay"
  | "dlq";

export interface CapabilityDescriptor {
  id: ConfigCapabilityId;
  title: string;
  available: boolean;
  milestone?: string;
}

const DEFAULT_CAPABILITIES: CapabilityDescriptor[] = [
  { id: "simulation", title: "Simulation estimates", available: true, milestone: "M1" },
  { id: "snapshot", title: "Snapshot & rollback", available: false, milestone: "later" },
  { id: "marketplace", title: "Marketplace foundation", available: false, milestone: "later" },
  { id: "multiTenant", title: "Multi-tenant org scoping", available: false, milestone: "later" },
  { id: "packages", title: "Configuration packages", available: false, milestone: "later" },
  { id: "distributedEventBus", title: "Distributed event bus", available: false, milestone: "later" },
  { id: "replay", title: "Event replay", available: false, milestone: "later" },
  { id: "dlq", title: "Dead letter queue", available: false, milestone: "later" },
];

export class CapabilityDiscovery {
  private map = new Map<ConfigCapabilityId, CapabilityDescriptor>();

  constructor(initial?: CapabilityDescriptor[]) {
    for (const cap of initial ?? DEFAULT_CAPABILITIES) this.map.set(cap.id, cap);
  }

  // Allow owning code to flip a capability on/off (e.g. when a feature installs).
  declare(id: ConfigCapabilityId, available: boolean, milestone?: string): void {
    const existing = this.map.get(id);
    this.map.set(id, {
      id,
      title: existing?.title ?? id,
      available,
      milestone: milestone ?? existing?.milestone,
    });
  }

  isAvailable(id: ConfigCapabilityId): boolean {
    return this.map.get(id)?.available ?? false;
  }

  get(id: ConfigCapabilityId): CapabilityDescriptor | undefined {
    return this.map.get(id);
  }

  list(): CapabilityDescriptor[] {
    return [...this.map.values()];
  }

  // Filter a package's required capabilities against availability.
  hasAll(required: ConfigCapabilityId[]): { ok: boolean; missing: ConfigCapabilityId[] } {
    const missing = required.filter((id) => !this.isAvailable(id));
    return { ok: missing.length === 0, missing };
  }
}