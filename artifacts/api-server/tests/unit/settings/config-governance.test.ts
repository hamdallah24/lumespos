// ConfigCenter — Milestone 5 Phase 1: Governance & Approval Workflow.
// Covers: DIRECT-by-default, policy-driven approval gating (high/secret/critical/
// executive), propose() routing through the pipeline, quorum, self-approval ban,
// single-reject veto, cancel by requester, and the read-only guarantee.

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { ConfigGovernance } from "../../../src/settings/governance";
import type { WriteActor } from "../../../src/settings/security";
import type { ConfigScope } from "../../../src/settings/types";

const actor = (id: string, role: WriteActor["role"]): WriteActor => ({ actorId: id, role });
const scope: ConfigScope = { type: "workspace", workspaceId: 1 };
// apiKey is default-scope only; secret/critical gating is exercised here.
const defaultScope: ConfigScope = { type: "default" };

describe("ConfigGovernance — propose (policy-driven, DIRECT by default)", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline });
  });

  it("commits DIRECT when no policy tier requires approval (low/medium)", async () => {
    const before = center.store.revisionCount;
    const out = await gov.propose({ actor: actor("1", "manager"), scope, changes: { "providers.temperature": 0.6 } });
    expect(out.mode).toBe("direct");
    if (out.mode === "direct") {
      expect(out.run.revision).toBe(before + 1);
      expect(out.run.state).toBe("SNAPSHOT");
      expect(center.resolver).toBeDefined();
    }
  });

  it("opens a PENDING request (no revision) when a high field needs approval", async () => {
    const before = center.store.revisionCount;
    const out = await gov.propose({ actor: actor("1", "manager"), scope, changes: { "providers.deepseek.model": "deepseek-v4-flash" } });
    expect(out.mode).toBe("approval");
    if (out.mode === "approval") {
      expect(out.request.status).toBe("pending");
      expect(out.request.requiredApprovals).toBe(1);
    }
    expect(center.store.revisionCount).toBe(before); // held, nothing committed
  });

  it("secret+critical field demands two-person approval", async () => {
    // default scope is owner-managed; owner can write it and is still gated.
    const out = await gov.propose({ actor: actor("1", "owner"), scope: defaultScope, changes: { "providers.deepseek.apiKey": "s3cr3t" } });
    expect(out.mode).toBe("approval");
    if (out.mode === "approval") expect(out.request.requiredApprovals).toBe(2);
  });

  it("executive scope raises any change to two-person approval", async () => {
    const out = await gov.propose({
      actor: actor("1", "owner"),
      scope: { type: "executive", executiveRole: "CEO" },
      changes: { "providers.temperature": 0.5 },
    });
    expect(out.mode).toBe("approval");
    if (out.mode === "approval") expect(out.request.requiredApprovals).toBe(2);
  });

  it("returns blocked for a change the actor is not allowed to write", async () => {
    const out = await gov.propose({ actor: actor("1", "viewer"), scope, changes: { "providers.temperature": 0.7 } });
    expect(out.mode).toBe("blocked");
  });
});

describe("ConfigGovernance — approval workflow", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline });
  });

  async function openCritical(requester: WriteActor = actor("1", "owner")): Promise<string> {
    const out = await gov.propose({ actor: requester, scope: defaultScope, changes: { "providers.deepseek.apiKey": "s3cr3t" } });
    if (out.mode !== "approval") throw new Error("expected approval request");
    return out.request.id;
  }

  it("single approver commits a one-person (high) request", async () => {
    const out = await gov.propose({ actor: actor("1", "manager"), scope, changes: { "providers.deepseek.model": "deepseek-v4-flash" } });
    if (out.mode !== "approval") throw new Error("expected approval");
    const before = center.store.revisionCount;
    const res = await gov.approve(out.request.id, actor("2", "owner"));
    expect(res.committed).toBeTruthy();
    expect(res.request.status).toBe("approved");
    expect(center.store.revisionCount).toBe(before + 1);
    expect(res.committed?.revision).toBe(before + 1);
  });

  it("two-person approval commits only on the second distinct approver", async () => {
    const id = await openCritical();
    const r1 = await gov.approve(id, actor("2", "manager"));
    expect(r1.committed).toBeUndefined();
    expect(r1.request.status).toBe("pending");
    const r2 = await gov.approve(id, actor("3", "owner"));
    expect(r2.committed).toBeTruthy();
    expect(r2.request.status).toBe("approved");
  });

  it("self-approval is banned even for the requester-owner", async () => {
    const id = await openCritical(actor("5", "owner"));
    await expect(gov.approve(id, actor("5", "owner"))).rejects.toThrow(/self-approval/);
  });

  it("a single rejection vetoes the request and commits nothing", async () => {
    const id = await openCritical();
    const before = center.store.revisionCount;
    const req = gov.reject(id, actor("2", "owner"));
    expect(req.status).toBe("rejected");
    expect(center.store.revisionCount).toBe(before);
  });

  it("one actor cannot cast two votes", async () => {
    const id = await openCritical();
    await gov.approve(id, actor("2", "manager"));
    await expect(gov.approve(id, actor("2", "manager"))).rejects.toThrow(/already voted/);
  });

  it("requester may cancel; a viewer cannot cancel another's request", async () => {
    const out = await gov.propose({ actor: actor("1", "manager"), scope, changes: { "providers.deepseek.model": "deepseek-chat" } });
    if (out.mode !== "approval") throw new Error("expected approval");
    const cancelled = gov.cancel(out.request.id, actor("1", "manager"));
    expect(cancelled.status).toBe("cancelled");

    const out2 = await gov.propose({ actor: actor("1", "owner"), scope: defaultScope, changes: { "providers.deepseek.apiKey": "x" } });
    if (out2.mode !== "approval") throw new Error("expected approval");
    expect(() => gov.cancel(out2.request.id, actor("9", "viewer"))).toThrow(/cancel/);
  });

  it("approval votes do not mutate the store until quorum commits", async () => {
    const id = await openCritical();
    const mid = center.store.revisionCount;
    await gov.approve(id, actor("2", "manager")); // still pending
    expect(center.store.revisionCount).toBe(mid);
  });

  it("exposes policies + counts (read-only)", () => {
    expect(gov.policies().matrix.length).toBeGreaterThan(0);
    expect(gov.counts()).toEqual({ pending: 0, approved: 0, rejected: 0, cancelled: 0, expired: 0 });
  });
});