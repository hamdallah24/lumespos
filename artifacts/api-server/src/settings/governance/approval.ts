// ConfigCenter — Milestone 5 Phase 2: Approval Registry (event-sourced).
// Backed by the append-only ApprovalJournal. Each vote / lifecycle transition is
// an immutable record; request state is derived by replay. Enforces the
// two-person quorum, self-approval ban, no-double-vote, single-reject veto,
// TTL expiration, and optimistic locking (per-request version check).
//
// Approval is authorization only — nothing here writes to the config store.

import type { ConfigScope, ConfigValue } from "../types";
import type { WriteActor } from "../security";
import { ApprovalJournal, type ApprovalRecord } from "./journal";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";

export interface ApproverVote {
  actorId: string;
  role: string;
  at: number;
  note?: string;
}

export interface ApprovalHistoryStep {
  seq: number;
  type: string;
  at: number;
  actorId?: string;
  role?: string;
  note?: string;
  revision?: number;
  correlationId?: string;
}

export interface ApprovalRequest {
  id: string;
  status: ApprovalStatus;
  requester: WriteActor;
  scope: ConfigScope;
  changes: Record<string, ConfigValue>;
  requiredApprovals: number;
  matchedPolicies: string[];
  approvals: ApproverVote[];
  rejections: ApproverVote[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  expiresAt?: number;
  version: number;
  correlationId?: string;
  revision?: number;
  reason?: string;
  history: ApprovalHistoryStep[];
}

export interface ApprovalQuery {
  status?: ApprovalStatus;
  requesterId?: string;
  search?: string;
  sort?: "createdAt" | "updatedAt" | "requiredApprovals";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ApprovalPage {
  total: number;
  items: ApprovalRequest[];
  limit: number;
  offset: number;
}

export class GovernanceRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const APPROVER_ROLES = new Set(["manager", "admin", "owner"]);

export class ApprovalRegistry {
  private readonly journal: ApprovalJournal;
  private counter = 0;
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now(), journal?: ApprovalJournal) {
    this.now = now;
    this.journal = journal ?? new ApprovalJournal();
  }

  private nextId(): string {
    this.counter += 1;
    return `appr-${this.counter.toString(36)}-${this.now().toString(36)}`;
  }

  // ── Mutations (each appends an immutable record) ──────────────────────────
  create(input: {
    requester: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
    requiredApprovals: number;
    matchedPolicies: string[];
    reason?: string;
    expiresAt?: number;
  }): ApprovalRequest {
    const id = this.nextId();
    this.journal.append({
      requestId: id,
      type: "created",
      at: this.now(),
      data: {
        requester: input.requester,
        scope: input.scope,
        changes: input.changes,
        requiredApprovals: input.requiredApprovals,
        matchedPolicies: input.matchedPolicies,
        reason: input.reason,
        expiresAt: input.expiresAt,
      },
    });
    return this.require(id);
  }

  /** Record an approval vote. On quorum the request flips to APPROVED. */
  approve(id: string, approver: WriteActor, note?: string, expectedVersion?: number): { request: ApprovalRequest; quorumReached: boolean } {
    this.assertUnchanged(id, expectedVersion);
    const request = this.require(id);
    this.assertPending(request);
    this.assertAuthority(approver);
    this.assertNotRequester(request, approver);
    this.assertNoDoubleVote(request, approver);

    this.journal.append({
      requestId: id,
      type: "approved",
      at: this.now(),
      data: { actorId: approver.actorId ?? approver.role, role: approver.role, note },
    });
    const next = this.require(id);
    return { request: next, quorumReached: next.status === "approved" };
  }

  /** A single rejection vote vetoes the request immediately. */
  reject(id: string, approver: WriteActor, note?: string, expectedVersion?: number): ApprovalRequest {
    this.assertUnchanged(id, expectedVersion);
    const request = this.require(id);
    this.assertPending(request);
    this.assertAuthority(approver);
    this.assertNotRequester(request, approver);
    this.assertNoDoubleVote(request, approver);

    this.journal.append({
      requestId: id,
      type: "rejected",
      at: this.now(),
      data: { actorId: approver.actorId ?? approver.role, role: approver.role, note },
    });
    return this.require(id);
  }

  cancel(id: string, actor: WriteActor, expectedVersion?: number): ApprovalRequest {
    this.assertUnchanged(id, expectedVersion);
    const request = this.require(id);
    this.assertPending(request);
    const isRequester = actor.actorId === request.requester.actorId;
    if (!isRequester && actor.role !== "owner" && actor.role !== "admin") {
      throw new GovernanceRequestError(403, "only the requester or an owner can cancel a request");
    }
    this.journal.append({ requestId: id, type: "cancelled", at: this.now() });
    return this.require(id);
  }

  /** Mark a committed (pipeline-run) request with its revision + correlation. */
  markCommitted(id: string, correlationId: string, revision: number): void {
    this.journal.append({ requestId: id, type: "committed", at: this.now(), data: { correlationId, revision } });
    void this.require(id);
  }

  /** Auto-expire pending requests whose TTL (expiresAt) has elapsed. */
  expirePending(now: number): ApprovalRequest[] {
    const expired: ApprovalRequest[] = [];
    for (const req of this.list({ status: "pending" }).items) {
      if (req.expiresAt != null && req.expiresAt <= now) {
        this.journal.append({ requestId: req.id, type: "expired", at: now });
        expired.push(this.require(req.id));
      }
    }
    return expired;
  }

  // ── Read (derived from journal replay) ─────────────────────────────────────
  versionOf(id: string): number {
    return this.journal.versionOf(id);
  }

  get(id: string): ApprovalRequest | undefined {
    const records = this.journal.forRequest(id);
    if (records.length === 0) return undefined;
    return this.replay(records);
  }
  detail(id: string): { request: ApprovalRequest; timeline: readonly ApprovalRecord[] } | undefined {
    const request = this.get(id);
    if (!request) return undefined;
    return { request, timeline: this.journal.forRequest(id) };
  }

  require(id: string): ApprovalRequest {
    const request = this.get(id);
    if (!request) throw new GovernanceRequestError(404, `approval request not found: ${id}`);
    return request;
  }

  list(query: ApprovalQuery = {}): ApprovalPage {
    let items = this.allDerived();
    if (query.status) items = items.filter((r) => r.status === query.status);
    if (query.requesterId) items = items.filter((r) => r.requester.actorId === query.requesterId);
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter((r) =>
        r.id.toLowerCase().includes(q)
        || r.requester.role.toLowerCase().includes(q)
        || (r.reason?.toLowerCase().includes(q) ?? false)
        || Object.keys(r.changes).some((k) => k.toLowerCase().includes(q)));
    }
    const sortKey = query.sort ?? "createdAt";
    const dir = query.order === "asc" ? 1 : -1;
    items = items.sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * dir);
    const total = items.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return { total, items: items.slice(offset, offset + limit), limit, offset };
  }

  private allDerived(): ApprovalRequest[] {
    const current = new Map<string, ApprovalRequest>();
    for (const rec of this.journal.all()) {
      const prev = current.get(rec.requestId);
      if (!prev) {
        if (rec.type !== "created") throw new GovernanceRequestError(409, "journal missing created record");
        current.set(rec.requestId, this.reconstructBase(rec));
        continue;
      }
      current.set(rec.requestId, this.apply(prev, rec));
    }
    return [...current.values()];
  }

  private replay(records: readonly ApprovalRecord[]): ApprovalRequest {
    let request = this.reconstructBase(records[0]);
    for (let i = 1; i < records.length; i += 1) request = this.apply(request, records[i]);
    return request;
  }

  private reconstructBase(record: ApprovalRecord): ApprovalRequest {
    const d = record.data as {
      requester: WriteActor; scope: ConfigScope; changes: Record<string, ConfigValue>;
      requiredApprovals: number; matchedPolicies: string[]; reason?: string; expiresAt?: number;
    };
    return {
      id: record.requestId,
      status: "pending",
      requester: { ...d.requester },
      scope: { ...d.scope },
      changes: { ...(d.changes ?? {}) },
      requiredApprovals: d.requiredApprovals ?? 1,
      matchedPolicies: [...(d.matchedPolicies ?? [])],
      approvals: [],
      rejections: [],
      createdAt: record.at,
      updatedAt: record.at,
      expiresAt: d.expiresAt,
      reason: d.reason,
      version: record.version,
      history: [recordToStep(record)],
    };
  }

  private apply(base: ApprovalRequest, record: ApprovalRecord): ApprovalRequest {
    const next: ApprovalRequest = { ...base, history: [...base.history, recordToStep(record)], version: record.version };
    switch (record.type) {
      case "approved":
        next.approvals = [...base.approvals, { actorId: String(record.data.actorId), role: String(record.data.role), at: record.at, note: record.data.note as string | undefined }];
        next.updatedAt = record.at;
        if (next.approvals.length >= next.requiredApprovals) {
          next.status = "approved";
          next.resolvedAt = record.at;
        }
        break;
      case "rejected":
        next.rejections = [...base.rejections, { actorId: String(record.data.actorId), role: String(record.data.role), at: record.at, note: record.data.note as string | undefined }];
        next.status = "rejected";
        next.resolvedAt = record.at;
        next.updatedAt = record.at;
        break;
      case "cancelled":
        next.status = "cancelled";
        next.resolvedAt = record.at;
        next.updatedAt = record.at;
        break;
      case "committed":
        next.correlationId = record.data.correlationId as string;
        next.revision = record.data.revision as number;
        next.updatedAt = record.at;
        break;
      case "expired":
        next.status = "expired";
        next.resolvedAt = record.at;
        next.updatedAt = record.at;
        break;
      default:
        break;
    }
    return next;
  }

  private assertUnchanged(id: string, expectedVersion?: number): void {
    if (expectedVersion == null) return;
    if (this.journal.versionOf(id) !== expectedVersion) {
      throw new GovernanceRequestError(409, `optimistic lock conflict: expected v${expectedVersion}, got v${this.journal.versionOf(id)}`);
    }
  }

  private assertPending(request: ApprovalRequest): void {
    if (request.status !== "pending") throw new GovernanceRequestError(409, `request is not pending (state: ${request.status})`);
  }

  private assertAuthority(approver: WriteActor): void {
    if (!APPROVER_ROLES.has(approver.role)) throw new GovernanceRequestError(403, `role "${approver.role}" lacks approval authority`);
  }

  private assertNotRequester(request: ApprovalRequest, approver: WriteActor): void {
    if (approver.actorId === request.requester.actorId) throw new GovernanceRequestError(403, "self-approval is not allowed");
  }

  private assertNoDoubleVote(request: ApprovalRequest, approver: WriteActor): void {
    const voted = request.approvals.some((v) => v.actorId === approver.actorId)
      || request.rejections.some((v) => v.actorId === approver.actorId);
    if (voted) throw new GovernanceRequestError(409, "actor has already voted on this request");
  }
}

function recordToStep(record: ApprovalRecord): ApprovalHistoryStep {
  return {
    seq: record.seq,
    type: record.type,
    at: record.at,
    actorId: record.data.actorId as string | undefined,
    role: record.data.role as string | undefined,
    note: record.data.note as string | undefined,
    revision: record.data.revision as number | undefined,
    correlationId: record.data.correlationId as string | undefined,
  };
}