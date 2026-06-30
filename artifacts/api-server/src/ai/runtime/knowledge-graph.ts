// SPRINT 8: KnowledgeGraphV1 — semantic knowledge structure
// ECP-008 Condition 1: Single source of all knowledge after Foundation Loader
// ECP-008 Condition 2: Versioned schema (v1)

import { foundationLoader } from "./foundation-loader";

// ── KnowledgeGraphV1 Schema ──

export interface KnowledgeNode {
  id: string;
  title: string;
  domain: string;
  artifactType: string;
  knowledgeLevel: string;
  contextPriority: string;
  loadingStrategy: string;
  stability: string;
  version: string;
  dependsOn: string[];      // IDs of upstream nodes
  referencedBy: string[];   // IDs of downstream nodes
  consumers: string[];
  tags: string[];
  path: string;             // file path relative to .ai/
}

export interface KnowledgeEdge {
  from: string;   // source node ID
  to: string;     // target node ID
  type: "depends_on" | "referenced_by" | "consumes";
}

export interface KnowledgeGraphV1 {
  schema: "1.0";
  builtAt: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    byDomain: Record<string, number>;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
  };
  nodes: Map<string, KnowledgeNode>;
  edges: KnowledgeEdge[];
}

// ── Validation Report ──

export interface ValidationReport {
  passed: boolean;
  brokenRefs: string[];      // depends_on → non-existent node
  orphans: string[];         // nodes with 0 edges
  cycles: string[][] ;        // circular dependency chains
  warnings: string[];
}

// ── Build graph from Foundation Loader ──

export function buildGraph(): KnowledgeGraphV1 {
  const assets = foundationLoader.load();
  const nodes = new Map<string, KnowledgeNode>();
  const edges: KnowledgeEdge[] = [];
  const byDomain: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const asset of assets) {
    const node: KnowledgeNode = {
      id: asset.id,
      title: asset.title,
      domain: asset.domain,
      artifactType: asset.artifact_type,
      knowledgeLevel: asset.knowledge_level,
      contextPriority: asset.context_priority,
      loadingStrategy: asset.loading_strategy,
      stability: asset.stability,
      version: asset.version,
      dependsOn: asset.depends_on || [],
      referencedBy: [],
      consumers: asset.consumers || [],
      tags: [],
      path: "",
    };

    nodes.set(node.id, node);

    // Counts
    byDomain[node.domain] = (byDomain[node.domain] || 0) + 1;
    byLevel[node.knowledgeLevel] = (byLevel[node.knowledgeLevel] || 0) + 1;
    byType[node.artifactType] = (byType[node.artifactType] || 0) + 1;
  }

  // Build edges from depends_on
  for (const [, node] of nodes) {
    for (const depId of node.dependsOn) {
      if (nodes.has(depId)) {
        edges.push({ from: node.id, to: depId, type: "depends_on" });
        const target = nodes.get(depId)!;
        if (!target.referencedBy.includes(node.id)) target.referencedBy.push(node.id);
      }
    }
  }

  return {
    schema: "1.0",
    builtAt: new Date().toISOString(),
    stats: {
      totalNodes: nodes.size,
      totalEdges: edges.length,
      byDomain,
      byLevel,
      byType,
    },
    nodes,
    edges,
  };
}

// ── Validate graph ──

export function validateGraph(graph: KnowledgeGraphV1): ValidationReport {
  const report: ValidationReport = {
    passed: true,
    brokenRefs: [],
    orphans: [],
    cycles: [],
    warnings: [],
  };

  // Check broken refs
  for (const [, node] of graph.nodes) {
    for (const depId of node.dependsOn) {
      if (!graph.nodes.has(depId)) {
        report.brokenRefs.push(`${node.id} → ${depId}`);
        report.passed = false;
      }
    }
  }

  // Check orphans (no edges at all)
  for (const [, node] of graph.nodes) {
    const hasEdges = node.dependsOn.length > 0 || node.referencedBy.length > 0;
    if (!hasEdges && node.knowledgeLevel !== "experimental") {
      report.orphans.push(node.id);
    }
  }

  // Check cycles (DFS)
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(nodeId: string, path: string[]) {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      report.cycles.push([...path.slice(cycleStart), nodeId]);
      report.passed = false;
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const depId of node.dependsOn) {
        if (graph.nodes.has(depId)) detectCycle(depId, [...path]);
      }
    }
    inStack.delete(nodeId);
  }

  for (const [id] of graph.nodes) {
    if (!visited.has(id)) detectCycle(id, []);
  }

  return report;
}

// ── Query helpers ──

export function queryByDomain(graph: KnowledgeGraphV1, domain: string): KnowledgeNode[] {
  return [...graph.nodes.values()].filter(n => n.domain === domain);
}

export function queryByLevel(graph: KnowledgeGraphV1, level: string): KnowledgeNode[] {
  return [...graph.nodes.values()].filter(n => n.knowledgeLevel === level);
}

export function queryByStrategy(graph: KnowledgeGraphV1, strategy: string): KnowledgeNode[] {
  return [...graph.nodes.values()].filter(n => n.loadingStrategy === strategy);
}

export function queryConsumers(graph: KnowledgeGraphV1, agentName: string): KnowledgeNode[] {
  return [...graph.nodes.values()].filter(n => n.consumers.some(c => c.toLowerCase() === agentName.toLowerCase()));
}

// ── Component Metadata ──

export const knowledgeGraph = {
  name: "KnowledgeGraphV1",
  version: "1.0.0",
  capabilities: ["knowledge-graph", "dependency-resolution", "cycle-detection", "query-by-domain"],
  dependencies: ["FoundationLoader"],

  health: () => {
    const graph = buildGraph();
    const validation = validateGraph(graph);
    return {
      status: validation.passed ? ("healthy" as const) : ("degraded" as const),
      uptime: 0,
      dependencies: [],
      version: "1.0.0",
      custom: {
        nodes: graph.stats.totalNodes,
        edges: graph.stats.totalEdges,
        brokenRefs: validation.brokenRefs.length,
        cycles: validation.cycles.length,
      },
    };
  },

  build: buildGraph,
  validate: validateGraph,
  queryByDomain,
  queryByLevel,
  queryByStrategy,
  queryConsumers,
};
