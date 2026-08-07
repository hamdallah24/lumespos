// ConfigCenter — Milestone 5 Phase 3: Operational Governance.
// Change Freeze (global/workspace/branch/executive/keys), Maintenance Window
// (active/next), gate evaluation in PolicyEngine (single evaluation point),
// Emergency Override (break glass) with full audit, Governance Calendar, and
// scheduler integration (consumer of the locked M4 BackgroundScheduler).

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { ConfigGovernance, PolicyEngine } from "../../../src/settings/governance";
import { BackgroundScheduler } from "../../../src/settings/automation";
import type { WriteActor } from "../../../src/settings/security";
import type { ConfigScope } from "../../../src/settings/types";

const actor = (id: string, role: WriteActor["role"]): WriteActor => ({ actorId: id, role });
const wsScope: ConfigScope = { type: "workspace", workspaceId: 1 };
const branchScope: ConfigScope = { type: "branch", branchId: 9 };

describe("Change Freeze — scope granularity + key subset", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline });
  });

  it("global freeze blocks any workspace change", async () => {
    gov.createFreeze({ label: "release", reason: "release window", scope: { type: "global" }, actor: actor("1", "owner") });
    const out = await gov.propose({ actor: actor("2", "manager"), scope: wsScope, changes: { "providers.temperature": 0.5 } });
    expect(out.mode).toBe("blocked");
    expect((out as { overrideable?: boolean }).overrideable).toBe(false);
  });

  it("workspace freeze blocks that workspace only", async () => {
    gov.createFreeze({ label: "ws1", reason: "workspace 1 freeze", scope: { type: "workspace", workspaceId: 1 }, actor: actor("1", "owner") });
    const blocked = await gov.propose({ actor: actor("2", "manager"), scope: wsScope, changes: { "providers.temperature": 0.5 } });
    expect(blocked.mode).toBe("blocked");
    const allowed = await gov.propose({ actor: actor("2", "manager"), scope: { type: "workspace", workspaceId: 2 }, changes: { "providers.temperature": 0.5 } });
    expect(allowed.mode).toBe("direct");
  });

  it("branch freeze blocks the branch; key subset freezes only listed keys", async () => {
    gov.createFreeze({ label: "b9", reason: "branch 9 freeze", scope: { type: "branch", branchId: 9 }, keys: ["providers.temperature"], actor: actor("1", "owner") });
    const blocked = await gov.propose({ actor: actor("2", "manager"), scope: branchScope, changes: { "providers.temperature": 0.6 } });
    expect(blocked.mode).toBe("blocked");
    // key not in the freeze keys → allowed
    const allowed = await gov.propose({ actor: actor("2", "manager"), scope: branchScope, changes: { "providers.defaultProvider": "gemini" } });
    expect(allowed.mode).toBe("direct");
  });

  it("time-aware: not effective before from, not after until", () => {
    const f = gov.createFreeze({ label: "t", reason: "scheduled freeze", scope: { type: "global" }, from: 1000, until: 2000, actor: actor("1", "owner") });
    expect(gov.freezes.effectiveAt(500).some((x) => x.id === f.id)).toBe(false);
    expect(gov.freezes.effectiveAt(1500).some((x) => x.id === f.id)).toBe(true);
    expect(gov.freezes.effectiveAt(2500).some((x) => x.id === f.id)).toBe(false);
  });

  it("revoke lifts a freeze", async () => {
    const f = gov.createFreeze({ label: "r", reason: "temp", scope: { type: "global" }, actor: actor("1", "owner") });
    gov.revokeFreeze(f.id, actor("1", "owner"));
    const out = await gov.propose({ actor: actor("2", "manager"), scope: wsScope, changes: { "providers.temperature": 0.5 } });
    expect(out.mode).toBe("direct");
  });
});

describe("Maintenance Window — active/next evaluation", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;
  let now: number;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    now = 1000;
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline, now: () => now });
  });

  it("one-off window gates a window-required (critical) change", async () => {
    const change = { scope: wsScope, changes: { "providers.deepseek.model": "deepseek-chat" } };
    const propose = () => gov.propose({ actor: actor("2", "manager"), ...change });
    gov.createWindow({ name: "nightly", kind: "one-off", from: 1000, to: 2000, actor: "owner" });
    now = 500;
    // outside the window (not yet started) → blocked, not overridable by a manager
    const outside = await propose();
    expect(outside.mode).toBe("blocked");
    expect((outside as { overrideable?: boolean }).overrideable).toBe(false);
    // inside the window → high field still needs approval
    now = 1500;
    const inside = await propose();
    expect(inside.mode).toBe("approval");
  });

  it("no windows configured → no window gate (backward compatible)", async () => {
    const out = await gov.propose({ actor: actor("2", "manager"), scope: wsScope, changes: { "providers.deepseek.model": "deepseek-chat" } });
    expect(out.mode).toBe("approval");
  });

  it("recurring window detects active and next start", () => {
    const d = new Date(now);
    now = 0;
    gov.createWindow({ name: "all-day", kind: "recurring", days: [d.getDay()], startMinute: 0, endMinute: 1440, actor: "owner" });
    expect(gov.windows.within(now)).toBe(true);
    expect(gov.windows.activeAt(now)?.name).toBe("all-day");
    // the window is active now → the next start is a future day of the same weekday
    const next = gov.windows.nextAt(now);
    expect(next).toBeTypeOf("number");
    expect(next).toBeGreaterThan(now);
  });
});

describe("Emergency Override (Break Glass) — audited", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline });
  });

  it("owner breaks a freeze with a fully audited record + revision", async () => {
    gov.createFreeze({ label: "x", reason: "freeze", scope: { type: "global" }, actor: actor("1", "owner") });
    const before = center.store.revisionCount;
    const result = await gov.breakGlass({
      actor: actor("1", "owner"),
      scope: wsScope,
      changes: { "providers.temperature": 0.4 },
      reason: "incident response",
    });
    expect(result.revision).toBe(before + 1);
    expect(result.record.type).toBe("break-glass");
    expect(result.record.data.reason).toBe("incident response");
    expect(gov.gateLog.byType("break-glass").length).toBe(1);
  });

  it("non-owner/admin cannot break glass", async () => {
    gov.createFreeze({ label: "x", reason: "freeze", scope: { type: "global" }, actor: actor("1", "owner") });
    await expect(gov.breakGlass({ actor: actor("2", "manager"), scope: wsScope, changes: { "providers.temperature": 0.4 }, reason: "nope" })).rejects.toThrow(/owner or admin/);
  });

  it("break glass still validates (invalid change rejected)", async () => {
    await expect(gov.breakGlass({ actor: actor("1", "owner"), scope: wsScope, changes: { "providers.temperature": "not-a-number" }, reason: "x" })).rejects.toThrow(/validation/);
  });
});

describe("Governance Calendar + Scheduler integration", () => {
  let center: ConfigCenter;
  let gov: ConfigGovernance;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    gov = new ConfigGovernance({ registry: center.registry, pipeline: center.pipeline });
  });

  it("calendar is a read-only projection of freeze + window state", () => {
    gov.createFreeze({ label: "c", reason: "calendar freeze", scope: { type: "global" }, actor: actor("1", "owner") });
    gov.createWindow({ name: "w", kind: "one-off", from: Date.now() - 1000, to: Date.now() + 1000, actor: "owner" });
    const cal = gov.calendar();
    expect(cal.freezes.activeCount).toBe(1);
    expect(cal.window.active?.name).toBe("w");
    expect(typeof cal.window.nextStartAt === "number" || cal.window.nextStartAt === null).toBe(true);
  });

  it("registers one generic job on the M4 scheduler and ticks", async () => {
    const scheduler = new BackgroundScheduler({ tickIntervalMs: 1, now: () => 0 });
    gov.registerScheduler(scheduler, 50);
    expect(scheduler.has("governance.ops.tick")).toBe(true);
    const rec = await scheduler.runNow("governance.ops.tick");
    expect(rec.status).toBe("success");
  });
});