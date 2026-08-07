// ConfigCenter — Milestone 4 Phase 2: Automatic Snapshot Maintenance.
// ADDITIVE automation layer. Consumes ONLY the locked public surfaces of
// SnapshotManager (retentionCandidates / runGc / verify / getRetentionPolicy /
// list). Never touches Registry, Store, Resolver, Pipeline or the snapshot
// internals (GarbageCollector, RetentionManager, persistence are NOT imported).
// All jobs are registered through the generic BackgroundScheduler — there is no
// dedicated scheduler. Each cycle emits a MaintenanceReport (correlationId +
// duration) and a brief health status; it never changes the Live Health API
// contract (it only exposes an in-memory sink a dashboard can read).

import { randomUUID } from "crypto";
import type { SnapshotManager } from "../api/snapshots";
import type { RetentionPolicy } from "../api/snapshot";
import type { JobDefinition, JobState } from "./scheduler";

export type MaintenanceStatus = "ok" | "degraded" | "error";

export interface RetentionOutcome {
  policy: RetentionPolicy;
  candidates: number;
  candidateIds: string[];
}

export interface IntegrityFailure {
  snapshotId: string;
  name: string;
  reasons: string[];
}

export interface IntegrityReport {
  checked: number;
  failures: IntegrityFailure[];
  ok: boolean;
}

export interface GcOutcome {
  collected: number;
  snapshotIds: string[];
  skippedPinned: number;
  skippedReferenced: number;
}

export interface MaintenanceReport {
  cycleId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: MaintenanceStatus;
  retention: RetentionOutcome;
  integrity: IntegrityReport;
  gc: GcOutcome;
}

export interface MaintenanceHealthStatus {
  status: MaintenanceStatus;
  cycleId: string;
  at: number;
  integrityFailures: number;
  collected: number;
}

export interface SnapshotMaintenanceDeps {
  snapshots: SnapshotManager;
  now?: () => number;
}

export interface MaintenanceJobIntervals {
  retentionMs?: number;
  integrityMs?: number;
  gcMs?: number;
}

export class SnapshotMaintenanceService {
  private readonly snapshots: SnapshotManager;
  private readonly nowFn: () => number;
  private counter = 0;
  private lastReport: MaintenanceReport | null = null;
  private readonly reportJournal: MaintenanceReport[] = [];

  constructor(deps: SnapshotMaintenanceDeps) {
    this.snapshots = deps.snapshots;
    this.nowFn = deps.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  // Phase 2.1 — retention analysis (pure read; nothing is deleted here).
  async runRetention(): Promise<RetentionOutcome> {
    const policy = this.snapshots.getRetentionPolicy();
    const candidates = this.snapshots.retentionCandidates();
    return {
      policy: { ...policy },
      candidates: candidates.length,
      candidateIds: candidates.map((s) => s.id),
    };
  }

  // Phase 2.3 — integrity verification. VERIFIES ONLY, never restores.
  async runIntegrity(): Promise<IntegrityReport> {
    const all = this.snapshots.list();
    const failures: IntegrityFailure[] = [];
    for (const snap of all) {
      const verification = await this.snapshots.verify(snap.id);
      if (!verification.ok) {
        failures.push({ snapshotId: snap.id, name: snap.name, reasons: verification.reasons });
      }
    }
    return { checked: all.length, failures, ok: failures.length === 0 };
  }

  // Phase 2.2 — garbage collection via the LOCKED SnapshotManager.runGc().
  async runGc(): Promise<GcOutcome> {
    const event = await this.snapshots.runGc();
    return {
      collected: event.collected,
      snapshotIds: [...event.snapshotIds],
      skippedPinned: event.skippedPinned,
      skippedReferenced: event.skippedReferenced,
    };
  }

  // Phase 2.4 — one full maintenance cycle → MaintenanceReport.
  async runMaintenanceCycle(): Promise<MaintenanceReport> {
    const startedAt = this.now();
    const cycleId = randomUUID();
    const retention = await this.runRetention();
    const integrity = await this.runIntegrity();
    const gc = await this.runGc();
    const finishedAt = this.now();
    const status: MaintenanceStatus = integrity.ok ? "ok" : "degraded";
    const report: MaintenanceReport = {
      cycleId,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      status,
      retention,
      integrity,
      gc,
    };
    this.lastReport = report;
    this.reportJournal.push(report);
    if (this.reportJournal.length > 50) this.reportJournal.shift();
    return report;
  }

  // Brief health sink — a read-only surface a dashboard can consume. It does NOT
  // modify the locked Live Health API; it only reflects the last cycle outcome.
  healthStatus(): MaintenanceHealthStatus {
    const r = this.lastReport;
    return {
      status: r?.status ?? "ok",
      cycleId: r?.cycleId ?? "",
      at: r?.finishedAt ?? this.now(),
      integrityFailures: r?.integrity.failures.length ?? 0,
      collected: r?.gc.collected ?? 0,
    };
  }

  lastReportValue(): MaintenanceReport | null {
    return this.lastReport ? { ...this.lastReport } : null;
  }

  history(): readonly MaintenanceReport[] {
    return [...this.reportJournal];
  }

  // Phase 2.6 — register ALL maintenance jobs through the generic scheduler.
  registerJobs(
    scheduler: { register(job: JobDefinition): JobState },
    intervals: MaintenanceJobIntervals = {},
  ): JobState[] {
    return [
      scheduler.register({
        id: "snapshot.maintenance.retention",
        name: "Snapshot Retention",
        intervalMs: intervals.retentionMs ?? 60 * 60 * 1000,
        enabled: true,
        execute: async () => {
          await this.runRetention();
        },
      }),
      scheduler.register({
        id: "snapshot.maintenance.integrity",
        name: "Snapshot Integrity Verification",
        intervalMs: intervals.integrityMs ?? 24 * 60 * 60 * 1000,
        enabled: true,
        execute: async () => {
          await this.runIntegrity();
        },
      }),
      scheduler.register({
        id: "snapshot.maintenance.gc",
        name: "Snapshot Garbage Collection",
        intervalMs: intervals.gcMs ?? 24 * 60 * 60 * 1000,
        enabled: true,
        execute: async () => {
          await this.runGc();
        },
      }),
    ];
  }
}
