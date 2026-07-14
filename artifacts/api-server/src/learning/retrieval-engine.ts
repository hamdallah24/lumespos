// ECP-044 Sprint 5: Retrieval Engine — now Unified Retrieval Facade (T5.3)
// Retrieves relevant knowledge from ALL learning engines before executive reasoning.
// Context-aware: domain, executive, keywords.
// Backward compatible — old retrieve() still works.

import type { ExecutiveRole, Experience, KnowledgeNode, RetrievalResult } from "./learning-types";
import type { UnifiedEvidence, UnifiedRetrievalQuery } from "./unified-types";
import { memoryIndex } from "./memory-index";
import { knowledgeGraph } from "./knowledge-graph";
import { UnifiedLearningLayer } from "./unified-learning-layer";

export interface RetrievalContext {
  mission: string;
  domain: string;
  executive: ExecutiveRole;
  maxExperiences?: number;
  maxKnowledge?: number;
}

export class RetrievalEngine {

  /** Legacy retrieve — backward compatible, queries Org Learning only */
  retrieve(ctx: RetrievalContext): RetrievalResult {
    const maxExp = ctx.maxExperiences || 5;
    const maxKnowledge = ctx.maxKnowledge || 10;

    const indexResults = memoryIndex.search(ctx.mission, maxKnowledge);
    const knowledgeIds = indexResults.map(e => e.nodeId);

    const knowledge: KnowledgeNode[] = [];
    for (const id of new Set(knowledgeIds)) {
      const node = knowledgeGraph.getNode(id);
      if (node) knowledge.push(node);
      if (knowledge.length >= maxKnowledge) break;
    }

    const domainNodes = knowledgeGraph.findByDomain(ctx.domain).slice(0, 3);
    for (const node of domainNodes) {
      if (!knowledge.find(k => k.id === node.id)) {
        knowledge.push(node);
      }
    }

    const execNodes = knowledgeGraph.findByExecutive(ctx.executive).slice(0, 5);
    for (const node of execNodes) {
      if (!knowledge.find(k => k.id === node.id)) {
        knowledge.push(node);
      }
      if (knowledge.length >= maxKnowledge) break;
    }

    const confidence = knowledge.length > 0
      ? Math.min(100, Math.round(
        knowledge.reduce((s, n) => s + n.confidence * (n.reinforced / 10), 0) / knowledge.length
      ))
      : 0;

    return {
      experiences: [],
      knowledge,
      confidence,
    };
  }

  /** Unified retrieve — queries ALL engines, returns ranked evidence */
  retrieveUnified(query: UnifiedRetrievalQuery): UnifiedEvidence[] {
    return UnifiedLearningLayer.retrieve(query);
  }

  /** Build retrieval prompt for LLM context */
  buildContextPrompt(result: RetrievalResult): string {
    if (result.knowledge.length === 0 && result.experiences.length === 0) {
      return "";
    }

    const parts: string[] = [];

    if (result.knowledge.length > 0) {
      parts.push("## Relevant Knowledge");
      for (const k of result.knowledge.slice(0, 5)) {
        parts.push(`- [${k.type}] ${k.content} (confidence: ${k.confidence}%, reinforced: ${k.reinforced}x)`);
      }
    }

    if (result.experiences.length > 0) {
      parts.push("\n## Past Experiences");
      for (const exp of result.experiences.slice(0, 3)) {
        parts.push(`- [${exp.outcome}] ${exp.lessons.slice(0, 2).join("; ")} (${exp.confidence}% confidence)`);
      }
    }

    return parts.join("\n");
  }

  /** Build unified context prompt from UnifiedEvidence */
  buildUnifiedContextPrompt(evidence: UnifiedEvidence[]): string {
    if (evidence.length === 0) return "";
    const parts: string[] = ["## Unified Knowledge"];
    const bySource = new Map<string, UnifiedEvidence[]>();
    for (const e of evidence) {
      const list = bySource.get(e.source) ?? [];
      list.push(e);
      bySource.set(e.source, list);
    }
    for (const [source, items] of bySource) {
      parts.push(`\n### ${source}`);
      for (const item of items.slice(0, 5)) {
        parts.push(`- [${item.confidence}%] ${item.content.slice(0, 200)}`);
      }
    }
    return parts.join("\n");
  }
}

/**
 * Unified Retrieval Facade — queries Org Learning, Knowledge Platform,
 * Council Learning, Executive Memory, and Memory Engine through one interface.
 * Use retrieveUnified() for cross-engine queries.
 * Use retrieve() for backward-compatible Org Learning queries.
 */
export const retrievalEngine = new RetrievalEngine();
