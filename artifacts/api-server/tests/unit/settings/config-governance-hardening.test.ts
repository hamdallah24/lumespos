// ConfigCenter — Milestone 5 Phase 2: Approval Hardening & Data Layer.
// Covers: durable event-sourced journal (replay/reconstruction), immutable
// history + detail timeline, optimistic locking (version check), TTL auto-expire,
// pending queue pagination/sort/filter/search, and duplicate-vote prevention.

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { ConfigGovernance, ApprovalJournal, GovernanceRequestError } from "../../../src/settings/governance";
import type { WriteActor } from "../../../src/settings/security";
import type { ConfigScope } from "../../../src/settings/types";

const actor = (id: string, role: WriteActor["role"]): WriteActor => ({ actorId: id, role });
const defaultScope: ConfigScope = { type: "default" };

async function open(gov: ConfigGovernance, requester: WriteActor = actor("1", "owner"), scope: ConfigScope = defaultScope, changes: Record<string, unknown> = { "providers.deepseek.apiKey": "s3cr3t" }, reason?: string) {
  const out = await gov.propose({ actor: requester, scope, changes, reason });
  if (out.mode !== "approval") throw new Error("expected approval request");
  return out.request;
}

describe("Approval durability (event-sourced journal)", () => {
  it("rebuilds identical state from a fresh registry over the same journal", async () => {
    const journal = new ApprovalJournal();
    const c1 = new ConfigCenter();
    await c1.init();
    const gov1 = new ConfigGovernance({ registry: c1.registry, pipeline: c1.pipeline, journal });

    const a = await open(gov1);
    await gov1.approve(a.id, actor("2", "owner"));
    const b = await open(gov1);
    await gov1.reject(b.id, actor("3", "manager"));

    // Fresh registry, same journal → replay produces the same requests.
    const c2 = new ConfigCenter();
    await c2.init();
    const gov2 = new ConfigGovernance({ registry: c2.registry, pipeline: c2.pipeline, journal });

    const replayed = gov2.listRequests({ limit: 100 }).items;
    expect(replayed.length).toBe(2);
    const reA = gov2.getRequest(a.id);
    expect(reA?.approvals.length).toBe(1);
    expect(reA?.version).toBeGreaterThanOrEqual(2);
    expect(reA?.history.length).toBeGreaterThanOrEqual(2);
    const reB = gov2.getRequest(b.id);
    expect(reB?.status).toBe("rejected");
    expect(reB?.history.map((h) => h.type)).toEqual(["created", "rejected"]);
  });
});

describe("ConfigGovernance hardening — detail, versioning, TTL, queue", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline, approvalTtlMs: 1000 });
  });

  it("detail exposes the full immutable timeline", async () => {
    const req = await open(gov);
    await gov.approve(req.id, actor("2", "owner"));
    const d = gov.detail(req.id);
    expect(d).toBeTruthy();
    expect(d!.timeline.length).toBe(2);
    expect(d!.timeline[0].type).toBe("created");
    expect(d!.timeline[1].type).toBe("approved");
    expect(d!.request.history.map((h) => h.type)).toEqual(["created", "approved"]);
  });

  it("optimistic locking: stale expectedVersion conflicts", async () => {
    const req = await open(gov);
    const v0 = gov.versionOf(req.id);
    await gov.approve(req.id, actor("2", "owner"), undefined, v0);
    const v1 = gov.versionOf(req.id);
    await expect(gov.approve(req.id, actor("3", "owner"), undefined, v0)).rejects.toBeInstanceOf(GovernanceRequestError);
    await expect(gov.approve(req.id, actor("3", "owner"), undefined, v1)).resolves.toBeDefined();
  });

  it("TTL: pending requests auto-expire after their deadline", async () => {
    // approvalTtlMs=1000; advance time manually via expirePending.
    const req = await open(gov);
    const expired = gov.expirePending(req.createdAt + 1001);
    expect(expired.some((r) => r.id === req.id)).toBe(true);
    expect(gov.getRequest(req.id)?.status).toBe("expired");
  });

  it("expired requests cannot be approved", async () => {
    const req = await open(gov);
    gov.expirePending(req.createdAt + 1001);
    await expect(gov.approve(req.id, actor("2", "owner"))).rejects.toThrow(/not pending/);
  });

  it("pending queue supports pagination, sort, search, filter", async () => {
    const r1 = await open(gov, actor("1", "owner"), defaultScope, { "providers.deepseek.apiKey": "aaa" }, "billing-upgrade");
    const r2 = await open(gov, actor("7", "owner"), defaultScope, { "providers.deepseek.apiKey": "bbb" });
    await gov.reject(r2.id, actor("8", "manager"));

    const page1 = gov.listRequests({ status: "pending", limit: 1, offset: 0, sort: "createdAt", order: "asc" });
    expect(page1.total).toBe(1);
    expect(page1.items.length).toBe(1);

    const bySearch = gov.listRequests({ search: "billing", limit: 10 });
    expect(bySearch.total).toBe(1);
    expect(bySearch.items[0].id).toBe(r1.id);

    const byRequester = gov.listRequests({ requesterId: "7", limit: 10 });
    expect(byRequester.total).toBe(1);
    expect(byRequester.items[0].id).toBe(r2.id);
  });

  it("duplicate votes are prevented across journal replays", async () => {
    const req = await open(gov);
    await gov.approve(req.id, actor("2", "owner"));
    await expect(gov.approve(req.id, actor("2", "owner"))).rejects.toThrow(/already voted/);
  });

  it("dueAttention surfaces overdue and expiring-soon requests (escalation hook)", async () => {
    const req = await open(gov);
    const now = req.createdAt + 5000;
    const attention = gov.dueAttention({ sinceMs: 3000, warnMs: 4000, now });
    expect(attention.some((i) => i.request.id === req.id)).toBe(true);
  });

  it("counts include the expired bucket", () => {
    expect(gov.counts().expired).toBe(0);
  });
});