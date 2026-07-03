// ECP-027: Context Budget — token allocation + compression
// Frozen. Manages token budget across context sources.
// Compresses or drops sources when budget is exceeded.

import type { ContextSource, ContextPackage } from "./context-types";

interface BudgetResult {
  included: ContextSource[];
  excluded: ContextSource[];
  compressed: boolean;
  totalTokens: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function allocate(sources: ContextSource[], maxTokens: number): BudgetResult {
  const included: ContextSource[] = [];
  const excluded: ContextSource[] = [];

  // Sort by priority (descending) then by maxTokens (ascending for same priority)
  const sorted = [...sources].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.maxTokens - b.maxTokens;
  });

  let remaining = maxTokens;
  let compressed = false;

  for (const source of sorted) {
    if (source.always) {
      // Always-include sources — may be truncated
      const content = source.content();
      const tokens = estimateTokens(content);
      const allowed = Math.min(tokens, source.maxTokens, remaining);
      included.push(source);
      remaining -= allowed;
      if (allowed < tokens) compressed = true;
      continue;
    }

    const tokens = Math.min(source.maxTokens, remaining);
    if (tokens <= 0) {
      excluded.push(source);
      continue;
    }

    const content = source.content();
    const actual = estimateTokens(content);

    if (actual > tokens) {
      compressed = true;
    }

    included.push(source);
    remaining -= Math.min(actual, tokens);
  }

  return { included, excluded, compressed, totalTokens: maxTokens - remaining };
}

export function buildPackage(sources: ContextSource[], maxTokens: number): ContextPackage {
  const result = allocate(sources, maxTokens);
  const sections: string[] = [];

  for (const source of result.included) {
    const content = source.content();
    const tokens = Math.min(estimateTokens(content), source.maxTokens);
    const budget = Math.min(tokens, maxTokens - estimateTokens(sections.join("\n")));
    if (budget <= 0) break;

    const truncated = content.length > budget * 4
      ? content.slice(0, budget * 4) + "\n..."
      : content;

    sections.push(`[${source.name}]\n${truncated}`);
  }

  return {
    sources: result.included,
    totalTokens: maxTokens,
    budgetUsed: estimateTokens(sections.join("\n")),
    compression: result.compressed ? "truncated" : "none",
  };
}

export function compress(content: string, maxTokens: number): string {
  const tokens = estimateTokens(content);
  if (tokens <= maxTokens) return content;

  const sentences = content.split(/[.!?]\s+/);
  const budget = maxTokens * 4;
  let result = "";
  let used = 0;

  for (const sentence of sentences) {
    const sTokens = estimateTokens(sentence);
    if (used + sTokens > budget) {
      result += "...";
      break;
    }
    result += sentence + ". ";
    used += sTokens + 2;
  }

  return result || content.slice(0, budget);
}
