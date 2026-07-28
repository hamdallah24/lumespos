import type { BusinessCapability, CapabilityRecommendationResult, CapabilityAction } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityManager from "./CapabilityManager";
import * as CapabilityDependency from "./CapabilityDependency";

interface ContextScore {
  action: CapabilityAction;
  capability: BusinessCapability;
  score: number;
  reasons: string[];
}

export function recommendCapabilities(context: Record<string, unknown>, limit: number = 5): CapabilityRecommendationResult[] {
  const scored: ContextScore[] = [];
  const contextKeys = Object.keys(context).map(k => k.toLowerCase());
  const contextValues = Object.values(context).map(v => String(v).toLowerCase());

  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    if (!CapabilityManager.isCapabilityActive(cap.id)) continue;

    for (const action of cap.supportedActions) {
      let score = 0;
      const reasons: string[] = [];

      const matchesContext = action.requiredContext.filter(req =>
        contextKeys.includes(req.toLowerCase())
      );
      if (matchesContext.length > 0) {
        score += matchesContext.length * 15;
        reasons.push(`${matchesContext.length} context matches`);
      }

      const matchesPurpose = contextValues.some(v =>
        action.purpose.toLowerCase().includes(v) ||
        action.whenUsed.toLowerCase().includes(v) ||
        action.name.toLowerCase().includes(v)
      );
      if (matchesPurpose) {
        score += 30;
        reasons.push("Purpose/name matches context");
      }

      const depsSatisfied = CapabilityDependency.areDependenciesSatisfied(cap.id);
      if (depsSatisfied) {
        score += 10;
      } else {
        score -= 20;
        reasons.push("Dependencies not fully satisfied");
      }

      if (action.riskLevel === "low") score += 5;
      if (action.riskLevel === "critical") score -= 10;

      if (score > 0) {
        scored.push({ action, capability: cap, score, reasons });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => ({
    capabilityId: s.capability.id,
    action: s.action.name,
    score: Math.round((s.score / 100) * 100) / 100,
    reason: s.reasons.join("; "),
    requiredApproval: s.action.approvalLevel,
    riskLevel: s.action.riskLevel,
    dependencies: s.capability.dependencies,
  }));
}

export function recommendByObjective(objective: string, limit: number = 5): CapabilityRecommendationResult[] {
  const scored: ContextScore[] = [];
  const lower = objective.toLowerCase();

  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    if (!CapabilityManager.isCapabilityActive(cap.id)) continue;

    for (const action of cap.supportedActions) {
      let score = 0;
      const reasons: string[] = [];

      if (cap.description.toLowerCase().includes(lower)) {
        score += 20;
        reasons.push("Capability description matches objective");
      }

      if (action.purpose.toLowerCase().includes(lower) || action.whenUsed.toLowerCase().includes(lower)) {
        score += 25;
        reasons.push("Action purpose matches objective");
      }

      if (cap.tags.some(t => t.toLowerCase().includes(lower))) {
        score += 10;
        reasons.push("Tag matches objective");
      }

      if (cap.domain.toLowerCase().includes(lower)) {
        score += 5;
      }

      if (score > 0) {
        scored.push({ action, capability: cap, score, reasons });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => ({
    capabilityId: s.capability.id,
    action: s.action.name,
    score: Math.round((s.score / 100) * 100) / 100,
    reason: s.reasons.join("; "),
    requiredApproval: s.action.approvalLevel,
    riskLevel: s.action.riskLevel,
    dependencies: s.capability.dependencies,
  }));
}

export function getTopRecommendations(executive: string, limit: number = 5): CapabilityRecommendationResult[] {
  const caps = CapabilityRegistry.getCapabilitiesByExecutive(executive).filter(c => CapabilityManager.isCapabilityActive(c.id));
  const results: CapabilityRecommendationResult[] = [];

  for (const cap of caps) {
    for (const action of cap.supportedActions) {
      const depsSatisfied = CapabilityDependency.areDependenciesSatisfied(cap.id);
      results.push({
        capabilityId: cap.id,
        action: action.name,
        score: depsSatisfied ? 0.8 : 0.4,
        reason: depsSatisfied ? "Capability ready and dependencies satisfied" : "Dependencies not fully satisfied",
        requiredApproval: action.approvalLevel,
        riskLevel: action.riskLevel,
        dependencies: cap.dependencies,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
