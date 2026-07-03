// ECP-032: Context Priority Engine — scores context by importance
// Frozen. Higher priority = never dropped. Lower = first to go.

import { RESOURCE_POLICY } from "./resource-policy";

interface ScoredContext {
  layer: string;
  content: string;
  score: number;
  priority: number;
}

class ContextPriorityEngine {
  /** Score all context sources by importance */
  score(contexts: { layer: string; content: string }[]): ScoredContext[] {
    const scored = contexts.map(ctx => ({
      layer: ctx.layer,
      content: ctx.content,
      priority: (RESOURCE_POLICY.priority as Record<string, number>)[ctx.layer] || 50,
      score: this.computeScore(ctx),
    }));

    return scored.sort((a, b) => b.score - a.score);
  }

  /** Keep only top-N by score, within token budget */
  select(scored: ScoredContext[], tokenBudget: number): ScoredContext[] {
    const result: ScoredContext[] = [];
    let tokensUsed = 0;

    // Always include priority >= 90
    const critical = scored.filter(c => c.priority >= 90);
    const others = scored.filter(c => c.priority < 90);

    for (const ctx of critical) {
      const t = Math.ceil(ctx.content.length / 4);
      result.push(ctx);
      tokensUsed += t;
    }

    // Fill remaining budget with highest-scored others
    for (const ctx of others) {
      const t = Math.ceil(ctx.content.length / 4);
      if (tokensUsed + t > tokenBudget) break;
      result.push(ctx);
      tokensUsed += t;
    }

    return result;
  }

  private computeScore(ctx: { layer: string; content: string }): number {
    const priority = (RESOURCE_POLICY.priority as Record<string, number>)[ctx.layer] || 50;
    const contentLength = ctx.content.length;

    // Prefer shorter, higher-priority content
    const lengthScore = Math.max(0, 100 - contentLength / 100);
    return priority * 0.7 + lengthScore * 0.3;
  }
}

export const contextPriorityEngine = new ContextPriorityEngine();
