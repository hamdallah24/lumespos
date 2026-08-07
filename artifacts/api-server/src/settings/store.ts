// ConfigCenter — SettingsStore.
// Milestone 1: in-memory store implementing SettingsSource. Commit appends an
// immutable revision; the store is the single source of truth. No APPLY phase.
// Later milestones swap the SQL backing (settings/settings_revision tables).

import type { ConfigScope, ConfigValue } from "./types";
import type { ScopedOverrideSet, SettingsSource } from "./resolver";

export interface CommitResult {
  revision: number;
  correlationId: string;
}

export interface RevisionRecord {
  sequence: number;
  scope: ConfigScope;
  changes: Record<string, ConfigValue>;
  correlationId: string;
  actor: string;
  timestamp: Date;
}

export class SettingsStore implements SettingsSource {
  private overrides = new Map<string, ScopedOverrideSet>();
  private revisions: RevisionRecord[] = [];
  private revisionCounter = 0;

  constructor(seed?: ScopedOverrideSet[]) {
    if (seed) for (const s of seed) this.overrides.set(this.key(s.scope), s);
  }

  private key(scope: ConfigScope): string {
    return JSON.stringify({
      type: scope.type,
      workspaceId: scope.workspaceId ?? null,
      branchId: scope.branchId ?? null,
      executiveRole: scope.executiveRole ?? null,
    });
  }

  async loadOverrides(): Promise<ScopedOverrideSet[]> {
    return [...this.overrides.values()].map((s) => ({
      scope: { ...s.scope },
      values: { ...s.values },
    }));
  }

  async currentRevision(): Promise<number> {
    return this.revisionCounter;
  }

  get log(): readonly RevisionRecord[] {
    return this.revisions;
  }

  get overrideCount(): number {
    return this.overrides.size;
  }

  // Commit a scope-scoped change-set → returns immutable revision number + correlation id.
  commit(
    scope: ConfigScope,
    changes: Record<string, ConfigValue>,
    actor: string,
    correlationId: string,
  ): CommitResult {
    const existing = this.overrides.get(this.key(scope)) ?? { scope: { ...scope }, values: {} };
    for (const [k, v] of Object.entries(changes)) existing.values[k] = v;
    this.overrides.set(this.key(scope), existing);

    this.revisionCounter += 1;
    this.revisions.push({
      sequence: this.revisionCounter,
      scope: { ...scope },
      changes: { ...changes },
      correlationId,
      actor,
      timestamp: new Date(),
    });
    return { revision: this.revisionCounter, correlationId };
  }

  get revisionCount(): number {
    return this.revisionCounter;
  }
}