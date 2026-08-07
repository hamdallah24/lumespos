// ConfigCenter — Milestone 5 Phase 3: Change Freeze Registry.
// Operational governance — freeze writes by global / workspace / branch /
// executive scope, optionally scoped to specific keys. Freezes are
// time-aware (from/until) and derived (matched at evaluation time, not stored
// as mutable state). Consumer-only: it never writes to the config store.

import type { ConfigScope, ExecutiveRole } from "../types";
import type { WriteActor } from "../security";

export type FreezeScopeMatch =
  | { type: "global" }
  | { type: "workspace"; workspaceId: number }
  | { type: "branch"; branchId: number }
  | { type: "executive"; executiveRole: ExecutiveRole };

export interface FreezeDefinition {
  id: string;
  label: string;
  reason: string;
  scope: FreezeScopeMatch;
  /** Optional key subset — when set, the freeze applies only to these keys. */
  keys?: string[];
  from: number;
  until?: number;
  createdBy: WriteActor;
  createdAt: number;
  revokedAt?: number;
}

export class ChangeFreezeRegistry {
  private freezes = new Map<string, FreezeDefinition>();
  private counter = 0;

  private nextId(now: number): string {
    this.counter += 1;
    return `freeze-${this.counter.toString(36)}-${now.toString(36)}`;
  }

  create(input: {
    label: string;
    reason: string;
    scope: FreezeScopeMatch;
    keys?: string[];
    from?: number;
    until?: number;
    actor: WriteActor;
    now?: number;
  }): FreezeDefinition {
    const now = input.now ?? Date.now();
    const freeze: FreezeDefinition = {
      id: this.nextId(now),
      label: input.label,
      reason: input.reason,
      scope: input.scope,
      keys: input.keys?.length ? [...input.keys] : undefined,
      from: input.from ?? now,
      until: input.until,
      createdBy: { ...input.actor },
      createdAt: now,
    };
    this.freezes.set(freeze.id, freeze);
    return freeze;
  }

  revoke(id: string, actor: WriteActor, now?: number): FreezeDefinition | undefined {
    const freeze = this.freezes.get(id);
    if (!freeze) return undefined;
    freeze.revokedAt = now ?? Date.now();
    this.freezes.set(id, freeze);
    return { ...freeze };
  }

  get(id: string): FreezeDefinition | undefined {
    const freeze = this.freezes.get(id);
    return freeze ? { ...freeze } : undefined;
  }

  list(): FreezeDefinition[] {
    return [...this.freezes.values()].map((f) => ({ ...f }));
  }

  /** Freezes effective at `now` (from <= now < until, not revoked). */
  effectiveAt(now: number): FreezeDefinition[] {
    return this.list().filter((f) => {
      if (f.revokedAt != null && f.revokedAt <= now) return false;
      if (f.from > now) return false;
      if (f.until != null && f.until <= now) return false;
      return true;
    });
  }

  /** Freezes (effective at `now`) that cover the given change scope + keys. */
  matching(scope: ConfigScope, keys: string[], now: number): FreezeDefinition[] {
    return this.effectiveAt(now).filter((f) => this.covers(f.scope, scope) && this.coversKeys(f, keys));
  }

  /** True when any effective freeze covers the change. */
  isFrozen(scope: ConfigScope, keys: string[], now: number): { frozen: boolean; freezes: FreezeDefinition[] } {
    const freezes = this.matching(scope, keys, now);
    return { frozen: freezes.length > 0, freezes };
  }

  private covers(freezeScope: FreezeScopeMatch, scope: ConfigScope): boolean {
    switch (freezeScope.type) {
      case "global":
        return true;
      case "workspace":
        return scope.workspaceId != null && scope.workspaceId === freezeScope.workspaceId;
      case "branch":
        return scope.branchId != null && scope.branchId === freezeScope.branchId;
      case "executive":
        return scope.executiveRole != null && scope.executiveRole === freezeScope.executiveRole;
      default:
        return false;
    }
  }

  private coversKeys(freeze: FreezeDefinition, keys: string[]): boolean {
    if (!freeze.keys || freeze.keys.length === 0) return true;
    return keys.some((k) => freeze.keys!.includes(k));
  }
}