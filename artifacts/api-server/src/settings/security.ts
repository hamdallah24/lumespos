// ConfigCenter — Security Foundation.
// Milestone 1 baseline: secret scrubbing, scope validation, RBAC validation,
// BOLA protection, mass-assignment whitelist, revision idempotency.
// Hash-chain audit + distributed authentication deferred to multi-node.

import type { ConfigScope, ConfigValue } from "./types";
import { ConfigurationRegistry } from "./registry";

export type ConfigRole = "owner" | "manager" | "admin" | "developer" | "viewer";

export interface WriteActor {
  actorId: string | null;
  role: ConfigRole;
  branchId?: number | null;
  workspaceId?: number | null;
}

export interface ConfigDecision {
  ok: boolean;
  reason?: string;
}

const ROLE_SCOPE_GRANTS: Record<ConfigRole, ConfigScope["type"][]> = {
  "owner": ["workspace", "branch", "executive", "default"],
  "manager": ["workspace", "branch"],
  "admin": ["workspace", "branch"],
  "developer": ["executive"],
  "viewer": [],
};

export class ConfigSecurity {
  constructor(private readonly registry: ConfigurationRegistry) {}

  // ── Secret scrubbing ──
  scrubValue(value: ConfigValue, isSecret: boolean): ConfigValue {
    if (isSecret && value !== null && value !== undefined && value !== "") return "••••••••";
    return value;
  }

  scrubConfig(config: Record<string, ConfigValue>): Record<string, ConfigValue> {
    const out: Record<string, ConfigValue> = {};
    for (const [key, value] of Object.entries(config)) {
      out[key] = this.scrubValue(value, this.registry.isSecret(key));
    }
    return out;
  }

  // ── Scope validation ──
  validateScope(scope: ConfigScope): string[] {
    const errors: string[] = [];
    if (scope.type === "workspace" && scope.workspaceId == null) errors.push("workspace scope requires workspaceId");
    if (scope.type === "branch" && scope.branchId == null) errors.push("branch scope requires branchId");
    if (scope.type === "executive" && scope.executiveRole == null) errors.push("executive scope requires executiveRole");
    if (
      scope.type === "executive"
      && scope.executiveRole != null
      && !["CEO", "COO", "CFO", "CMO", "CHRO", "CAIO", "CKO", "CTO"].includes(scope.executiveRole)
    ) {
      errors.push(`invalid executiveRole: ${scope.executiveRole}`);
    }
    return errors;
  }

  // ── RBAC — role may write at this scope? ──
  canWrite(role: ConfigRole, scope: ConfigScope): ConfigDecision {
    const grants = ROLE_SCOPE_GRANTS[role] ?? [];
    if (grants.includes(scope.type)) return { ok: true };
    return { ok: false, reason: `role "${role}" cannot write scope "${scope.type}"` };
  }

  // ── BOLA — actor owns the requested branch/workspace? ──
  canAccessObject(actor: WriteActor, requestedScope: ConfigScope): ConfigDecision {
    if (actor.role === "owner" || actor.role === "admin") return { ok: true };

    const scopedId = requestedScope.branchId ?? requestedScope.workspaceId;
    const actorId = actor.branchId ?? actor.workspaceId;
    if (scopedId != null && actorId != null && scopedId !== actorId) {
      return { ok: false, reason: "BOLA: not authorized for the requested branch/workspace" };
    }
    if (scopedId != null && actorId == null) {
      return { ok: false, reason: "BOLA: actor not bound to this branch/workspace" };
    }
    return { ok: true };
  }

  // ── Mass-assignment whitelist ──
  whitelist(category: string, incoming: Record<string, ConfigValue>): { ok: boolean; fields?: string[]; reason?: string } {
    const metaList = this.registry.list().filter((m) => m.category === category);
    const allowedKeys = new Set(metaList.map((m) => m.key));
    const unknown = Object.keys(incoming).filter((k) => !allowedKeys.has(k));
    if (unknown.length > 0) {
      return { ok: false, reason: `mass-assignment: unknown fields ${unknown.join(", ")}` };
    }
    return { ok: true, fields: [...allowedKeys] };
  }
}

// Revision idempotency policy (anti-replay): shared monotonic freshness check.
export function isRevisionFresh(lastSeen: number, eventRevision: number): boolean {
  return eventRevision > lastSeen;
}