import type { RuntimeContext } from './types';
import { mapContextForRole } from '../executive-context/ExecutiveContextAdapter';
import type { CapabilityExecutiveContext, CapabilityContextEntry, CapabilityDomain } from '../business-os/capabilities/types';
import { getAllCapabilities, getCapabilitiesByDomain, recommendCapabilities, getDependencies, getDependents, getCapabilityById } from '../business-os/capabilities';
import type { BIContext } from '../business-os/bi/context/BIContext';

export interface ExecutiveContext {
  intent: { intent: string; confidence: number };
  domain: { primaryDomain: string };
  confidence: { overall: number; requiresClarification: boolean; clarificationReason?: string };
  knowledge: { entries: { id: string; content: string; confidence: number; source: string }[] };
  memory: { query: { text: string; type: string } | null };
  operational: { context: Record<string, unknown> | null };
  repository: { topFiles: { path: string; confidence: number }[] };
  awareness?: { situation: string; health: string; score: number; nextAction: string; businessRisk: string; systemHealth: string };
  refinement?: { wasRefined: boolean; iterations: number; confidenceDelta: number; resolvedIssues: string[]; remainingIssues: string[] };
  contextual?: Record<string, unknown>;
  capabilities?: CapabilityExecutiveContext;
  businessIntelligence?: BIContext;
}

export function mapToExecutive(rc: RuntimeContext, targetExecutive?: string, biContext?: BIContext): ExecutiveContext {
  const overall = rc.runtime.confidence.overall;
  const risk = rc.intelligence.risk;
  const aw = rc.awareness;

  const capabilities = buildCapabilityContext(rc, targetExecutive);

  const execCtx = {
    intent: { intent: rc.intelligence.intent, confidence: rc.runtime.confidence.provenance.intentConfidence },
    domain: { primaryDomain: rc.intelligence.domain.primary },
    confidence: {
      overall,
      requiresClarification: risk?.level === 'high' || overall < 0.35,
      clarificationReason: overall < 0.35 ? `Low confidence: ${rc.runtime.confidence.weakAreas?.join(', ') ?? ''}` : risk?.level === 'high' ? `High risk: ${risk.factors?.join(', ') ?? ''}` : undefined,
    },
    knowledge: { entries: rc.grounding.knowledge.map(k => ({ id: k.id, content: k.content, confidence: k.confidence, source: k.source })) },
    memory: { query: rc.grounding.memory.entries.length > 0 ? { text: rc.grounding.memory.entries.map(e => e.content).join(' '), type: rc.grounding.memory.type } : null },
    operational: { context: buildOperationalContext(rc.grounding.operational) },
    repository: { topFiles: rc.grounding.repository.map(f => ({ path: f.path, confidence: 1.0 })) },
    awareness: aw ? { situation: aw.summary, health: aw.overallHealth, score: aw.awarenessScore, nextAction: aw.nextAttention, businessRisk: aw.businessSituation.riskLevel, systemHealth: aw.systemSituation.health } : undefined,
    refinement: buildRefinement(rc.refinementHistory),
    contextual: rc.erpContexts as Record<string, unknown> | undefined,
    capabilities,
    businessIntelligence: biContext,
  };
  return execCtx;
}

function buildCapabilityContext(rc: RuntimeContext, targetExecutive?: string): CapabilityExecutiveContext | undefined {
  try {
    const primaryDomain = rc.intelligence.domain.primary as CapabilityDomain;
    const domainCaps = getCapabilitiesByDomain(primaryDomain);
    const allCaps = getAllCapabilities();

    let relevantCaps: ReturnType<typeof getAllCapabilities>;
    if (targetExecutive) {
      relevantCaps = allCaps.filter(c => c.ownerExecutive === targetExecutive);
    } else if (domainCaps.length > 0) {
      relevantCaps = domainCaps;
    } else {
      relevantCaps = allCaps;
    }

    const availableCapabilities: CapabilityContextEntry[] = relevantCaps.map(cap => ({
      id: cap.id,
      name: cap.name,
      domain: cap.domain,
      ownerExecutive: cap.ownerExecutive,
      actions: cap.supportedActions.map(a => ({ name: a.name, purpose: a.purpose, approvalLevel: a.approvalLevel, riskLevel: a.riskLevel })),
      requiredCapabilities: cap.dependencies,
      status: cap.status,
    }));

    const operationalCtx = buildOperationalContext(rc.grounding.operational) || {};
    const recommended = recommendCapabilities({ ...operationalCtx, intent: rc.intelligence.intent }, 5);

    const blockedCapabilities: { capabilityId: string; reason: string }[] = [];
    const dependencySummary: { capabilityId: string; dependsOn: string[]; dependedBy: string[] }[] = [];

    for (const cap of relevantCaps) {
      const dependsOn = getDependencies(cap.id);
      const dependedBy = getDependents(cap.id);
      dependencySummary.push({ capabilityId: cap.id, dependsOn, dependedBy });

      if (dependsOn.some(d => !getCapabilityById(d))) {
        blockedCapabilities.push({ capabilityId: cap.id, reason: `Missing dependencies: ${dependsOn.filter(d => !getCapabilityById(d)).join(", ")}` });
      }
    }

    return { availableCapabilities, recommendedCapabilities: recommended, blockedCapabilities, dependencySummary };
  } catch {
    return undefined;
  }
}

function buildRefinement(history?: any[]): ExecutiveContext["refinement"] | undefined {
  if (!history || history.length === 0) return undefined;
  const lastEntry = history[history.length - 1];
  return {
    wasRefined: true,
    iterations: history.length,
    confidenceDelta: (lastEntry?.confidenceAfter ?? 0) - (history[0].confidenceBefore),
    resolvedIssues: history.flatMap((h: any) => h.resolvedChecks ?? []).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i),
    remainingIssues: history[history.length - 1]?.failedChecks ?? [],
  };
}

function buildOperationalContext(operational: any[]): Record<string, unknown> | null {
  if (!operational || operational.length === 0) return null;
  const context: Record<string, unknown> = {};
  for (const entry of operational) {
    if (entry && typeof entry.data === 'object' && entry.data !== null) {
      context[entry.type] = entry.data;
    }
  }
  return context;
}

export { mapContextForRole };
