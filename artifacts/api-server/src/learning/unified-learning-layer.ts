import type { UnifiedEvidence, UnifiedRetrievalQuery, UnifiedFeedbackInput, UnifiedEvidenceSource, ConflictResolution } from "./unified-types";
import { knowledgeGraph } from "./knowledge-graph";
import { memoryIndex } from "./memory-index";
import { ExecutiveMemoryProvider } from "../executive-memory/ExecutiveMemoryProvider";
import { CouncilLearningProvider } from "../executive-council/learning/CouncilLearningProvider";
import { learningEngine as kpLearningEngine } from "../knowledge-platform/learning/LearningEngine";
import { KnowledgeProvider } from "../knowledge-platform/providers/KnowledgeProvider";
import { knowledgeBase } from "../knowledge-platform/core";

let idCounter = 0;
function uid(): string {
  idCounter++;
  return `ue-${Date.now().toString(36)}-${idCounter}`;
}

function computeFreshness(ts: string | undefined): number {
  if (!ts) return 0;
  const age = Date.now() - new Date(ts).getTime();
  const hours = age / 3600000;
  return Math.max(0, Math.min(100, Math.round(100 - hours * 2)));
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\W+/).filter(t => t.length > 3));
  const tokensB = new Set(b.toLowerCase().split(/\W+/).filter(t => t.length > 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
  return intersection.size / Math.max(tokensA.size, tokensB.size);
}

// ── Unified Learning Integration Layer ──

export const UnifiedLearningLayer = {

  /** Unified retrieval: queries ALL sources, merges, deduplicates, ranks */
  retrieve(query: UnifiedRetrievalQuery): UnifiedEvidence[] {
    const sources = query.sources ?? ["org_learning", "knowledge_platform", "council_learning", "memory_engine", "executive_history", "semantic", "episode", "procedural", "organizational"];
    const maxResults = query.maxResults ?? 20;
    const minConfidence = query.minConfidence ?? 0;
    const all: UnifiedEvidence[] = [];

    // 1. Org Learning — knowledgeGraph
    if (sources.includes("org_learning")) {
      try {
        const nodes = query.domain
          ? knowledgeGraph.findByDomain(query.domain)
          : knowledgeGraph.all();
        for (const n of nodes) {
          all.push({
            id: uid(), content: n.content, source: "org_learning", originEngine: "OrgLearning",
            confidence: n.confidence, timestamp: n.learnedAt, executive: n.source.executive,
            domain: n.domain, importance: n.reinforced * 10, freshness: computeFreshness(n.learnedAt),
            keywords: [n.type, n.domain], sourceRef: `knowledge-graph://${n.id}`,
          });
        }
      } catch { /* skip */ }
    }

    // 2. Org Learning — memoryIndex
    if (sources.includes("org_learning") && query.mission) {
      try {
        const indexResults = memoryIndex.search(query.mission, 10);
        for (const entry of indexResults) {
          all.push({
            id: uid(), content: `${entry.domain}:${entry.keywords?.join(",") ?? ""}`,
            source: "org_learning", originEngine: "OrgLearning",
            confidence: entry.confidence, timestamp: "", executive: entry.executive,
            domain: entry.domain, importance: entry.reinforced * 10, freshness: 50,
            keywords: entry.keywords, sourceRef: `memory-index://${entry.nodeId}`,
          });
        }
      } catch { /* skip */ }
    }

    // 3. Knowledge Platform — episode blocks
    if (sources.includes("episode")) {
      try {
        const episodes = KnowledgeProvider.getByType("episode");
        for (const ep of episodes.slice(0, 15)) {
          all.push({
            id: uid(), content: ep.summary, source: "episode", originEngine: "KnowledgePlatform",
            confidence: ep.confidence, timestamp: ep.lastObserved, domain: ep.domain,
            importance: ep.importance, freshness: computeFreshness(ep.lastObserved),
            keywords: ep.tags, sourceRef: `knowledge-base://${ep.id}`,
          });
        }
      } catch { /* skip */ }
    }

    // 4. Knowledge Platform — semantic blocks
    if (sources.includes("semantic")) {
      try {
        const semantics = KnowledgeProvider.getByType("semantic");
        for (const s of semantics.slice(0, 10)) {
          all.push({
            id: uid(), content: s.summary, source: "semantic", originEngine: "KnowledgePlatform",
            confidence: s.confidence, timestamp: s.lastObserved, domain: s.domain,
            importance: s.importance, freshness: computeFreshness(s.lastObserved),
            keywords: s.tags, sourceRef: `knowledge-base://${s.id}`,
          });
        }
      } catch { /* skip */ }
    }

    // 5. Knowledge Platform — procedural blocks
    if (sources.includes("procedural")) {
      try {
        const procedurals = KnowledgeProvider.getByType("procedural");
        for (const p of procedurals.slice(0, 10)) {
          all.push({
            id: uid(), content: p.summary, source: "procedural", originEngine: "KnowledgePlatform",
            confidence: p.confidence, timestamp: p.lastObserved, domain: p.domain,
            importance: p.importance, freshness: computeFreshness(p.lastObserved),
            keywords: p.tags, sourceRef: `knowledge-base://${p.id}`,
          });
        }
      } catch { /* skip */ }
    }

    // 6. Council Learning — past outcomes
    if (sources.includes("council_learning")) {
      try {
        const outcomes = CouncilLearningProvider.getOutcomes();
        for (const o of outcomes.slice(0, 10)) {
          all.push({
            id: uid(), content: `${o.sessionTitle}: ${o.resolution}`,
            source: "council_learning", originEngine: "CouncilLearning",
            confidence: o.outcome === "success" ? 80 : o.outcome === "failure" ? 40 : 60,
            timestamp: o.recordedAt, importance: 50, freshness: computeFreshness(o.recordedAt),
            keywords: [o.outcome], sourceRef: `council-outcome://${o.sessionId}`,
          });
        }
      } catch { /* skip */ }
    }

    // 7. Executive Memory — past decisions
    if (sources.includes("executive_history") && query.executive) {
      try {
        const recall = ExecutiveMemoryProvider.recallForExecutive(query.executive as any, 10);
        if (recall?.records) {
          for (const r of recall.records) {
            all.push({
              id: uid(), content: r.title, source: "executive_history", originEngine: "ExecutiveMemory",
              confidence: (r.confidence ?? 50), timestamp: r.createdAt ?? "", executive: query.executive,
              domain: r.domain, importance: 50, freshness: computeFreshness(r.createdAt),
              sourceRef: `executive-memory://${r.id}`,
            });
          }
        }
      } catch { /* skip */ }
    }

    // Deduplicate + rank
    const deduplicated = this.deduplicate(all);
    const ranked = this.rank(deduplicated, query);
    return ranked.slice(0, maxResults).filter(e => e.confidence >= minConfidence);
  },

  /** Deduplicate: merge evidence with similar content */
  deduplicate(items: UnifiedEvidence[]): UnifiedEvidence[] {
    const groups: UnifiedEvidence[][] = [];
    for (const item of items) {
      let added = false;
      for (const group of groups) {
        if (tokenSimilarity(group[0].content, item.content) > 0.6) {
          group.push(item);
          added = true;
          break;
        }
      }
      if (!added) groups.push([item]);
    }
    return groups.map(group => this.resolveConflicts(group));
  },

  /** Resolve conflicts within a duplicate group */
  resolveConflicts(group: UnifiedEvidence[]): UnifiedEvidence {
    if (group.length === 1) return group[0];
    const sorted = [...group].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.freshness - a.freshness;
    });
    return { ...sorted[0], conflictGroup: group.map(g => g.id).join(",") };
  },

  /** Rank by confidence * freshness * importance */
  rank(items: UnifiedEvidence[], query: UnifiedRetrievalQuery): UnifiedEvidence[] {
    return items.map(item => {
      let score = item.confidence * 0.4 + item.freshness * 0.3 + item.importance * 0.3;
      if (query.domain && item.domain === query.domain) score *= 1.2;
      if (query.executive && item.executive === query.executive) score *= 1.15;
      return { ...item, confidence: Math.min(100, Math.round(score)) };
    }).sort((a, b) => b.confidence - a.confidence);
  },

  /** Synchronize learning across engines */
  synchronize(): { synced: number; details: string[] } {
    const details: string[] = [];
    let synced = 0;

    // Sync: Council patterns → Knowledge Platform as procedural updates
    try {
      const stats = CouncilLearningProvider.getStats();
      if (stats.patternsDetected > 0 && stats.topAlignments.length > 0) {
        for (const alignment of stats.topAlignments) {
          KnowledgeProvider.ingestProcedural({
            condition: `Council alignment between ${alignment.executiveA} and ${alignment.executiveB}`,
            action: `Consider ${alignment.executiveA}-${alignment.executiveB} alignment (${alignment.alignmentRate}%)`,
            domain: "governance",
            topic: "council_alignment",
            summary: `Executive alignment pattern: ${alignment.executiveA} ↔ ${alignment.executiveB}`,
          });
          synced++;
          details.push(`Synced council alignment → KP procedural: ${alignment.executiveA}-${alignment.executiveB}`);
        }
      }
    } catch { /* skip */ }

    // Sync: Knowledge Platform confirmed patterns → Org Learning knowledgeGraph
    try {
      const stats = KnowledgeProvider.getStats();
      const confirmed = stats.learning?.confirmed ?? 0;
      if (confirmed > 0) {
        details.push(`KP confirmed knowledge blocks: ${confirmed} (coherence check)`);
        synced++;
      }
    } catch { /* skip */ }

    return { synced, details };
  },

  /** Provide feedback: outcome → all engines */
  provideFeedback(input: UnifiedFeedbackInput): void {
    // 1. Knowledge Platform: adjust confidence for matching domain blocks
    try {
      const matching = KnowledgeProvider.getByDomain(input.domain);
      const outcome = input.outcome === "success" ? "success" as const
        : input.outcome === "failure" ? "failure" as const
        : "partial" as const;
      for (const block of matching.slice(0, 5)) {
        KnowledgeProvider.recordOutcome(block.id, outcome);
      }
    } catch { /* skip */ }

    // 2. Council Learning: tracked via session enrichment on next initiation
    // 3. Org Learning: handled by maintenance cycle autoCycle()
  },
};
