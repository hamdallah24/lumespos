import type { RuntimeContext, OperationalData, RefinementEntry } from './types';

export interface AwarenessContext {
  summary: string;
  overallHealth: string;
  overallConfidence: number;
  awarenessScore: number;
  nextAttention: string;
  businessSituation: {
    summary: string;
    riskLevel: string;
    trend: string;
    focus: string;
  };
  systemSituation: {
    summary: string;
    health: string;
    degradedServices: string[];
    runtimeState: string;
  };
  criticalSignalCount: number;
  warningCount: number;
}

export interface ExecutiveContext {
  intent: {
    intent: string;
    confidence: number;
  };
  domain: {
    primaryDomain: string;
  };
  confidence: {
    overall: number;
    requiresClarification: boolean;
    clarificationReason?: string;
  };
  knowledge: {
    entries: { id: string; content: string; confidence: number; source: string }[];
  };
  memory: {
    query: { text: string; type: string } | null;
  };
  operational: {
    context: Record<string, unknown> | null;
  };
  repository: {
    topFiles: { path: string; confidence: number }[];
  };
  awareness?: {
    situation: string;
    health: string;
    score: number;
    nextAction: string;
    businessRisk: string;
    systemHealth: string;
  };
  refinement?: {
    wasRefined: boolean;
    iterations: number;
    confidenceDelta: number;
    resolvedIssues: string[];
    remainingIssues: string[];
  };
}

export function mapToExecutive(rc: RuntimeContext): ExecutiveContext {
  const overall = rc.runtime.confidence.overall;
  const risk = rc.intelligence.risk;
  const aw = rc.awareness;

  const awareness = aw ? {
    situation: aw.summary,
    health: aw.overallHealth,
    score: aw.awarenessScore,
    nextAction: aw.nextAttention,
    businessRisk: aw.businessSituation.riskLevel,
    systemHealth: aw.systemSituation.health,
  } : undefined;

  const history = rc.refinementHistory;
  const lastEntry = history && history.length > 0 ? history[history.length - 1] : undefined;
  const refinement = history && history.length > 0 ? {
    wasRefined: true,
    iterations: history.length,
    confidenceDelta: (lastEntry?.confidenceAfter ?? 0) - (history[0].confidenceBefore),
    resolvedIssues: history.flatMap(h => h.resolvedChecks).filter((v, i, a) => a.indexOf(v) === i),
    remainingIssues: history[history.length - 1]?.failedChecks ?? [],
  } : undefined;

  return {
    intent: {
      intent: rc.intelligence.intent,
      confidence: rc.runtime.confidence.provenance.intentConfidence,
    },
    domain: {
      primaryDomain: rc.intelligence.domain.primary,
    },
    confidence: {
      overall,
      requiresClarification: risk.level === 'high' || overall < 0.35,
      clarificationReason: overall < 0.35
        ? `Low confidence (${overall.toFixed(2)}): ${rc.runtime.confidence.weakAreas.join(', ')}`
        : risk.level === 'high'
          ? `High risk: ${risk.factors.join(', ')}`
          : undefined,
    },
    knowledge: {
      entries: rc.grounding.knowledge.map(k => ({
        id: k.id,
        content: k.content,
        confidence: k.confidence,
        source: k.source,
      })),
    },
    memory: {
      query: rc.grounding.memory.entries.length > 0
        ? {
            text: rc.grounding.memory.entries.map(e => e.content).join(' '),
            type: rc.grounding.memory.type,
          }
        : null,
    },
    operational: {
      context: buildOperationalContext(rc.grounding.operational),
    },
    repository: {
      topFiles: rc.grounding.repository.map(f => ({
        path: f.path,
        confidence: 1.0,
      })),
    },
    awareness,
    refinement,
  };
}

function buildOperationalContext(operational: OperationalData[]): Record<string, unknown> | null {
  if (operational.length === 0) return null;

  const context: Record<string, unknown> = {};
  for (const entry of operational) {
    if (typeof entry.data === 'object' && entry.data !== null) {
      context[entry.type] = entry.data;
    }
  }
  return context;
}
