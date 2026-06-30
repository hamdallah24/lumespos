// SPRINT 8: Knowledge Metrics — standalone component
// ECP-008 Condition 3: First-class component, not ExecutionContext add-on

import { buildGraph, validateGraph, KnowledgeGraphV1 } from "./knowledge-graph";
import { knowledgeRepo } from "./knowledge-repository";

interface CoverageMetrics {
  totalAssets: number;
  populatedAssets: number;
  coveragePercent: number;
  emptyAssets: string[];
}

interface FreshnessMetrics {
  oldestUpdate: string;
  newestUpdate: string;
  staleCount: number;  // >30 days since last update
}

interface ConnectionMetrics {
  totalEdges: number;
  nodesWithNoEdges: number;
  avgConnectionsPerNode: number;
  maxDependencyDepth: number;
}

interface KnowledgeMetricsSnapshot {
  timestamp: string;
  coverage: CoverageMetrics;
  freshness: FreshnessMetrics;
  connections: ConnectionMetrics;
  cache: ReturnType<typeof knowledgeRepo.metrics>;
  validation: { brokenRefs: number; orphans: number; cycles: number };
}

/** Compute coverage metrics */
function computeCoverage(graph: KnowledgeGraphV1): CoverageMetrics {
  const allIds = [...graph.nodes.keys()];
  // Populated = has content (we check via the graph nodes' existence)
  // In our graph, all registered nodes exist. Empty stubs are those with "Planned" stability
  const populated = allIds.filter(id => {
    const n = graph.nodes.get(id);
    return n && n.stability !== "unstable";
  });
  const empty = allIds.filter(id => {
    const n = graph.nodes.get(id);
    return n && n.stability === "unstable";
  });

  return {
    totalAssets: allIds.length,
    populatedAssets: populated.length,
    coveragePercent: allIds.length > 0 ? Math.round((populated.length / allIds.length) * 100) : 0,
    emptyAssets: empty,
  };
}

/** Compute freshness metrics */
function computeFreshness(graph: KnowledgeGraphV1): FreshnessMetrics {
  let oldest = "", newest = "";
  let staleCount = 0;
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (const [, node] of graph.nodes) {
    const lastUpdateStr = (node as any).lastUpdated || "";
    if (!lastUpdateStr) continue;

    const date = new Date(lastUpdateStr).getTime();
    if (isNaN(date)) continue;

    if (!oldest || date < new Date(oldest).getTime()) oldest = lastUpdateStr;
    if (!newest || date > new Date(newest).getTime()) newest = lastUpdateStr;
    if (now - date > thirtyDays) staleCount++;
  }

  return { oldestUpdate: oldest, newestUpdate: newest, staleCount };
}

/** Compute connection metrics */
function computeConnections(graph: KnowledgeGraphV1): ConnectionMetrics {
  let noEdges = 0;
  let maxDepth = 0;

  for (const [, node] of graph.nodes) {
    if (node.dependsOn.length === 0 && node.referencedBy.length === 0) noEdges++;
  }

  // Max dependency depth: BFS from root nodes
  const visited = new Set<string>();
  function bfsDepth(startId: string): number {
    const queue: [string, number][] = [[startId, 0]];
    let depth = 0;
    while (queue.length > 0) {
      const [id, d] = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      depth = Math.max(depth, d);
      const node = graph.nodes.get(id);
      if (node) {
        for (const depId of node.dependsOn) {
          if (graph.nodes.has(depId)) queue.push([depId, d + 1]);
        }
      }
    }
    return depth;
  }

  // Start from nodes with no dependents (roots: depends_on = [])
  for (const [id, node] of graph.nodes) {
    if (node.referencedBy.length === 0 && !visited.has(id)) {
      maxDepth = Math.max(maxDepth, bfsDepth(id));
    }
  }

  return {
    totalEdges: graph.stats.totalEdges,
    nodesWithNoEdges: noEdges,
    avgConnectionsPerNode: graph.stats.totalNodes > 0
      ? Math.round((graph.stats.totalEdges / graph.stats.totalNodes) * 10) / 10
      : 0,
    maxDependencyDepth: maxDepth,
  };
}

/** Collect all metrics */
export function collect(): KnowledgeMetricsSnapshot {
  const graph = buildGraph();
  const validation = validateGraph(graph);

  return {
    timestamp: new Date().toISOString(),
    coverage: computeCoverage(graph),
    freshness: computeFreshness(graph),
    connections: computeConnections(graph),
    cache: knowledgeRepo.metrics(),
    validation: {
      brokenRefs: validation.brokenRefs.length,
      orphans: validation.orphans.length,
      cycles: validation.cycles.length,
    },
  };
}

/** Format as readable report */
export function report(snapshot?: KnowledgeMetricsSnapshot): string {
  const s = snapshot || collect();
  const lines = [
    `Knowledge Metrics — ${s.timestamp.slice(0, 19).replace("T", " ")}`,
    ``,
    `Coverage: ${s.coverage.coveragePercent}% (${s.coverage.populatedAssets}/${s.coverage.totalAssets} populated)`,
    `Freshness: ${s.freshness.staleCount} assets >30 days stale`,
    `Connections: ${s.connections.totalEdges} edges, avg ${s.connections.avgConnectionsPerNode}/node, max depth ${s.connections.maxDependencyDepth}`,
    `Cache: ${s.cache.hitRate}% hit rate (${s.cache.hits} hits, ${s.cache.misses} misses)`,
    `Validation: ${s.validation.brokenRefs} broken refs, ${s.validation.orphans} orphans, ${s.validation.cycles} cycles`,
  ];
  return lines.join("\n");
}

// Component metadata
export const knowledgeMetrics = {
  name: "KnowledgeMetrics",
  version: "1.0.0",
  capabilities: ["coverage-tracking", "freshness-detection", "connection-analysis", "health-reporting"],
  dependencies: ["KnowledgeGraphV1", "KnowledgeRepository"],
  health: () => {
    const s = collect();
    return {
      status: s.validation.brokenRefs === 0 ? ("healthy" as const) : ("degraded" as const),
      uptime: 0, dependencies: [], version: "1.0.0",
      custom: { coverage: s.coverage.coveragePercent, cacheHitRate: s.cache.hitRate },
    };
  },
  collect,
  report,
};
