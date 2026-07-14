import { scanDocuments } from "../scanner/scanner.js";
import { validateDocuments } from "../validator/validator.js";
import { buildDependencyGraph } from "../compiler/graph.js";
import { printDoctor } from "../utils/display.js";
import type { DoctorReport } from "../types/index.js";

export async function runDoctor(_args: string[]): Promise<void> {
  console.log("[DGPS] Running diagnostic...\n");

  const sources = scanDocuments();
  const validation = validateDocuments(sources);
  const depGraph = buildDependencyGraph(sources);

  // Detect circular dependencies
  const circularDeps = detectCircularFromGraph(depGraph);

  // Detect dead documents (no consumer references them)
  const allIds = new Set(sources.map(s => s.id));
  const referencedIds = new Set<string>();
  for (const edge of depGraph.edges) {
    referencedIds.add(edge.from);
    referencedIds.add(edge.to);
  }
  const unusedAssets = sources.filter(s => !referencedIds.has(s.id)).map(s => s.id);

  // Duplicate IDs from validation
  const duplicateIds = validation.issues.filter(i => i.rule === "duplicate-id").map(i => i.message);

  // Broken links
  const brokenLinks = validation.issues.filter(i => i.rule === "broken-link").map(i => i.message);

  // Shadowed assets (non-canonical with canonical existing)
  const shadowed = validation.issues.filter(i => i.rule === "shadowed").map(i => i.message);

  // Runtime consumers
  const runtimeConsumers: Record<string, string> = {};
  for (const src of sources) {
    for (const cons of src.consumer) {
      if (cons.endsWith("-runtime")) {
        runtimeConsumers[src.id] = cons;
      }
    }
  }

  // Coverage estimates
  const executiveIds = sources.filter(s => s.category.startsWith("executive-")).map(s => s.id);
  const foundationIds = sources.filter(s => s.category === "constitution" || s.category === "knowledge").map(s => s.id);
  const promptIds = sources.filter(s => s.category === "executive-prompt" || s.category === "prompt-framework").map(s => s.id);
  const adrIds = sources.filter(s => s.category === "adr").map(s => s.id);

  const coverage = {
    foundation: Math.round((foundationIds.length / Math.max(foundationIds.length, 1)) * 100),
    knowledge: Math.round((foundationIds.length / Math.max(foundationIds.length, 1)) * 100),
    prompt: Math.round((promptIds.length / Math.max(promptIds.length, 1)) * 100),
    directive: Math.round((executiveIds.filter(id => id.includes("EXECUTIVE_SPEC") || id.includes("PLAYBOOK") || id.includes("SYSTEM_PROMPT")).length / 24) * 100),
    adr: Math.round((adrIds.length / Math.max(adrIds.length, 1)) * 100),
  };

  const errorCount = validation.issues.filter(i => i.severity === "ERROR").length;
  const warningCount = validation.issues.filter(i => i.severity === "WARNING").length;
  const healthScore = Math.max(0, Math.min(100,
    100
    - errorCount * 5
    - warningCount * 2
    - duplicateIds.length * 10
    - brokenLinks.length * 5
    - circularDeps.length * 15
    + (coverage.foundation >= 90 ? 3 : 0)
    + (coverage.directive >= 90 ? 3 : 0)
  ));

  const report: DoctorReport = {
    duplicate_ids: duplicateIds,
    broken_links: brokenLinks,
    dead_documents: [],
    unused_assets: unusedAssets,
    circular_dependencies: circularDeps,
    shadowed_assets: shadowed,
    duplicate_canonical_sources: [],
    runtime_consumers: runtimeConsumers,
    coverage,
    health_score: healthScore,
  };

  printDoctor(report);

  if (errorCount > 0) {
    console.log(`\n⚠ ${errorCount} errors found. Run \`dgps validate\` for details.`);
  }
}

function detectCircularFromGraph(graph: { edges: Array<{ from: string; to: string; type: string }> }): string[][] {
  const nodes = new Set<string>();
  for (const edge of graph.edges) {
    nodes.add(edge.from);
    nodes.add(edge.to);
  }

  const adj = new Map<string, string[]>();
  for (const node of nodes) adj.set(node, []);
  for (const edge of graph.edges) {
    if (edge.type === "depends_on" || edge.type === "inherits") {
      adj.get(edge.from)?.push(edge.to);
    }
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (inStack.has(node)) {
      const idx = path.indexOf(node);
      if (idx >= 0) cycles.push([...path.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    path.push(node);
    for (const neighbor of adj.get(node) || []) dfs(neighbor);
    path.pop();
    inStack.delete(node);
  }

  for (const node of nodes) dfs(node);
  return cycles;
}
