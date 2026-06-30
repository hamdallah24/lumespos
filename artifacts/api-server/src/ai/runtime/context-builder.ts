// SPRINT 7.3: Context Builder — returns ContextPackageV1 per CONTEXT_PACKAGE_SPEC.md

import type { KnowledgeAsset } from "./foundation-loader";

/** Formal interface contract — CONTEXT_PACKAGE_SPEC.md v1.0 */
export interface ContextAssetV1 {
  id: string;
  title: string;
  domain: string;
  knowledge_level: string;
  context_priority: string;
  content: string;
  truncated: boolean;
  originalLength: number;
}

export interface ContextPackageV1 {
  version: "1.0";
  meta: {
    mode: string;
    generatedAt: string;
    totalAssets: number;
    truncatedAssets: number;
  };
  budget: {
    total: number;
    used: number;
    remaining: number;
  };
  assets: ContextAssetV1[];
  instructions: string[];
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
export function buildContext(assets: KnowledgeAsset[], mode: string, options: ContextOptions = {}): ContextPackageV1 {
  const {
    strategy = "all",
    maxTokens = 6000,
    domains,
    artifactTypes,
    prioritySort = true,
  } = options;

  let selected = assets.filter(a => {
    if (strategy === "all") return true;
    if (strategy === "always") return a.loading_strategy === "always";
    if (strategy === "conditional") return a.loading_strategy === "always" || a.loading_strategy === "conditional";
    if (strategy === "on-demand") return a.loading_strategy === "on-demand";
    return true;
  });

  if (domains?.length) selected = selected.filter(a => domains.includes(a.domain));
  if (artifactTypes?.length) selected = selected.filter(a => artifactTypes.includes(a.artifact_type));

  if (prioritySort) {
    const prioOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    const levelOrder: Record<string, number> = { foundational: 0, governing: 1, canonical: 2, operational: 3, reference: 4, experimental: 5, archived: 6 };
    selected.sort((a, b) => {
      const pa = prioOrder[a.context_priority] ?? 3;
      const pb = prioOrder[b.context_priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return (levelOrder[a.knowledge_level] ?? 5) - (levelOrder[b.knowledge_level] ?? 5);
    });
  }

  const tokenBudget = maxTokens;
  let remaining = tokenBudget;
  let truncatedCount = 0;
  const finalAssets: ContextAssetV1[] = [];

  for (const asset of selected) {
    const needed = Math.ceil(asset.content.length / 4);
    const originalLen = asset.content.length;

    if (needed > remaining) {
      const truncatedChars = Math.floor(remaining * 4 * 0.8);
      if (truncatedChars < 100) continue;
      finalAssets.push({
        id: asset.id, title: asset.title, domain: asset.domain,
        knowledge_level: asset.knowledge_level, context_priority: asset.context_priority,
        content: asset.content.slice(0, truncatedChars),
        truncated: true, originalLength: originalLen,
      });
      truncatedCount++;
      remaining -= Math.ceil(truncatedChars / 4);
      continue;
    }
    finalAssets.push({
      id: asset.id, title: asset.title, domain: asset.domain,
      knowledge_level: asset.knowledge_level, context_priority: asset.context_priority,
      content: asset.content,
      truncated: false, originalLength: originalLen,
    });
    remaining -= needed;
  }

  // Mode-specific instructions
  const instructions: string[] = [];
  if (mode === "cto") instructions.push("You are the CTO. Analyze code, propose solutions, explain reasoning.");
  if (mode === "bisnis") instructions.push("You are the COO. Translate to JSON actions. Output JSON only.");

  return {
    version: "1.0",
    meta: {
      mode,
      generatedAt: new Date().toISOString(),
      totalAssets: finalAssets.length,
      truncatedAssets: truncatedCount,
    },
    budget: { total: tokenBudget, used: tokenBudget - remaining, remaining },
    assets: finalAssets,
    instructions,
  };
}

/** Build Foundation context specifically (always + conditional strategy, 4000 tokens) */
export function buildFoundationContext(assets: KnowledgeAsset[], mode = "cto", maxTokens = 4000): ContextPackageV1 {
  return buildContext(assets, mode, { strategy: "always", maxTokens, prioritySort: true });
}

/** Build full context (all strategies, 6000 tokens) */
export function buildFullContext(assets: KnowledgeAsset[], mode = "cto", maxTokens = 6000): ContextPackageV1 {
  return buildContext(assets, mode, { strategy: "all", maxTokens, prioritySort: true });
}

/** Build domain-specific context */
export function buildDomainContext(assets: KnowledgeAsset[], mode: string, domain: string, maxTokens = 4000): ContextPackageV1 {
  return buildContext(assets, mode, { strategy: "conditional", maxTokens, domains: [domain], prioritySort: true });
}

export const contextBuilder = {
  name: "ContextBuilder",
  version: "1.1.0",
  capabilities: ["context-selection", "token-budgeting", "priority-ordering", "context-package-v1"],
  dependencies: ["FoundationLoader"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.1.0" }),
  build: buildContext,
  foundation: buildFoundationContext,
  full: buildFullContext,
  domain: buildDomainContext,
};
