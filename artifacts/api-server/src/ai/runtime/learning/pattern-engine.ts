// ECP-033.5: Pattern Engine — detects success/failure patterns
// Frozen. "Database decisions fail 72%. Microservice decisions succeed 98%."

import type { LearningPattern } from "./learning-types";
import { learningStorage } from "./learning-storage";

let _counter = 0;

class PatternEngine {
  detect(): LearningPattern[] {
    const outcomes = learningStorage.getOutcomes();
    if (outcomes.length < 10) return [];

    const patterns: LearningPattern[] = [];

    // Domain pattern: group by decision keywords
    const domainSuccess = new Map<string, { success: number; total: number }>();
    for (const o of outcomes) {
      const domain = this.extractDomain(o.decision);
      if (!domainSuccess.has(domain)) domainSuccess.set(domain, { success: 0, total: 0 });
      const entry = domainSuccess.get(domain)!;
      entry.total++;
      if (o.actualOutcome === "SUCCESS") entry.success++;
    }

    for (const [domain, data] of domainSuccess) {
      if (data.total < 5) continue;
      const rate = Math.round((data.success / data.total) * 100);
      if (rate < 75) {
        _counter++;
        const pattern: LearningPattern = {
          id: `pattern-${_counter}`, type: "domain_pattern",
          description: `${domain} decisions succeed only ${rate}% of the time (${data.total} attempts)`,
          evidenceIds: outcomes.filter(o => this.extractDomain(o.decision) === domain).slice(0, 5).map(o => o.decisionId),
          confidence: 85, occurrences: data.total,
          firstDetected: outcomes[0]?.timestamp || "", lastDetected: outcomes[outcomes.length - 1]?.timestamp || "",
          impact: rate < 50 ? "high" : "medium",
          recommendation: rate < 50 ? `Consider adding specialist runtime for ${domain}` : `Review ${domain} decision process`,
        };
        patterns.push(pattern);
        learningStorage.storePattern(pattern);
      }
    }

    // Runtime overconfidence pattern
    const runtimeConfidence = new Map<string, { over: number; total: number }>();
    for (const o of outcomes) {
      if (!runtimeConfidence.has(o.runtime)) runtimeConfidence.set(o.runtime, { over: 0, total: 0 });
      const entry = runtimeConfidence.get(o.runtime)!;
      entry.total++;
      if (o.confidence > 80 && o.actualOutcome !== "SUCCESS") entry.over++;
    }

    for (const [runtime, data] of runtimeConfidence) {
      if (data.total < 5) continue;
      const overRate = Math.round((data.over / data.total) * 100);
      if (overRate > 25) {
        _counter++;
        const pattern: LearningPattern = {
          id: `pattern-${_counter}`, type: "confidence_bias",
          description: `${runtime} is overconfident: ${data.over}/${data.total} high-confidence decisions failed`,
          evidenceIds: outcomes.filter(o => o.runtime === runtime && o.confidence > 80 && o.actualOutcome !== "SUCCESS").slice(0, 3).map(o => o.decisionId),
          confidence: 90, occurrences: data.over,
          firstDetected: outcomes[0]?.timestamp || "", lastDetected: outcomes[outcomes.length - 1]?.timestamp || "",
          impact: "high",
          recommendation: `Calibrate ${runtime} confidence estimates downward`,
        };
        patterns.push(pattern);
        learningStorage.storePattern(pattern);
      }
    }

    return patterns;
  }

  private extractDomain(decision: string): string {
    const lower = decision.toLowerCase();
    if (lower.includes("database") || lower.includes("db")) return "Database";
    if (lower.includes("deploy") || lower.includes("server")) return "Deployment";
    if (lower.includes("foundation") || lower.includes("policy")) return "Governance";
    if (lower.includes("architecture") || lower.includes("refactor")) return "Architecture";
    if (lower.includes("security") || lower.includes("auth")) return "Security";
    if (lower.includes("inventory") || lower.includes("stock")) return "Inventory";
    return "General";
  }
}

export const patternEngine = new PatternEngine();
