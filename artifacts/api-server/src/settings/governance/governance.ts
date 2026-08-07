// ConfigCenter — Milestone 5 Phase 2: Governance Service (orchestration layer).
// Consumer-only. propose() reuses pipeline.plan() (validate + RBAC), then either
// commits DIRECT via run() or opens a durable ApprovalRequest in the journal.
// Approving on quorum COMMITS through the same pipeline.run(). Approval remains
// authorization only — the Store + revision + ConfigurationChanged are the sole
// source of truth for configuration.

import type { ConfigScope, ConfigValue } from "../types";
import type { ConfigurationRegistry } from "../registry";
import type { ConfigurationPipeline, PipelineRun } from "../pipeline";
import type { WriteActor } from "../security";
import { PolicyEngine, type ApprovalDecision, type OperationalGate } from "./policy";
import {
  ApprovalRegistry,
  GovernanceRequestError,
  type ApprovalRequest,
  type ApprovalPage,
  type ApprovalQuery,
  type ApprovalStatus,
} from "./approval";
import { ApprovalJournal, type ApprovalRecord } from "./journal";
import { ChangeFreezeRegistry, type FreezeDefinition, type FreezeScopeMatch } from "./freeze";
import { MaintenanceWindowRegistry, type WindowDefinition } from "./window";
import { GovernanceGateLog, type GateRecord } from "./gates-log";
import type { BackgroundScheduler } from "../automation/scheduler";

export interface ConfigGovernanceDeps {
  registry: ConfigurationRegistry;
  pipeline: ConfigurationPipeline;
  now?: () => number;
  /** TTL for approval requests (ms). 0 = never expires. */
  approvalTtlMs?: number;
  /** Optional journal override (tests can share a durable journal). */
  journal?: ApprovalJournal;
  freezes?: ChangeFreezeRegistry;
  windows?: MaintenanceWindowRegistry;
  gateLog?: GovernanceGateLog;
}

export type ProposeOutcome =
  | { mode: "direct"; run: PipelineRun }
  | { mode: "approval"; request: ApprovalRequest }
  | { mode: "invalid"; errors: string[] }
  | { mode: "blocked"; reason: string; overrideable?: boolean };

export interface GovernanceCounts {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
}

export interface GovernanceCalendar {
  at: number;
  freezes: {
    all: FreezeDefinition[];
    active: FreezeDefinition[];
    activeCount: number;
  };
  window: {
    windows: WindowDefinition[];
    active: WindowDefinition | null;
    nextStartAt: number | null;
    withinWindow: boolean;
  };
}

export interface AttentionItem {
  request: ApprovalRequest;
  elapsedMs: number;
  remainingMs: number | null;
}

export class ConfigGovernance {
  readonly policy: PolicyEngine;
  readonly approvals: ApprovalRegistry;
  readonly freezes: ChangeFreezeRegistry;
  readonly windows: MaintenanceWindowRegistry;
  readonly gateLog: GovernanceGateLog;
  private readonly pipeline: ConfigurationPipeline;
  private readonly registry: ConfigurationRegistry;
  private readonly now: () => number;
  private readonly approvalTtlMs: number;

  constructor(deps: ConfigGovernanceDeps) {
    this.registry = deps.registry;
    this.pipeline = deps.pipeline;
    this.now = deps.now ?? (() => Date.now());
    this.approvalTtlMs = deps.approvalTtlMs ?? 0;
    this.freezes = deps.freezes ?? new ChangeFreezeRegistry();
    this.windows = deps.windows ?? new MaintenanceWindowRegistry();
    this.gateLog = deps.gateLog ?? new GovernanceGateLog();
    this.policy = new PolicyEngine(deps.registry, {
      freezes: this.freezes,
      windows: this.windows,
      now: this.now,
    });
    this.approvals = new ApprovalRegistry(this.now, deps.journal);
  }

  /** Submit a proposed change. Operational gates (freeze/window) are evaluated
   *  first; then DIRECT → pipeline.run(); else a durable ApprovalRequest. */
  async propose(params: {
    actor: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
    reason?: string;
  }): Promise<ProposeOutcome> {
    const plan = await this.pipeline.plan(params);
    if (!plan.validation?.ok) return { mode: "invalid", errors: plan.validation?.errors ?? [] };
    if (!plan.policy?.ok) return { mode: "blocked", reason: plan.policy?.reason ?? "denied by policy", overrideable: this.policy.canOverride(params.actor) };

    const gate: OperationalGate = this.policy.gate({ changes: params.changes, scope: params.scope });
    if (gate.blocked) {
      return { mode: "blocked", reason: gate.reasons.join("; "), overrideable: this.policy.canOverride(params.actor) };
    }

    const decision: ApprovalDecision = this.policy.decision(params.changes, params.scope);
    if (decision.type === "direct") {
      const run = await this.pipeline.run(params);
      return { mode: "direct", run };
    }

    const expiresAt = this.approvalTtlMs > 0 ? this.now() + this.approvalTtlMs : undefined;
    const request = this.approvals.create({
      requester: params.actor,
      scope: params.scope,
      changes: params.changes,
      requiredApprovals: decision.requiredApprovals,
      matchedPolicies: decision.matchedPolicies,
      reason: params.reason,
      expiresAt,
    });
    return { mode: "approval", request };
  }

  /** Approve a request. On quorum, COMMITS via pipeline.run() (requester actor —
   *  approval satisfies the policy tier, it never grants new RBAC). */
  async approve(
    id: string,
    approver: WriteActor,
    note?: string,
    expectedVersion?: number,
  ): Promise<{ request: ApprovalRequest; committed?: { revision: number; correlationId: string } }> {
    const { request, quorumReached } = this.approvals.approve(id, approver, note, expectedVersion);
    if (!quorumReached) return { request };
    const committed = await this.commitApproved(request);
    return { request, committed };
  }

  reject(id: string, approver: WriteActor, note?: string, expectedVersion?: number): ApprovalRequest {
    return this.approvals.reject(id, approver, note, expectedVersion);
  }

  cancel(id: string, actor: WriteActor, expectedVersion?: number): ApprovalRequest {
    return this.approvals.cancel(id, actor, expectedVersion);
  }

  getRequest(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  detail(id: string): { request: ApprovalRequest; timeline: readonly ApprovalRecord[] } | undefined {
    return this.approvals.detail(id);
  }

  versionOf(id: string): number {
    return this.approvals.versionOf(id);
  }

  listRequests(query: ApprovalQuery = {}): ApprovalPage {
    return this.approvals.list(query);
  }

  counts(): GovernanceCounts {
    const all = this.approvals.list({ limit: 100000 }).items;
    return {
      pending: all.filter((r) => r.status === "pending").length,
      approved: all.filter((r) => r.status === "approved").length,
      rejected: all.filter((r) => r.status === "rejected").length,
      cancelled: all.filter((r) => r.status === "cancelled").length,
      expired: all.filter((r) => r.status === "expired").length,
    };
  }

  policies() {
    return this.policy.policies();
  }

  /** Auto-expire requests whose TTL elapsed (idempotent). Returns newly expired. */
  expirePending(now?: number): ApprovalRequest[] {
    return this.approvals.expirePending(now ?? this.now());
  }

  /** Escalation / reminder hook surface for the scheduler: pending requests that
   *  are overdue (elapsed > sinceMs) or about to expire (remaining < warnMs). */
  dueAttention(opts: { sinceMs?: number; warnMs?: number; now?: number } = {}): AttentionItem[] {
    const now = opts.now ?? this.now();
    const page = this.approvals.list({ status: "pending", limit: 100000 });
    const evaluated = page.items.map((request) => {
      const elapsedMs = now - request.createdAt;
      const remainingMs = request.expiresAt != null ? request.expiresAt - now : null;
      return {
        request,
        elapsedMs,
        remainingMs,
        overdue: opts.sinceMs != null && elapsedMs > opts.sinceMs,
        expiringSoon: opts.warnMs != null && remainingMs != null && remainingMs < opts.warnMs,
      };
    });
    return evaluated
      .filter((i) => i.overdue || i.expiringSoon)
      .map((i) => ({ request: i.request, elapsedMs: i.elapsedMs, remainingMs: i.remainingMs }));
  }

  // ── Change Freeze (M5 Phase 3) ─────────────────────────────────────────────
  createFreeze(input: {
    label: string;
    reason: string;
    scope: FreezeScopeMatch;
    keys?: string[];
    from?: number;
    until?: number;
    actor: WriteActor;
  }): FreezeDefinition {
    const freeze = this.freezes.create({ ...input, now: this.now() });
    this.gateLog.append({ type: "freeze.created", at: this.now(), actor: input.actor.actorId ?? input.actor.role, scope: { ...freeze.scope }, data: { id: freeze.id, label: freeze.label, keys: freeze.keys } });
    return freeze;
  }

  revokeFreeze(id: string, actor: WriteActor): FreezeDefinition | undefined {
    const freeze = this.freezes.revoke(id, actor, this.now());
    if (freeze) this.gateLog.append({ type: "freeze.revoked", at: this.now(), actor: actor.actorId ?? actor.role, data: { id } });
    return freeze;
  }

  listFreezes(): FreezeDefinition[] {
    return this.freezes.list();
  }

  // ── Maintenance Window (M5 Phase 3) ────────────────────────────────────────
  createWindow(input: { name: string; kind: "recurring" | "one-off"; days?: number[]; startMinute?: number; endMinute?: number; from?: number; to?: number; actor: string }): WindowDefinition {
    const win = this.windows.create({ ...input, now: this.now() });
    this.gateLog.append({ type: "window.created", at: this.now(), actor: input.actor, data: { id: win.id, name: win.name, kind: win.kind } });
    return win;
  }

  removeWindow(id: string, actor: string): boolean {
    const removed = this.windows.remove(id);
    if (removed) this.gateLog.append({ type: "window.removed", at: this.now(), actor, data: { id } });
    return removed;
  }

  listWindows(): WindowDefinition[] {
    return this.windows.list();
  }

  // ── Emergency Override (Break Glass, M5 Phase 3) ───────────────────────────
  /**
   * Owner/admin may override operational gates (freeze / window / approval tier)
   * for an emergency. Fully audited: a break-glass record is appended to the
   * GateLog, then the change commits through pipeline.run() — validation + RBAC
   * still apply; only the operational/approval gates are bypassed.
   */
  async breakGlass(params: {
    actor: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
    reason: string;
  }): Promise<{ revision: number; correlationId: string; record: GateRecord; ranGate: OperationalGate }> {
    if (!this.policy.canOverride(params.actor)) {
      throw new GovernanceRequestError(403, "break glass requires owner or admin authority");
    }
    const plan = await this.pipeline.plan(params);
    if (!plan.validation?.ok) throw new GovernanceRequestError(422, "validation failed");
    if (!plan.policy?.ok) throw new GovernanceRequestError(403, plan.policy?.reason ?? "denied by policy");

    const ranGate = this.policy.gate({ changes: params.changes, scope: params.scope });

    const run = await this.pipeline.run(params);
    if (run.revision == null) throw new GovernanceRequestError(422, "break-glass change was not committed");
    const record = this.gateLog.append({
      type: "break-glass",
      at: this.now(),
      actor: params.actor.actorId ?? params.actor.role,
      scope: { ...params.scope },
      data: {
        reason: params.reason,
        correlationId: run.correlationId,
        revision: run.revision,
        overriddenGates: ranGate.reasons,
      },
    });
    return { revision: run.revision, correlationId: run.correlationId, record, ranGate };
  }

  // ── Governance Calendar (M5 Phase 3, read-only projection) ─────────────────
  calendar(now?: number): GovernanceCalendar {
    const at = now ?? this.now();
    const freezes = this.freezes.list();
    const activeFreezes = this.freezes.effectiveAt(at);
    return {
      at,
      freezes: {
        all: freezes,
        active: activeFreezes,
        activeCount: activeFreezes.length,
      },
      window: {
        windows: this.windows.list(),
        active: this.windows.activeAt(at),
        nextStartAt: this.windows.nextAt(at),
        withinWindow: this.windows.within(at),
      },
    };
  }

  // ── Scheduler integration (M5 Phase 3) ─────────────────────────────────────
  /** Time-based maintenance tick: auto-expire approvals + return current gates.
   *  Registered as a generic job on the locked M4 BackgroundScheduler. */
  tick(now?: number): { at: number; expiredApprovals: number; activeFreezes: number; activeWindow: string | null } {
    const at = now ?? this.now();
    const expired = this.approvals.expirePending(at);
    const activeFreezes = this.freezes.effectiveAt(at).length;
    const activeWindow = this.windows.activeAt(at)?.name ?? null;
    return { at, expiredApprovals: expired.length, activeFreezes, activeWindow };
  }

  /** Register the operational tick as one generic job on the M4 scheduler. */
  registerScheduler(scheduler: BackgroundScheduler, intervalMs: number): string {
    const id = "governance.ops.tick";
    scheduler.register({
      id,
      name: "Governance operational tick",
      intervalMs,
      execute: async () => {
        this.tick();
      },
    });
    return id;
  }

  private async commitApproved(request: ApprovalRequest): Promise<{ revision: number; correlationId: string }> {
    const run = await this.pipeline.run({
      actor: request.requester,
      scope: request.scope,
      changes: request.changes,
    });
    if (!run.validation?.ok || !run.policy?.ok || run.revision == null) {
      throw new GovernanceRequestError(422, "approved request failed pipeline gates — not committed");
    }
    this.approvals.markCommitted(request.id, run.correlationId, run.revision);
    return { revision: run.revision, correlationId: run.correlationId };
  }
}