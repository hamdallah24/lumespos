import type {
  ExecutiveIntent,
  EvidenceSet,
  EvidenceItem,
  EvidenceSource,
  CognitiveContext,
} from "./CognitiveContracts";
import { memoryEngine } from "../memory-provider/MemoryProvider";

function generateId(): string {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildMemoryEvidence(intent: ExecutiveIntent, context?: CognitiveContext): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  // Priority 1: Use pre-built memoryContext string from MemoryProvider (rich, multi-source)
  if (context?.memoryContext) {
    const lines = context.memoryContext.split("\n").filter(l => l.trim().length > 0);
    for (const line of lines.slice(0, 8)) {
      items.push({
        id: generateId(),
        source: "memory",
        content: line.length > 400 ? line.slice(0, 400) + "..." : line,
        relevanceScore: 0.8,
        timestamp: new Date().toISOString(),
        sourceRef: "memory-provider://context",
      });
    }
    return items;
  }

  // Priority 2: Fallback to direct MemoryEngine query
  try {
    const records = memoryEngine.query({
      scope: (intent.role === "CEO" || intent.role === "CKO" ? "GLOBAL" : intent.role) as any,
      limit: 5,
    });
    for (const r of records) {
      items.push({
        id: generateId(),
        source: "memory",
        content: `[${r.category}] ${r.content.slice(0, 300)}`,
        relevanceScore: r.importance.total / 100,
        timestamp: r.createdAt,
        sourceRef: `memory://${r.id}`,
      });
    }
  } catch {
    // skip
  }
  return items;
}

function buildKnowledgeEvidence(context?: CognitiveContext): EvidenceItem[] {
  if (!context?.knowledgeContext) return [];
  const lines = context.knowledgeContext.split("\n").filter(l => l.trim().length > 0);
  return lines.slice(0, 5).map((line) => ({
    id: generateId(),
    source: "knowledge",
    content: line.length > 300 ? line.slice(0, 300) + "..." : line,
    relevanceScore: 0.85,
    timestamp: new Date().toISOString(),
    sourceRef: "memory-provider://knowledge",
  }));
}

function buildHistoryEvidence(context?: CognitiveContext): EvidenceItem[] {
  if (!context?.history || context.history.length === 0) return [];
  return context.history.slice(0, 5).map((d) => ({
    id: generateId(),
    source: "conversation",
    content: `[${d.role}] ${d.chosenAlternative.label}: ${d.reasoning.slice(0, 200)}`,
    relevanceScore: d.confidence.overall / 100,
    timestamp: d.timestamp,
    sourceRef: `history://${d.role}/${d.timestamp}`,
  }));
}

function buildRuntimeEvidence(context?: CognitiveContext): EvidenceItem[] {
  if (!context?.runtime) return [];
  return [{
    id: generateId(),
    source: "runtime",
    content: "Runtime environment available",
    relevanceScore: 0.65,
    timestamp: new Date().toISOString(),
    sourceRef: "runtime://active",
  }];
}

export function buildEvidenceSet(
  questionId: string,
  intent: ExecutiveIntent,
  context?: CognitiveContext,
): EvidenceSet {
  const items: EvidenceItem[] = [
    ...buildMemoryEvidence(intent, context),
    ...buildKnowledgeEvidence(context),
    ...buildHistoryEvidence(context),
    ...buildRuntimeEvidence(context),
  ];

  const trackedSources: EvidenceSource[] = ["memory", "knowledge", "conversation", "runtime", "repository", "documents", "metrics"];

  const presentSources = new Set(items.map(i => i.source));
  const gaps = trackedSources
    .filter(s => !presentSources.has(s))
    .map(s => `Missing evidence from: ${s}`);

  const coverage = trackedSources.length > 0
    ? Math.min(100, Math.round((presentSources.size / trackedSources.length) * 100))
    : 0;

  return {
    questionId,
    items,
    coverage,
    gaps,
    timestamp: new Date().toISOString(),
  };
}
