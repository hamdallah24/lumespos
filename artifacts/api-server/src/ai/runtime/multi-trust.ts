// SPRINT 16: Multi-dimensional Trust — not just a score
// Technical accuracy, proposal quality, deployment reliability, communication, security, response time

import type { AgentIdentity } from "./identity";

interface MultiTrustRecord {
  agentId: string;
  dimensions: {
    technicalAccuracy: number;      // 0-100 — how often fixes work
    proposalQuality: number;        // 0-100 — proposal acceptance rate
    deploymentReliability: number;  // 0-100 — deployment success rate
    communication: number;          // 0-100 — collaboration quality
    securityCompliance: number;     // 0-100 — never violates policies
    responseTime: number;           // 0-100 — speed rating (100 = fastest)
  };
  overall: number;                  // weighted average
  totalEvaluations: number;
  lastUpdated: string;
}

const _multiTrust = new Map<string, MultiTrustRecord>();

/** Initialize multi-dimensional trust */
export function initMultiTrust(identity: AgentIdentity): MultiTrustRecord {
  const base = identity.trustScore;
  const record: MultiTrustRecord = {
    agentId: identity.id,
    dimensions: {
      technicalAccuracy: base,
      proposalQuality: base,
      deploymentReliability: base,
      communication: base,
      securityCompliance: 100, // Start perfect, degrade on violation
      responseTime: 80,
    },
    overall: base,
    totalEvaluations: 0,
    lastUpdated: new Date().toISOString(),
  };
  _multiTrust.set(identity.id, record);
  return record;
}

/** Update a specific trust dimension */
export function rateDimension(
  agentId: string,
  dimension: keyof MultiTrustRecord["dimensions"],
  value: number,
): void {
  const record = _multiTrust.get(agentId);
  if (!record) return;

  // Weighted running average: 30% old, 70% new
  const old = record.dimensions[dimension];
  record.dimensions[dimension] = Math.round(old * 0.3 + value * 0.7);
  record.totalEvaluations++;

  // Recompute overall
  const d = record.dimensions;
  record.overall = Math.round(
    d.technicalAccuracy * 0.30 +
    d.proposalQuality * 0.20 +
    d.deploymentReliability * 0.25 +
    d.communication * 0.10 +
    d.securityCompliance * 0.10 +
    d.responseTime * 0.05
  );
  record.lastUpdated = new Date().toISOString();
}

/** Get multi-dimensional trust */
export function getMultiTrust(agentId: string): MultiTrustRecord | null {
  return _multiTrust.get(agentId) || null;
}

/** Find best agent for a specific capability */
export function bestFor(
  capability: string,
  agents: AgentIdentity[],
): { agent: AgentIdentity; trust: MultiTrustRecord } | null {
  let best: { agent: AgentIdentity; trust: MultiTrustRecord } | null = null;

  for (const agent of agents) {
    const trust = _multiTrust.get(agent.id);
    if (!trust) continue;

    // Map capability to trust dimension
    let score = trust.overall;
    if (capability === "deploy") score = trust.dimensions.deploymentReliability;
    if (capability === "analyzeCode") score = trust.dimensions.technicalAccuracy;
    if (capability === "propose") score = trust.dimensions.proposalQuality;

    if (!best || score > best.trust.overall) {
      best = { agent, trust };
    }
  }

  return best;
}

export const multiTrustRuntime = {
  name: "MultiTrustRuntime",
  version: "1.0.0",
  capabilities: ["multidimensional-trust", "capability-based-routing", "performance-analytics"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
