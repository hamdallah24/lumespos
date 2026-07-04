// ECP-046 Sprint 3: Executive Auditor
// Audits per-executive performance. Rate-limited — not every cycle.

import type { ExecutiveRole, ExecutiveAudit } from "./governance-types";
import { executiveReputationTracker } from "../intelligence/executive-reputation";
import { learningEngine } from "../learning/learning-engine";

const AUDIT_INTERVAL_MS = 30000; // Minimum time between audits
const STRENGTH_THRESHOLD = 70;
const WEAKNESS_THRESHOLD = 40;

export class ExecutiveAuditor {
  private lastAudit: Map<string, number> = new Map();

  /** Audit single executive */
  audit(executive: ExecutiveRole): ExecutiveAudit {
    const rep = executiveReputationTracker.get(executive);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const actions: string[] = [];

    // Strengths
    if (rep.accuracy >= STRENGTH_THRESHOLD) strengths.push("High accuracy");
    if (rep.successRate >= STRENGTH_THRESHOLD) strengths.push("High success rate");
    if (rep.confidence >= STRENGTH_THRESHOLD) strengths.push("High confidence");
    if (rep.specialties.length >= 3) strengths.push(`Domain expertise: ${rep.specialties.join(", ")}`);
    if (rep.experience >= 10) strengths.push("Experienced");

    // Weaknesses
    if (rep.accuracy < WEAKNESS_THRESHOLD) weaknesses.push("Low accuracy — needs verification");
    if (rep.successRate < WEAKNESS_THRESHOLD) weaknesses.push("Low success rate — review strategy");
    if (rep.confidence < WEAKNESS_THRESHOLD) weaknesses.push("Low confidence — add training");
    if (rep.specialties.length === 0) weaknesses.push("No specialized domain");
    if (rep.experience < 3) weaknesses.push("Low experience — pair with senior executive");

    // Action items
    if (rep.accuracy < WEAKNESS_THRESHOLD) actions.push("Add verification gate before execution");
    if (rep.successRate < WEAKNESS_THRESHOLD) actions.push("Review last 5 missions for failure patterns");
    if (rep.confidence < WEAKNESS_THRESHOLD) actions.push("Cross-train from best executive in domain");
    if (rep.specialties.length === 0 && rep.experience >= 5) actions.push("Assign domain-specific missions");
    if (strengths.length >= 3) actions.push("Consider as mentor for junior executives");

    // Trend
    const recent = rep.history.slice(-5);
    const recentSuccess = recent.filter(h => h.outcome === "SUCCESS").length;
    const older = rep.history.slice(-10, -5);
    const olderSuccess = older.filter(h => h.outcome === "SUCCESS").length;
    let trend: "IMPROVING" | "STABLE" | "DECLINING" = "STABLE";
    if (older.length >= 3 && recent.length >= 3) {
      if (recentSuccess > olderSuccess) trend = "IMPROVING";
      else if (recentSuccess < olderSuccess) trend = "DECLINING";
    }

    return {
      executive,
      score: Math.round((rep.confidence + rep.accuracy + rep.successRate) / 3),
      strengths,
      weaknesses,
      actions,
      recentMissions: rep.experience,
      trend,
      auditedAt: new Date().toISOString(),
    };
  }

  /** Audit all executives */
  auditAll(): ExecutiveAudit[] {
    const execs: ExecutiveRole[] = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    const results: ExecutiveAudit[] = [];
    const now = Date.now();

    for (const exec of execs) {
      const last = this.lastAudit.get(exec) || 0;
      if (now - last < AUDIT_INTERVAL_MS) {
        // Return cached if recently audited
        continue;
      }
      this.lastAudit.set(exec, now);
      results.push(this.audit(exec));
    }

    return results;
  }
}

export const executiveAuditor = new ExecutiveAuditor();
