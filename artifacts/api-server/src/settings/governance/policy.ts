// ConfigCenter — Milestone 5: Governance Policy Engine (multi-level policy).
// Consumer-only. Decides whether a proposed change needs approval or can
// commit DIRECT. Never mutates store/registry — only classifies a change using
// the locked Registry metadata (criticality, secret) + scope type.

import type { ConfigScope, ConfigValue, Criticality } from "../types";
import type { ConfigurationRegistry } from "../registry";
import type { WriteActor } from "../security";
import type { ChangeFreezeRegistry } from "./freeze";
import type { MaintenanceWindowRegistry } from "./window";

export type ApprovalDecisionType = "direct" | "requires_approval";

export interface ApprovalDecision {
  type: ApprovalDecisionType;
  requiredApprovals: number;
  matchedPolicies: string[];
  reason: string;
}

export interface PolicyTierView {
  tier: string;
  approvals: number;
  description: string;
}

export interface OperationalGate {
  ok: boolean;
  blocked: boolean;
  reasons: string[];
  windowBy: string[];
  windowRequired: boolean;
  withinWindow: boolean;
  activeWindow: { id: string; name: string } | null;
}

// Declarative multi-level matrix, keyed by effective criticality.
// approvals = 0 → DIRECT (commit immediately)
// approvals = 1 → single-person approval
// approvals = 2 → two-person approval
const CRITICALITY_LEVELS: Record<Criticality, number> = {
  low: 0,
  medium: 0,
  high: 1,
  critical: 2,
};

const EXECUTIVE_SCOPE_LEVEL = 2; // executive scope is always two-person
const SECRET_MIN_LEVEL = 1; // secret fields are at least single approval

export const POLICY_MATRIX: PolicyTierView[] = [
  { tier: "low", approvals: 0, description: "Routine fields commit immediately (DIRECT)." },
  { tier: "medium", approvals: 0, description: "Routine fields commit immediately (DIRECT)." },
  { tier: "high", approvals: 1, description: "High-criticality fields require one approval." },
  { tier: "critical", approvals: 2, description: "Critical fields require two-person approval." },
  { tier: "secret", approvals: 1, description: "Secret fields require at least one approval." },
  { tier: "executive", approvals: 2, description: "Executive-scope changes require two-person approval." },
];

const SEVERITY: Record<Criticality, number> = { low: 0, medium: 1, high: 2, critical: 3 };
function severity(c: Criticality): number {
  return SEVERITY[c] ?? 1;
}

export class PolicyEngine {
  private readonly freezes?: ChangeFreezeRegistry;
  private readonly windows?: MaintenanceWindowRegistry;
  private readonly now: () => number;

  constructor(
    private readonly registry: ConfigurationRegistry,
    deps: { freezes?: ChangeFreezeRegistry; windows?: MaintenanceWindowRegistry; now?: () => number } = {},
  ) {
    this.freezes = deps.freezes;
    this.windows = deps.windows;
    this.now = deps.now ?? (() => Date.now());
  }

  /** Classify a proposed change set against the multi-level matrix. Uses the
   *  WORST (highest) tier among all changed keys + scope. */
  decision(changes: Record<string, ConfigValue>, scope: ConfigScope): ApprovalDecision {
    const matchedPolicies: string[] = [];
    let approvals = 0;
    let worst: Criticality = "medium";

    for (const key of Object.keys(changes)) {
      const meta = this.registry.get(key);
      const criticality = meta?.criticality ?? "medium";
      if (severity(criticality) > severity(worst)) worst = criticality;
      let level = CRITICALITY_LEVELS[criticality];
      if (meta?.secret && level < SECRET_MIN_LEVEL) level = SECRET_MIN_LEVEL;
      matchedPolicies.push(`${key}:${meta?.secret ? "secret" : criticality}`);
      if (level > approvals) approvals = level;
    }

    if (scope.type === "executive" && approvals < EXECUTIVE_SCOPE_LEVEL) {
      approvals = EXECUTIVE_SCOPE_LEVEL;
      matchedPolicies.push("scope:executive");
    }

    if (approvals === 0) {
      return {
        type: "direct",
        requiredApprovals: 0,
        matchedPolicies,
        reason: `No policy requires approval (worst tier: ${worst}). Commit proceeds directly.`,
      };
    }
    return {
      type: "requires_approval",
      requiredApprovals: approvals,
      matchedPolicies,
      reason: `Approval required — tier ${approvals} on worst criticality ${worst}.`,
    };
  }

  /** Read-only snapshot of the policy matrix (for the Approval Dashboard). */
  policies() {
    return { matrix: POLICY_MATRIX, note: "Policy tiers are declarative; DIRECT by default." };
  }

  // ── Operational gates (freeze + maintenance window) ─────────────────────────

  /** Worst approval level across the change set (reuses the same matrix logic). */
  private worstLevel(changes: Record<string, ConfigValue>, scope: ConfigScope): number {
    let approvals = 0;
    for (const key of Object.keys(changes)) {
      const meta = this.registry.get(key);
      const criticality = meta?.criticality ?? "medium";
      let level = CRITICALITY_LEVELS[criticality];
      if (meta?.secret && level < SECRET_MIN_LEVEL) level = SECRET_MIN_LEVEL;
      if (level > approvals) approvals = level;
    }
    if (scope.type === "executive" && approvals < EXECUTIVE_SCOPE_LEVEL) approvals = EXECUTIVE_SCOPE_LEVEL;
    return approvals;
  }

  /** Only owner/admin may override operational gates (emergency / break glass). */
  canOverride(actor: WriteActor): boolean {
    return actor.role === "owner" || actor.role === "admin";
  }

  /**
   * Operational gate evaluation — the single place where Freeze and Maintenance
   * Window are assessed for a proposed change. Returns whether the change is
   * permitted right now, which freezes block it, and whether a maintenance
   * window is required (critical/secret/executive tiers) and currently active.
   */
  gate(params: { changes: Record<string, ConfigValue>; scope: ConfigScope; now?: number }): OperationalGate {
    const now = params.now ?? this.now();
    const keys = Object.keys(params.changes);

    const frozen = this.freezes?.isFrozen(params.scope, keys, now) ?? { frozen: false, freezes: [] };

    // A maintenance window is required when the change carries a
    // critical/secret/executive tier AND at least one window is defined.
    const windowRequired = (this.windows?.list().length ?? 0) > 0 && this.worstLevel(params.changes, params.scope) >= 1;
    const activeWindow = windowRequired ? this.windows?.activeAt(now) ?? null : null;
    const withinWindow = !windowRequired || activeWindow != null;

    const blocked = frozen.frozen || !withinWindow;
    const reasons: string[] = [];
    if (frozen.frozen) reasons.push(`change frozen: ${frozen.freezes.map((f) => f.id).join(", ")}`);
    if (!withinWindow) reasons.push("outside active maintenance window (window-required tier)");

    return {
      ok: !blocked,
      blocked,
      reasons,
      windowBy: frozen.freezes.map((f) => f.id),
      windowRequired,
      withinWindow,
      activeWindow: activeWindow ? { id: activeWindow.id, name: activeWindow.name } : null,
    };
  }
}