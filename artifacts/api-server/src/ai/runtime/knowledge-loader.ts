// SPRINT 8: Knowledge Loader — single entry for all knowledge access
// ECP-008: Only Knowledge Loader and Foundation Loader touch knowledge.
// All other components go through Knowledge Loader.

import { knowledgeGraph, buildGraph, queryByDomain, queryByLevel, queryByStrategy } from "./knowledge-graph";
import { knowledgeRepo } from "./knowledge-repository";
import type { KnowledgeNode } from "./knowledge-graph";
import type { KnowledgeAsset } from "./foundation-loader";
import { foundationLoader } from "./foundation-loader";

interface LoadOptions {
  strategy?: "always" | "conditional" | "on-demand" | "all";
  domain?: string;
  knowledgeLevel?: string;
  maxAssets?: number;
  useCache?: boolean;
}

/** Load knowledge nodes from graph + cache */
export function loadKnowledge(options: LoadOptions = {}): KnowledgeNode[] {
  const { strategy = "all", domain, knowledgeLevel, maxAssets = 100, useCache = true } = options;
  const cacheKey = `load:${strategy}:${domain || ""}:${knowledgeLevel || ""}`;

  // Cache hit?
  if (useCache) {
    const cached = knowledgeRepo.get(cacheKey);
    if (cached) return cached.slice(0, maxAssets);
  }

  const graph = buildGraph();
  let nodes = [...graph.nodes.values()];

  // Filter by strategy (mapped to loadingStrategy in metadata)
  if (strategy !== "all") {
    nodes = nodes.filter(n => {
      if (strategy === "always") return n.loadingStrategy === "always";
      if (strategy === "conditional") return n.loadingStrategy === "always" || n.loadingStrategy === "conditional";
      if (strategy === "on-demand") return n.loadingStrategy === "on-demand";
      return true;
    });
  }

  if (domain) nodes = nodes.filter(n => n.domain === domain);
  if (knowledgeLevel) nodes = nodes.filter(n => n.knowledgeLevel === knowledgeLevel);

  // Sort: foundational → governing → canonical → operational → reference
  const levelOrder: Record<string, number> = { foundational: 0, governing: 1, canonical: 2, operational: 3, reference: 4, experimental: 5, archived: 6 };
  nodes.sort((a, b) => (levelOrder[a.knowledgeLevel] ?? 5) - (levelOrder[b.knowledgeLevel] ?? 5));

  // Cache the result
  if (useCache) {
    const ttl = strategy === "always" ? 300000 : 60000; // Foundation: 5min, else: 1min
    knowledgeRepo.set(cacheKey, nodes, ttl);
  }

  return nodes.slice(0, maxAssets);
}

/** Convert KnowledgeNode[] to KnowledgeAsset[] for Context Builder compatibility */
export function nodesToAssets(nodes: KnowledgeNode[]): KnowledgeAsset[] {
  return nodes.map(n => ({
    id: n.id,
    title: n.title,
    domain: n.domain,
    artifact_type: n.artifactType,
    knowledge_level: n.knowledgeLevel,
    context_priority: n.contextPriority,
    loading_strategy: n.loadingStrategy,
    depends_on: n.dependsOn,
    consumers: n.consumers,
    stability: n.stability,
    version: n.version,
    content: "", // Content lazy-loaded on demand
    metadataRaw: "",
  }));
}

/** Load knowledge WITH content (reads filesystem — only Knowledge Loader does this) */
export function loadKnowledgeWithContent(options: LoadOptions = {}): KnowledgeAsset[] {
  const nodes = loadKnowledge(options);
  // Map to full assets via Foundation Loader (single FS access point)
  const allAssets = foundationLoader.load();
  const assetMap = new Map(allAssets.map(a => [a.id, a]));
  const result: KnowledgeAsset[] = [];

  for (const node of nodes) {
    const asset = assetMap.get(node.id);
    if (asset) result.push(asset);
  }

  return result;
}

// Component metadata
export const knowledgeLoader = {
  name: "KnowledgeLoader",
  version: "1.0.0",
  capabilities: ["knowledge-loading", "strategy-filtering", "graph-query", "cache-integration"],
  dependencies: ["KnowledgeGraphV1", "KnowledgeRepository", "FoundationLoader"],
  health: () => ({
    status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
    custom: { cacheMetrics: knowledgeRepo.metrics() },
  }),

  load: loadKnowledge,
  loadWithContent: loadKnowledgeWithContent,
  nodesToAssets,
};
