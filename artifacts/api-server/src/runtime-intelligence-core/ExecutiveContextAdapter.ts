import type { RuntimeContext, OperationalData } from './types';

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
}

export function mapToExecutive(rc: RuntimeContext): ExecutiveContext {
  const overall = rc.runtime.confidence.overall;
  const risk = rc.intelligence.risk;

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
