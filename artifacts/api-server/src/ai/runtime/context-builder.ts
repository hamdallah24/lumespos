// SPRINT 7.2: Context Builder — selects, orders, and allocates token budget
// Decoupled from Foundation Loader. Builds Context Package, not Prompt.

import type { KnowledgeAsset } from "./foundation-loader";

interface ContextPackage {
  assets: KnowledgeAsset[];         // selected assets in priority order
  sections: string[];               // formatted content sections
  totalTokens: number;              // estimated token count (chars / 4)
  budget: { total: number; used: number; remaining: number };
}

interface ContextOptions {
  strategy?: "always" | "conditional" | "on-demand" | "all";
  maxTokens?: number;
  domains?: string[];               // filter by domain
  artifactTypes?: string[];         // filter by artifact_type
  prioritySort?: boolean;           // sort by context_priority + knowledge_level
}

/** Estimate token count from character count */
function estTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/** Build a context package from Knowledge Assets */
export function buildContext(assets: KnowledgeAsset[], options: ContextOptions = {}): ContextPackage {
  const {
    strategy = "all",
    maxTokens = 6000,
    domains,
    artifactTypes,
    prioritySort = true,
  } = options;

  // Filter by loading_strategy
  let selected = assets.filter(a => {
    if (strategy === "all") return true;
    if (strategy === "always") return a.loading_strategy === "always";
    if (strategy === "conditional") return a.loading_strategy === "always" || a.loading_strategy === "conditional";
    if (strategy === "on-demand") return a.loading_strategy === "on-demand";
    return true;
  });

  // Filter by domain/artifact_type if specified
  if (domains?.length) selected = selected.filter(a => domains.includes(a.domain));
  if (artifactTypes?.length) selected = selected.filter(a => artifactTypes.includes(a.artifact_type));

  // Sort by priority
  if (prioritySort) {
    const prioOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    const levelOrder: Record<string, number> = { foundational: 0, governing: 1, canonical: 2, operational: 3, reference: 4, experimental: 5, archived: 6 };

    selected.sort((a, b) => {
      const pa = prioOrder[a.context_priority] ?? 3;
      const pb = prioOrder[b.context_priority] ?? 3;
      if (pa !== pb) return pa - pb;
      const la = levelOrder[a.knowledge_level] ?? 5;
      const lb = levelOrder[b.knowledge_level] ?? 5;
      return la - lb;
    });
  }

  // Allocate token budget
  const tokenBudget = maxTokens;
  let remaining = tokenBudget;
  const sections: string[] = [];
  const finalAssets: KnowledgeAsset[] = [];

  for (const asset of selected) {
    const needed = estTokens(asset.content.length);
    if (needed > remaining) {
      // Allow truncation for large assets
      const truncatedChars = Math.floor(remaining * 4 * 0.8);
      if (truncatedChars < 100) continue;
      const truncated = asset.content.slice(0, truncatedChars);
      sections.push(`[ASSET:${asset.id}] ${asset.title} (${asset.knowledge_level})\n${truncated}`);
      finalAssets.push(asset);
      remaining -= estTokens(truncated.length);
      continue;
    }
    sections.push(`[ASSET:${asset.id}] ${asset.title} (${asset.knowledge_level})\n${asset.content}`);
    finalAssets.push(asset);
    remaining -= needed;
  }

  return {
    assets: finalAssets,
    sections,
    totalTokens: estTokens(sections.reduce((s, sec) => s + sec.length, 0)),
    budget: { total: tokenBudget, used: tokenBudget - remaining, remaining },
  };
}

/** Build Foundation context specifically (always + conditional strategy, 4000 tokens) */
export function buildFoundationContext(assets: KnowledgeAsset[], maxTokens = 4000): ContextPackage {
  return buildContext(assets, {
    strategy: "always",
    maxTokens,
    prioritySort: true,
  });
}

/** Build full context (all strategies, 6000 tokens) */
export function buildFullContext(assets: KnowledgeAsset[], maxTokens = 6000): ContextPackage {
  return buildContext(assets, {
    strategy: "all",
    maxTokens,
    prioritySort: true,
  });
}

/** Build domain-specific context */
export function buildDomainContext(assets: KnowledgeAsset[], domain: string, maxTokens = 4000): ContextPackage {
  return buildContext(assets, {
    strategy: "conditional",
    maxTokens,
    domains: [domain],
    prioritySort: true,
  });
}

/** Format a ContextPackage into a string for injection (LLM-ready format) */
export function formatContextAsString(pkg: ContextPackage, separator = "\n\n---\n\n"): string {
  return pkg.sections.join(separator);
}

// ── Component Metadata ──

export const contextBuilder = {
  name: "ContextBuilder",
  version: "1.0.0",
  capabilities: ["context-selection", "token-budgeting", "priority-ordering", "domain-filtering"],
  dependencies: ["FoundationLoader"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  build: buildContext,
  foundation: buildFoundationContext,
  full: buildFullContext,
  domain: buildDomainContext,
  formatAsString: formatContextAsString,
};
