// ConfigCenter — Milestone 4 Phase 4: Background Maintenance Service.
// ADDITIVE orchestrator — the "operations brain". It composes the already-locked
// automation capabilities (SnapshotMaintenance, DriftDetector, Live Health)
// into ONE continuous maintenance cycle, registered as a single job on the
// generic BackgroundScheduler (one scheduler, one lifecycle, one report).
//
// Cycle: Retention → Integrity Verification → Garbage Collection → Drift
// Detection → Health Verification → Maintenance Report.
//
// The service consumes ONLY public surfaces (SnapshotManager via the
// SnapshotMaintenanceService, DriftDetector, and a health reporter callback).
// It never touches Registry/Store/Resolver/Pipeline internals and is read-only
// for Configuration Center. Each cycle appends ONE audit entry to a bounded
// journal (per cycle, not per job) — additive, without changing the Audit
// Center contract.

import { randomUUID } from "crypto";
import type { SnapshotMaintenanceService, GcOutcome, IntegrityReport, MaintenanceStatus, RetentionOutcome } from "./snapshot-maintenance";
import type { DriftDetector, DriftReport } from "./drift";
import type { JobDefinition, JobState } from "./scheduler";

export type CycleStepStatus = "ok" | "error" | "skipped";

export interface CycleStep {
  name: string;
  status: CycleStepStatus;
  durationMs: number;
  detail?: string;
}

export interface HealthVerification {
  status: MaintenanceStatus;
  detail: string;
}

export interface MaintenanceCycle {
  cycleId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: MaintenanceStatus;
  steps: CycleStep[];
  retention: RetentionOutcome | null;
  integrity: IntegrityReport | null;
  gc: GcOutcome | null;
  drift: DriftReport | null;
  health: HealthVerification | null;
}

export interface OperationalMetrics {
  totalCycles: number;
  successCount: number;
  failureCount: number;
  degradedPeriods: number;
  skippedJobs: number;
  avgDurationMs: number;
  lastCycleAt: number | null;
}

export interface MaintenanceStatusView {
  running: boolean;
  currentCycle: string | null;
  currentStep: string | null;
  startedAt: number | null;
  metrics: OperationalMetrics;
  lastSuccessfulCycle: MaintenanceCycle | null;
  lastFailedCycle: MaintenanceCycle | null;
  latestCycle: MaintenanceCycle | null;
}

export interface BackgroundMaintenanceDeps {
  maintenance: SnapshotMaintenanceService;
  drift: DriftDetector;
  health: { report(): Promise<{ status: string }> };
  now?: () => number;
}

export class BackgroundMaintenanceService {
  private readonly maintenance: SnapshotMaintenanceService;
  private readonly drift: DriftDetector;
  private readonly healthReporter: BackgroundMaintenanceDeps["health"];
  private readonly nowFn: () => number;
  private readonly journal: MaintenanceCycle[] = [];
  private running = false;
  private currentCycleId: string | null = null;
  private currentStep: string | null = null;
  private startedAt: number | null = null;
  private totalDuration = 0;

  constructor(deps: BackgroundMaintenanceDeps) {
    this.maintenance = deps.maintenance;
    this.drift = deps.drift;
    this.healthReporter = deps.health;
    this.nowFn = deps.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  isRunning(): boolean {
    return this.running;
  }

  // Run one full maintenance cycle. Steps are isolated — a failure in one step
  // marks it error and continues (it never aborts the whole cycle).
  async runCycle(): Promise<MaintenanceCycle> {
    if (this.running) throw new Error("maintenance cycle already running");
    this.running = true;
    const cycleId = randomUUID();
    this.currentCycleId = cycleId;
    this.startedAt = this.now();

    const steps: CycleStep[] = [];
    const exec = async (name: string, fn: () => Promise<void>): Promise<CycleStepStatus> => {
      this.currentStep = name;
      const t0 = this.now();
      try {
        await fn();
        const step: CycleStep = { name, status: "ok", durationMs: this.now() - t0 };
        steps.push(step);
        return "ok";
      } catch (err) {
        const step: CycleStep = {
          name,
          status: "error",
          durationMs: this.now() - t0,
          detail: err instanceof Error ? err.message : String(err),
        };
        steps.push(step);
        return "error";
      }
    };

    let retention: RetentionOutcome | null = null;
    let integrity: IntegrityReport | null = null;
    let gc: GcOutcome | null = null;
    let drift: DriftReport | null = null;
    let health: HealthVerification | null = null;

    const results = {
      retention: () => this.maintenance.runRetention(),
      integrity: () => this.maintenance.runIntegrity(),
      gc: () => this.maintenance.runGc(),
      drift: () => this.drift.detect(),
    };
    const capture = {
      retention: (v: RetentionOutcome) => { retention = v; },
      integrity: (v: IntegrityReport) => { integrity = v; },
      gc: (v: GcOutcome) => { gc = v; },
      drift: (v: DriftReport) => { drift = v; },
      health: (v: HealthVerification) => { health = v; },
    };

    await exec("retention", async () => {
      capture.retention(await results.retention());
    });
    await exec("integrity", async () => {
      capture.integrity(await results.integrity());
    });
    await exec("gc", async () => {
      capture.gc(await results.gc());
    });
    await exec("drift", async () => {
      capture.drift(await results.drift());
    });
    await exec("health", async () => {
      const report = await this.healthReporter.report();
      capture.health({ status: report.status as MaintenanceStatus, detail: `health report status ${report.status}` });
    });

    const finishedAt = this.now();
    const errored = steps.some((s) => s.status === "error");
    const driftReport = drift as DriftReport | null;
    const healthReport = health as HealthVerification | null;
    const cycleStatus: MaintenanceStatus = errored ? "error" : driftReport?.severity === "CRITICAL" || healthReport?.status === "error" ? "degraded" : "ok";

    const cycle: MaintenanceCycle = {
      cycleId,
      startedAt: this.startedAt,
      finishedAt,
      durationMs: finishedAt - this.startedAt,
      status: cycleStatus,
      steps,
      retention,
      integrity,
      gc,
      drift: driftReport,
      health: healthReport,
    };

    this.journal.push(cycle);
    if (this.journal.length > 100) this.journal.shift();
    this.totalDuration += cycle.durationMs;
    this.running = false;
    this.currentCycleId = null;
    this.currentStep = null;
    this.startedAt = null;
    return cycle;
  }

  metrics(): OperationalMetrics {
    const failureCount = this.journal.filter((c) => c.status === "error").length;
    const successCount = this.journal.filter((c) => c.status === "ok").length;
    const degradedPeriods = this.journal.filter((c) => c.status === "degraded").length;
    const skippedJobs = this.journal.reduce((acc, c) => acc + c.steps.filter((s) => s.status === "skipped").length, 0);
    return {
      totalCycles: this.journal.length,
      successCount,
      failureCount,
      degradedPeriods,
      skippedJobs,
      avgDurationMs: this.journal.length > 0 ? this.totalDuration / this.journal.length : 0,
      lastCycleAt: this.journal.length > 0 ? this.journal[this.journal.length - 1].finishedAt : null,
    };
  }

  status(): MaintenanceStatusView {
    const latest = this.journal[this.journal.length - 1] ?? null;
    const lastSuccessful = [...this.journal].reverse().find((c) => c.status === "ok") ?? null;
    const lastFailed = [...this.journal].reverse().find((c) => c.status === "error") ?? null;
    return {
      running: this.running,
      currentCycle: this.currentCycleId,
      currentStep: this.currentStep,
      startedAt: this.startedAt,
      metrics: this.metrics(),
      lastSuccessfulCycle: lastSuccessful,
      lastFailedCycle: lastFailed,
      latestCycle: latest,
    };
  }

  cycleHistory(): readonly MaintenanceCycle[] {
    return [...this.journal];
  }

  // Single lifecycle job on the generic scheduler.
  registerJob(
    scheduler: { register(job: JobDefinition): JobState },
    intervalMs = 30 * 60 * 1000,
  ): JobState {
    return scheduler.register({
      id: "config.maintenance.cycle",
      name: "Config Maintenance Cycle",
      intervalMs,
      enabled: true,
      execute: async () => {
        await this.runCycle();
      },
    });
  }
}
