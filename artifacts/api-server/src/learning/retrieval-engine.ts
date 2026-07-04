// ECP-044 Sprint 5: Retrieval Engine
// Retrieves relevant experience and knowledge before executive reasoning.
// Context-aware: domain, executive, keywords.

import type { ExecutiveRole, Experience, KnowledgeNode, RetrievalResult } from "./learning-types";
import { memoryIndex } from "./memory-index";
import { knowledgeGraph } from "./knowledge-graph";
import type { ExperienceEngine } from "./experience-engine";

export interface RetrievalContext {
  mission: string;
  domain: string;
  executive: ExecutiveRole;
  maxExperiences?: number;
  maxKnowledge?: number;
}

export class RetrievalEngine {

  /** Retrieve relevant context for a mission */
  retrieve(ctx: RetrievalContext): RetrievalResult {
    const maxExp = ctx.maxExperiences || 5;
    const maxKnowledge = ctx.maxKnowledge || 10;

    // Search index for relevant knowledge
    const indexResults = memoryIndex.search(ctx.mission, maxKnowledge);
    const knowledgeIds = indexResults.map(e => e.nodeId);

    // Get actual knowledge nodes from graph
    const knowledge: KnowledgeNode[] = [];
    for (const id of new Set(knowledgeIds)) {
      const node = knowledgeGraph.getNode(id);
      if (node) knowledge.push(node);
      if (knowledge.length >= maxKnowledge) break;
    }

    // Get domain knowledge
    const domainNodes = knowledgeGraph.findByDomain(ctx.domain).slice(0, 3);
    for (const node of domainNodes) {
      if (!knowledge.find(k => k.id === node.id)) {
        knowledge.push(node);
      }
    }

    // Get executive-specific knowledge
    const execNodes = knowledgeGraph.findByExecutive(ctx.executive).slice(0, 5);
    for (const node of execNodes) {
      if (!knowledge.find(k => k.id === node.id)) {
        knowledge.push(node);
      }
      if (knowledge.length >= maxKnowledge) break;
    }

    // Compute retrieval confidence
    const confidence = knowledge.length > 0
      ? Math.min(100, Math.round(
        knowledge.reduce((s, n) => s + n.confidence * (n.reinforced / 10), 0) / knowledge.length
      ))
      : 0;

    // Experiences are external — returned from learning engine's store
    return {
      experiences: [], // Filled by LearningEngine when calling retrieve
      knowledge,
      confidence,
    };
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
}

export const retrievalEngine = new RetrievalEngine();
