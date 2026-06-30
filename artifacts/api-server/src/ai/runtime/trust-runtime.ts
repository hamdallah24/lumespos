// SPRINT 14: Trust Runtime — reputation scoring per agent
// Based on objective metrics: deployment success, proposal acceptance, bugs introduced

import type { AgentIdentity } from "./identity";

interface TrustRecord {
  agentId: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    proposalsSubmitted: number;
    proposalsAccepted: number;
    deploymentsAttempted: number;
    deploymentsSuccessful: number;
    bugsIntroduced: number;
    avgResponseTimeMs: number;
  };
  score: number;           // 0-100, computed periodically
  lastUpdated: string;
}

const _trustRecords = new Map<string, TrustRecord>();

/** Initialize trust record for an agent */
export function initTrust(identity: AgentIdentity): TrustRecord {
  const record: TrustRecord = {
    agentId: identity.id,
    metrics: {
      totalTasks: 0, completedTasks: 0, failedTasks: 0,
      proposalsSubmitted: 0, proposalsAccepted: 0,
      deploymentsAttempted: 0, deploymentsSuccessful: 0,
      bugsIntroduced: 0, avgResponseTimeMs: 0,
    },
    score: identity.trustScore, // Start from identity baseline
    lastUpdated: new Date().toISOString(),
  };
  _trustRecords.set(identity.id, record);
  return record;
}

/** Record a task completion */
export function recordTaskCompletion(agentId: string, success: boolean): void {
  const record = _trustRecords.get(agentId);
  if (!record) return;
  record.metrics.totalTasks++;
  if (success) record.metrics.completedTasks++;
  else record.metrics.failedTasks++;
  recomputeScore(record);
}

/** Record a proposal result */
export function recordProposal(agentId: string, accepted: boolean): void {
  const record = _trustRecords.get(agentId);
  if (!record) return;
  record.metrics.proposalsSubmitted++;
  if (accepted) record.metrics.proposalsAccepted++;
  recomputeScore(record);
}

/** Record a deployment */
export function recordDeployment(agentId: string, success: boolean): void {
  const record = _trustRecords.get(agentId);
  if (!record) return;
  record.metrics.deploymentsAttempted++;
  if (success) record.metrics.deploymentsSuccessful++;
  else record.metrics.bugsIntroduced++;
  recomputeScore(record);
}

function recomputeScore(record: TrustRecord): void {
  const m = record.metrics;
  if (m.totalTasks === 0) return;

  const taskRate = m.completedTasks / Math.max(m.totalTasks, 1);
  const proposalRate = m.proposalsSubmitted > 0 ? m.proposalsAccepted / m.proposalsSubmitted : 0.5;
  const deployRate = m.deploymentsAttempted > 0 ? m.deploymentsSuccessful / m.deploymentsAttempted : 0.5;
  const bugPenalty = 1 - Math.min(m.bugsIntroduced / Math.max(m.totalTasks, 1), 0.5);

  record.score = Math.round(
    (taskRate * 30 + proposalRate * 20 + deployRate * 30 + bugPenalty * 20)
  );
  record.lastUpdated = new Date().toISOString();
}

/** Get trust score for an agent */
export function getTrust(agentId: string): number {
  return _trustRecords.get(agentId)?.score ?? 50;
}

/** Get full trust record */
export function getTrustRecord(agentId: string): TrustRecord | null {
  return _trustRecords.get(agentId) || null;
}

/** Get all trust records */
export function allTrustScores(): { agentId: string; score: number }[] {
  return [..._trustRecords.values()].map(r => ({ agentId: r.agentId, score: r.score }));
}

export const trustRuntime = {
  name: "TrustRuntime",
  version: "1.0.0",
  capabilities: ["reputation-scoring", "performance-tracking", "trust-based-routing"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
