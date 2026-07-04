// ECP-044 Sprint 3b: Knowledge Engine
// Transforms Reflection into KnowledgeNodes for the knowledge graph.

import type { Reflection, KnowledgeNode, NodeType, ExecutiveRole } from "./learning-types";
import { createNodeId } from "./learning-types";

export class KnowledgeEngine {

  /** Convert reflection into knowledge nodes */
  synthesize(reflection: Reflection, executive: ExecutiveRole, missionId: string, experienceId: string): KnowledgeNode[] {
    const nodes: KnowledgeNode[] = [];

    // Strength → INSIGHT nodes
    for (const strength of reflection.strengths) {
      if (strength.length < 10) continue;
      nodes.push(this.createNode(
        "INSIGHT", strength, executive, missionId, experienceId, 80
      ));
    }

    // Weakness → WARNING nodes
    for (const weakness of reflection.weaknesses) {
      if (weakness.length < 10) continue;
      nodes.push(this.createNode(
        "WARNING", weakness, executive, missionId, experienceId, 60
      ));
    }

    // Improvement → SOLUTION nodes
    for (const improvement of reflection.improvements) {
      if (improvement.length < 10) continue;
      nodes.push(this.createNode(
        "SOLUTION", improvement, executive, missionId, experienceId, 70
      ));
    }

    // Pattern → PATTERN nodes
    for (const pattern of reflection.newPatterns) {
      if (pattern.length < 5) continue;
      nodes.push(this.createNode(
        "PATTERN", pattern, executive, missionId, experienceId, 75
      ));
    }

    return nodes;
  }

  private createNode(
    type: NodeType, content: string,
    executive: ExecutiveRole, missionId: string, experienceId: string,
    confidence: number,
  ): KnowledgeNode {
    return {
      id: createNodeId(),
      domain: this.inferDomain(content),
      type,
      content,
      confidence,
      source: { executive, missionId, experienceId },
      relatesTo: [],
      learnedAt: new Date().toISOString(),
      reinforced: 1,
    };
  }

  /** Infer domain from content */
  private inferDomain(content: string): string {
    const lower = content.toLowerCase();
    if (/auth|login|jwt|token|session|password/i.test(lower)) return "authentication";
    if (/deploy|server|vps|nginx|pm2|ssh/i.test(lower)) return "deployment";
    if (/bug|error|crash|exception|fix|broken/i.test(lower)) return "debugging";
    if (/inventory|stock|sales|product|order/i.test(lower)) return "pos";
    if (/workflow|automation|n8n|pipeline/i.test(lower)) return "automation";
    if (/performance|slow|optimize|memory|latency/i.test(lower)) return "performance";
    if (/architecture|refactor|design|structure/i.test(lower)) return "architecture";
    return "general";
  }

  /** Merge similar nodes — reinforce existing or add new */
  merge(existing: KnowledgeNode[], incoming: KnowledgeNode[]): KnowledgeNode[] {
    const result = [...existing];
    for (const node of incoming) {
      const similar = result.find(e =>
        e.domain === node.domain && e.type === node.type &&
        this.similarity(e.content, node.content) > 0.6
      );
      if (similar) {
        similar.reinforced++;
        similar.confidence = Math.min(100, (similar.confidence + node.confidence) / 2 * 1.1);
      } else {
        result.push(node);
      }
    }
    return result;
  }

  /** Simple keyword overlap similarity */
  private similarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    return intersection / Math.max(wordsA.size, wordsB.size);
  }
}

export const knowledgeEngine = new KnowledgeEngine();
