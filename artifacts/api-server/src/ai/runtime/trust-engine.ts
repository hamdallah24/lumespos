// Phase II Wave 6: Trust Runtime — reputation scoring, history tracking
// Multi-dimensional trust: technical accuracy, deployment reliability, proposal quality, security

import { organizationEngine } from "./organization-engine";

interface TrustRecord {
  runtimeId: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    proposalsSubmitted: number;
    proposalsAccepted: number;
    deploymentsAttempted: number;
    deploymentsSuccessful: number;
    bugsIntroduced: number;
    avgResponseMs: number;
  };
  dimensions: {
    technicalAccuracy: number;     // Code quality, bug rate
    deploymentReliability: number; // Deploy success rate
    proposalQuality: number;       // Proposal acceptance rate
    communication: number;         // Collaboration quality
    securityCompliance: number;    // Policy violations
    responseTime: number;          // Speed rating
  };
  overall: number;
  history: string[];  // Recent activity log
  lastUpdated: string;
}

class TrustRuntime {
  private records = new Map<string, TrustRecord>();

  /** Initialize trust for a Runtime */
  init(runtimeId: string): TrustRecord {
    const record: TrustRecord = {
      runtimeId,
      metrics: {
        totalTasks: 0, completedTasks: 0, failedTasks: 0,
        proposalsSubmitted: 0, proposalsAccepted: 0,
        deploymentsAttempted: 0, deploymentsSuccessful: 0,
        bugsIntroduced: 0, avgResponseMs: 0,
      },
      dimensions: {
        technicalAccuracy: 85,
        deploymentReliability: 85,
        proposalQuality: 85,
        communication: 85,
        securityCompliance: 100,
        responseTime: 80,
      },
      overall: 86,
      history: [],
      lastUpdated: new Date().toISOString(),
    };
    this.records.set(runtimeId, record);
    return record;
  }

  /** Record task completion */
  recordTask(runtimeId: string, success: boolean, responseMs = 0): void {
    const record = this.records.get(runtimeId) || this.init(runtimeId);
    record.metrics.totalTasks++;
    if (success) record.metrics.completedTasks++;
    else record.metrics.failedTasks++;
    if (responseMs > 0) {
      record.metrics.avgResponseMs = Math.round(
        (record.metrics.avgResponseMs * (record.metrics.totalTasks - 1) + responseMs) / record.metrics.totalTasks
      );
    }
    record.history.push(`[${new Date().toISOString().slice(0, 19)}] Task ${success ? "✅" : "❌"}`);
    if (record.history.length > 20) record.history.shift();
    this.recompute(record);
  }

  /** Record proposal result */
  recordProposal(runtimeId: string, accepted: boolean): void {
    const record = this.records.get(runtimeId) || this.init(runtimeId);
    record.metrics.proposalsSubmitted++;
    if (accepted) record.metrics.proposalsAccepted++;
    record.history.push(`[${new Date().toISOString().slice(0, 19)}] Proposal ${accepted ? "✅" : "❌"}`);
    this.recompute(record);
  }

  /** Record deployment */
  recordDeployment(runtimeId: string, success: boolean): void {
    const record = this.records.get(runtimeId) || this.init(runtimeId);
    record.metrics.deploymentsAttempted++;
    if (success) record.metrics.deploymentsSuccessful++;
    else record.metrics.bugsIntroduced++;
    record.history.push(`[${new Date().toISOString().slice(0, 19)}] Deploy ${success ? "✅" : "❌"}`);
    this.recompute(record);
  }

  /** Record security violation */
  recordViolation(runtimeId: string): void {
    const record = this.records.get(runtimeId) || this.init(runtimeId);
    record.dimensions.securityCompliance = Math.max(0, record.dimensions.securityCompliance - 5);
    record.history.push(`[${new Date().toISOString().slice(0, 19)}] ⚠️ Policy violation`);
    this.recompute(record);
  }

  /** Get trust for a runtime */
  get(runtimeId: string): TrustRecord | null {
    return this.records.get(runtimeId) || null;
  }

  /** Get trust summary for all runtimes */
  summary(): { runtimeId: string; runtime: string; overall: number; health: string }[] {
    return [...this.records.entries()].map(([id, record]) => {
      const rt = organizationEngine.find(id);
      return {
        runtimeId: id,
        runtime: rt?.runtime || id,
        overall: record.overall,
        health: rt?.health || "unknown",
      };
    }).sort((a, b) => b.overall - a.overall);
  }

  /** Best Runtime for a capability */
  bestFor(capability: string, ignoreHealth = false): string | null {
    const eligible = this.summary().filter(r => {
      if (!ignoreHealth && r.health !== "Healthy" && r.health !== "Busy") return false;
      return true;
    });

    // Weight by trust for deployment, technical for code
    const sorted = eligible.sort((a, b) => {
      if (capability === "deploy") {
        const aRecord = this.records.get(a.runtimeId);
        const bRecord = this.records.get(b.runtimeId);
        return (bRecord?.dimensions.deploymentReliability || 0) - (aRecord?.dimensions.deploymentReliability || 0);
      }
      return b.overall - a.overall;
    });

    return sorted[0]?.runtimeId || null;
  }

  private recompute(record: TrustRecord): void {
    const m = record.metrics;
    const d = record.dimensions;

    if (m.totalTasks > 0) {
      d.technicalAccuracy = Math.round(m.completedTasks / m.totalTasks * 90 + 10);
    }
    if (m.proposalsSubmitted > 0) {
      d.proposalQuality = Math.round(m.proposalsAccepted / m.proposalsSubmitted * 90 + 10);
    }
    if (m.deploymentsAttempted > 0) {
      d.deploymentReliability = Math.round(m.deploymentsSuccessful / m.deploymentsAttempted * 90 + 10);
    }
    d.responseTime = Math.min(100, Math.round(100 - (m.avgResponseMs / 100)));
    // Rolling average: 30% old, 70% new for dimensions
    // Overall = weighted average
    record.overall = Math.round(
      d.technicalAccuracy * 0.30 +
      d.deploymentReliability * 0.25 +
      d.proposalQuality * 0.20 +
      d.securityCompliance * 0.15 +
      d.communication * 0.05 +
      d.responseTime * 0.05
    );
    record.lastUpdated = new Date().toISOString();
  }
}

const trustRuntime = new TrustRuntime();

export { trustRuntime };
export type { TrustRecord };

export const trustRuntimeComponent = {
  name: "TrustRuntime",
  version: "1.0.0",
  capabilities: ["trust-scoring", "reputation-tracking", "deployment-metrics", "security-compliance"],
  dependencies: ["OrganizationRuntime"],

  health: () => {
    const s = trustRuntime.summary();
    return {
      status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
      custom: { trackedRuntimes: s.length, avgTrust: s.length > 0 ? Math.round(s.reduce((sum, r) => sum + r.overall, 0) / s.length) : 0 },
    };
  },

  init: (id: string) => trustRuntime.init(id),
  recordTask: (id: string, success: boolean, ms?: number) => trustRuntime.recordTask(id, success, ms),
  recordProposal: (id: string, accepted: boolean) => trustRuntime.recordProposal(id, accepted),
  recordDeployment: (id: string, success: boolean) => trustRuntime.recordDeployment(id, success),
  recordViolation: (id: string) => trustRuntime.recordViolation(id),
  get: (id: string) => trustRuntime.get(id),
  summary: () => trustRuntime.summary(),
  bestFor: (cap: string) => trustRuntime.bestFor(cap),
};
