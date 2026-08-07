// ConfigCenter — Milestone 4 Phase 3: Drift Detection.
// ADDITIVE automation layer. Answers: "is the current effective state still the
// state it should be?" It compares the latest Snapshot baseline (expected) vs
// the Resolver's current effective output (actual) and classifies the delta.
//
// Dependency boundary (M4 Rule 4): the detector never touches Resolver internals —
// it reads through the SDK's ConfigResolver.effective(). Registry is read only for
// field criticality (classification). Everything is read-only: no Store write, no
// pipeline invocation, no restore. A single job is registered via the generic
// BackgroundScheduler.

import { randomUUID } from "crypto";
import type { ConfigurationRegistry } from "../registry";
import type { SnapshotManager } from "../api/snapshots";
import type { ConfigResolver } from "../sdk";
import type { ConfigScope, ConfigValue, ResolutionContext } from "../types";
import type { JobDefinition, JobState } from "./scheduler";

export type DriftSeverity = "NONE" | "WARNING" | "CRITICAL";

export interface DriftBaselineInfo {
  present: boolean;
  snapshotId: string | null;
  name: string | null;
  revisionNo: number | null;
}

export interface DriftEntry {
  key: string;
  expected: ConfigValue;
  current: ConfigValue;
  changed: boolean;
  criticality: "low" | "medium" | "high" | "critical";
}

export interface DriftReport {
  cycleId: string;
  detectedAt: number;
  severity: DriftSeverity;
  baseline: DriftBaselineInfo;
  scope: ConfigScope;
  baselineRevision: number;
  changes: DriftEntry[];
  affectedKeys: string[];
  recommendation: string;
}

export interface DriftDetectorDeps {
  snapshots: SnapshotManager;
  resolver: ConfigResolver;
  registry: ConfigurationRegistry;
  now?: () => number;
}

// Derive a ResolutionContext from a ConfigScope (same projection the snapshot
// layer uses when capturing; local copy keeps this module additive).
function contextFor(scope: ConfigScope): ResolutionContext {
  return {
    workspaceId: scope.type === "workspace" ? scope.workspaceId ?? null : null,
    branchId: scope.type === "branch" ? scope.branchId ?? null : null,
    executiveRole: scope.type === "executive" ? scope.executiveRole ?? null : null,
  };
}

function classify(changes: DriftEntry[]): DriftSeverity {
  if (changes.length === 0) return "NONE";
  if (changes.some((c) => c.criticality === "high" || c.criticality === "critical")) {
    return "CRITICAL";
  }
  return "WARNING";
}

export class DriftDetector {
  private readonly snapshots: SnapshotManager;
  private readonly resolver: ConfigResolver;
  private readonly registry: ConfigurationRegistry;
  private readonly nowFn: () => number;
  private readonly history: DriftReport[] = [];
  private lastReport: DriftReport | null = null;

  constructor(deps: DriftDetectorDeps) {
    this.snapshots = deps.snapshots;
    this.resolver = deps.resolver;
    this.registry = deps.registry;
    this.nowFn = deps.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  // Baseline = most recent snapshot (list() is sorted newest-first).
  private baseline() {
    const latest = this.snapshots.list()[0] ?? null;
    if (!latest) {
      return {
        info: { present: false, snapshotId: null, name: null, revisionNo: null } as DriftBaselineInfo,
        payload: {} as Record<string, ConfigValue>,
        scope: { type: "default" } as ConfigScope,
      };
    }
    return {
      info: {
        present: true,
        snapshotId: latest.id,
        name: latest.name,
        revisionNo: latest.revisionNo,
      } as DriftBaselineInfo,
      payload: latest.payload,
      scope: latest.scope,
    };
  }

  async detect(): Promise<DriftReport> {
    const { info, payload: expected, scope } = this.baseline();
    if (!info.present) {
      const none: DriftReport = {
        cycleId: randomUUID(),
        detectedAt: this.now(),
        severity: "NONE",
        baseline: info,
        scope: { ...scope },
        baselineRevision: 0,
        changes: [],
        affectedKeys: [],
        recommendation: "No baseline snapshot yet — capture a snapshot to enable drift detection.",
      };
      this.lastReport = none;
      this.history.push(none);
      return none;
    }
    const current = await this.resolver.effective(contextFor(scope));

    const keys = new Set([...Object.keys(expected), ...Object.keys(current)]);
    const changes: DriftEntry[] = [];
    for (const key of keys) {
      const ev = expected[key];
      const cv = current[key];
      const changed = JSON.stringify(ev) !== JSON.stringify(cv);
      if (!changed) continue;
      const meta = this.registry.get(key);
      changes.push({
        key,
        expected: ev,
        current: cv,
        changed,
        criticality: meta?.criticality ?? "low",
      });
    }

    const severity = classify(changes);
    const report: DriftReport = {
      cycleId: randomUUID(),
      detectedAt: this.now(),
      severity,
      baseline: info,
      scope: { ...scope },
      baselineRevision: info.revisionNo ?? 0,
      changes,
      affectedKeys: changes.map((c) => c.key),
      recommendation: this.recommendation(severity, changes.length),
    };
    this.lastReport = report;
    this.history.push(report);
    if (this.history.length > 50) this.history.shift();
    return report;
  }

  private recommendation(severity: DriftSeverity, count: number): string {
    switch (severity) {
      case "NONE":
        return "No drift detected — current effective state matches the latest baseline.";
      case "WARNING":
        return `Detected ${count} non-critical change(s) — review before the next maintenance window.`;
      case "CRITICAL":
        return `Detected ${count} high/critical change(s) — immediate review and reconciliation recommended.`;
    }
  }

  status(): DriftReport | null {
    return this.lastReport ? { ...this.lastReport } : null;
  }

  reportHistory(): readonly DriftReport[] {
    return [...this.history];
  }

  // Phase 3.6 — one additional job through the generic scheduler.
  registerJob(
    scheduler: { register(job: JobDefinition): JobState },
    intervalMs = 5 * 60 * 1000,
  ): JobState {
    return scheduler.register({
      id: "config.drift.detection",
      name: "Config Drift Detection",
      intervalMs,
      enabled: true,
      execute: async () => {
        await this.detect();
      },
    });
  }
}
