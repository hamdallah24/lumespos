// ConfigCenter — Milestone 4 Phase 1: Background Scheduler tests.
// The scheduler is a GENERIC primitive: it must not know Snapshot/Health/Audit.
// These tests verify register/unregister, enable/disable, interval cadence,
// manual execution, history, next/last run and status — all driven by an
// injected clock so timing is deterministic.

import { describe, it, expect, beforeEach } from "vitest";
import { BackgroundScheduler } from "../../../src/settings/automation";

function makeClock() {
  let t = 1000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("BackgroundScheduler", () => {
  let clock: ReturnType<typeof makeClock>;
  let scheduler: BackgroundScheduler;

  beforeEach(() => {
    clock = makeClock();
    scheduler = new BackgroundScheduler({ now: clock.now, tickIntervalMs: 50 });
  });

  it("registers a job with initial enabled state and computed nextRunAt", () => {
    const state = scheduler.register({ id: "j1", name: "Job One", intervalMs: 100, execute: () => {} });
    expect(state.id).toBe("j1");
    expect(state.status).toBe("enabled");
    expect(state.runCount).toBe(0);
    expect(state.lastRunAt).toBeNull();
    expect(state.nextRunAt).toBe(1000 + 100);
  });

  it("registers disabled jobs by default when enabled:false", () => {
    scheduler.register({ id: "d", name: "Disabled", intervalMs: 100, enabled: false, execute: () => {} });
    const state = scheduler.status("d");
    expect(state!.status).toBe("disabled");
    expect(state!.nextRunAt).toBeNull();
  });

  it("rejects duplicate registration", () => {
    scheduler.register({ id: "dup", name: "A", intervalMs: 100, execute: () => {} });
    expect(() =>
      scheduler.register({ id: "dup", name: "B", intervalMs: 100, execute: () => {} }),
    ).toThrow(/already registered/);
  });

  it("rejects non-positive intervals", () => {
    expect(() => scheduler.register({ id: "bad", name: "Bad", intervalMs: 0, execute: () => {} })).toThrow(
      /positive number/,
    );
  });

  it("unregisters a job", () => {
    scheduler.register({ id: "j", name: "J", intervalMs: 100, execute: () => {} });
    expect(scheduler.has("j")).toBe(true);
    expect(scheduler.unregister("j")).toBe(true);
    expect(scheduler.has("j")).toBe(false);
    expect(scheduler.status("j")).toBeNull();
  });

  it("enables and disables a job", () => {
    scheduler.register({ id: "t", name: "T", intervalMs: 100, execute: () => {} });
    scheduler.disable("t");
    expect(scheduler.isEnabled("t")).toBe(false);
    expect(scheduler.status("t")!.status).toBe("disabled");
    scheduler.enable("t");
    expect(scheduler.isEnabled("t")).toBe(true);
  });

  it("runs due jobs exactly once per tick when due", async () => {
    let runs = 0;
    scheduler.register({ id: "once", name: "Once", intervalMs: 100, execute: () => { runs += 1; } });
    clock.advance(99);
    await scheduler.tick();
    expect(runs).toBe(0);
    clock.advance(1); // now 1100, nextRunAt 1100
    await scheduler.tick();
    expect(runs).toBe(1);
    const state = scheduler.status("once")!;
    expect(state.runCount).toBe(1);
    expect(state.lastStatus).toBe("success");
    expect(state.lastRunAt).toBe(1100);
    // not due again until +100
    clock.advance(99);
    await scheduler.tick();
    expect(runs).toBe(1);
  });

  it("stops running a disabled job on tick", async () => {
    let runs = 0;
    scheduler.register({ id: "d2", name: "D2", intervalMs: 100, execute: () => { runs += 1; } });
    clock.advance(100);
    scheduler.disable("d2");
    await scheduler.tick();
    expect(runs).toBe(0);
  });

  it("executes a job manually regardless of interval and records history", async () => {
    let runs = 0;
    scheduler.register({ id: "man", name: "Man", intervalMs: 1000, execute: () => { runs += 1; } });
    await scheduler.runNow("man");
    expect(runs).toBe(1);
    const state = scheduler.status("man")!;
    expect(state.history).toHaveLength(1);
    expect(state.history[0].manual).toBe(true);
    expect(state.history[0].status).toBe("success");
    expect(state.history[0].startedAt).toBe(1000);
  });

  it("records error status and error message on rejected execute", async () => {
    scheduler.register({
      id: "err",
      name: "Err",
      intervalMs: 100,
      execute: () => {
        throw new Error("boom");
      },
    });
    const record = await scheduler.runNow("err");
    expect(record.status).toBe("error");
    expect(record.error).toBe("boom");
    const state = scheduler.status("err")!;
    expect(state.lastStatus).toBe("error");
    expect(state.errorCount).toBe(1);
    expect(state.runCount).toBe(1);
    expect(state.history[0].status).toBe("error");
  });

  it("supports async execute functions", async () => {
    let done = false;
    scheduler.register({
      id: "async",
      name: "Async",
      intervalMs: 100,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 10));
        done = true;
      },
    });
    await scheduler.runNow("async");
    expect(done).toBe(true);
    expect(scheduler.status("async")!.lastStatus).toBe("success");
  });

  it("trims history to maxHistoryPerJob", async () => {
    const trimmed = new BackgroundScheduler({ now: clock.now, maxHistoryPerJob: 3 });
    let count = 0;
    trimmed.register({ id: "hist", name: "Hist", intervalMs: 100, execute: () => { count += 1; } });
    for (let i = 0; i < 5; i++) {
      clock.advance(100);
      await trimmed.tick();
      expect(count).toBe(i + 1);
    }
    const state = trimmed.status("hist")!;
    expect(state.history.length).toBe(3);
    expect(state.runCount).toBe(5);
    expect(clock.now()).toBe(1500);
  });

  it("start() and stop() toggle the tick loop", async () => {
    const sched = new BackgroundScheduler({ now: clock.now, tickIntervalMs: 2000000 });
    expect(sched.isRunning()).toBe(false);
    sched.start();
    expect(sched.isRunning()).toBe(true);
    sched.stop();
    expect(sched.isRunning()).toBe(false);
    await scheduler; // noop
  });

  it("snapshot aggregates jobs and execution totals", async () => {
    scheduler.register({ id: "s1", name: "S1", intervalMs: 100, execute: () => {} });
    await scheduler.runNow("s1");
    const snap = scheduler.snapshot();
    expect(snap.jobs).toHaveLength(1);
    expect(snap.totalExecutions).toBe(1);
  });

  it("throws when running an unregistered job", async () => {
    await expect(scheduler.runNow("nope")).rejects.toThrow(/not registered/);
  });

  it("throws when an already-running job executes again", async () => {
    let release: () => void = () => {};
    scheduler.register({
      id: "lock",
      name: "Lock",
      intervalMs: 100,
      execute: () => new Promise<void>((r) => { release = r; }),
    });
    const first = scheduler.runNow("lock");
    await expect(scheduler.runNow("lock")).rejects.toThrow(/already running/);
    release();
    await first;
  });
});
