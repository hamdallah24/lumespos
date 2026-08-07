// ConfigCenter — Milestone 6 Phase 1: PluginRegistry.
// Stores plugin implementations keyed by manifest id. Registration is deferred
// to the manager (which performs manifest / compatibility / dependency
// validation); this class only answers "what is registered".

import type { PluginImplementation, PluginManifest, PluginRegistration } from "./types";

export class PluginRegistry {
  private readonly entries = new Map<string, { manifest: PluginManifest; impl: PluginImplementation; registration: PluginRegistration }>();
  private readonly subscriptions = new Map<string, string>();

  put(manifest: PluginManifest, impl: PluginImplementation): PluginRegistration {
    this.entries.set(manifest.id, {
      manifest,
      impl,
      registration: {
        manifest,
        status: "registered",
        startCount: 0,
        stopCount: 0,
      },
    });
    return this.entries.get(manifest.id)!.registration;
  }

  get(id: string): PluginImplementation | undefined {
    return this.entries.get(id)?.impl;
  }

  registration(id: string): PluginRegistration | undefined {
    return this.entries.get(id)?.registration;
  }

  manifest(id: string): PluginManifest | undefined {
    return this.entries.get(id)?.manifest;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  list(): PluginRegistration[] {
    return [...this.entries.values()].map((e) => e.registration);
  }

  setStatus(id: string, status: PluginRegistration["status"], patch?: Partial<PluginRegistration>): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.registration = { ...entry.registration, status, ...patch };
  }

  /** Deterministic start order: dependencies before dependents (topological). */
  startOrder(): string[] {
    const manifests = [...this.entries.values()].map((e) => e.manifest);
    const ids = manifests.map((m) => m.id);
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): void => {
      if (visited.has(id) || visiting.has(id)) return;
      visiting.add(id);
      const manifest = manifests.find((m) => m.id === id);
      const deps = (manifest?.dependencies ?? []).filter((d) => !d.optional);
      for (const dep of deps) {
        if (ids.includes(dep.id)) visit(dep.id);
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };
    for (const id of ids) visit(id);
    return order;
  }

  setSubscription(id: string, subscriptionId: string): void {
    this.subscriptions.set(id, subscriptionId);
  }

  subscription(id: string): string | undefined {
    return this.subscriptions.get(id);
  }
}