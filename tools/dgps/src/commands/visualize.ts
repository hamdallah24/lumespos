import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { paths } from "../utils/paths.js";
import type { DependencyGraph } from "../types/index.js";

export async function runVisualize(_args: string[]): Promise<void> {
  const { aiRegistry, aiGeneratedGraphs } = paths();

  const depGraphPath = resolve(aiRegistry, "dependency-graph.json");
  if (!existsSync(depGraphPath)) {
    console.error("dependency-graph.json not found. Run `dgps publish` first.");
    process.exit(1);
  }

  const graph = JSON.parse(readFileSync(depGraphPath, "utf-8")) as DependencyGraph;

  // Generate DOT source and write .dot files + attempt SVG if graphviz available
  console.log("[DGPS] Generating dependency graphs...\n");

  // 1. Full dependency graph
  writeDot("dependency-graph", generateFullDot(graph), aiGeneratedGraphs);

  // 2. Runtime subgraph
  const runtimeEdges = graph.edges.filter(e => e.from.endsWith("-directive") || e.to.endsWith("-runtime") || e.type === "consumes");
  writeDot("runtime-graph", generateSubDot("Runtime Graph", graph, runtimeEdges), aiGeneratedGraphs);

  // 3. Knowledge subgraph
  const knowledgeEdges = graph.edges.filter(e => e.from.startsWith("knowledge-") || e.from.startsWith("cognition-") || e.to.startsWith("knowledge-"));
  writeDot("knowledge-graph", generateSubDot("Knowledge Graph", graph, knowledgeEdges), aiGeneratedGraphs);

  // 4. Executive subgraph
  const execEdges = graph.edges.filter(e => e.from.endsWith("-directive") || e.to.endsWith("-directive") || e.type === "consumes");
  writeDot("executive-graph", generateSubDot("Executive Graph", graph, execEdges), aiGeneratedGraphs);

  // 5. Prompt subgraph
  const promptEdges = graph.edges.filter(e => e.from.endsWith("-prompt") || e.to.endsWith("-prompt") || e.type === "inherits");
  writeDot("prompt-graph", generateSubDot("Prompt Graph", graph, promptEdges), aiGeneratedGraphs);

  console.log("\n[DGPS] To render SVG, install graphviz and run:");
  console.log("  dot -Tsvg .ai/generated/graphs/dependency-graph.dot -o .ai/generated/graphs/dependency-graph.svg");
}

function writeDot(name: string, dot: string, outputDir: string): void {
  const dotPath = resolve(outputDir, `${name}.dot`);
  writeFileSync(dotPath, dot, "utf-8");
  console.log(`  ✓ ${name}.dot`);
}

function generateFullDot(graph: DependencyGraph): string {
  const lines: string[] = ['digraph DGPS {', '  rankdir=LR;', '  node [shape=box, style=rounded, fontname="monospace"];', '  edge [fontname="monospace", fontsize=10];', ''];

  for (const [id] of Object.entries(graph.nodes)) {
    const label = id.replace(/-/g, "\\n");
    const color = id.endsWith("-directive") ? "#4CAF50" : id.endsWith("-prompt") ? "#2196F3" : id.startsWith("knowledge-") ? "#FF9800" : id.startsWith("foundation-") ? "#9C27B0" : "#607D8B";
    lines.push(`  "${id}" [label="${label}", fillcolor="${color}", style="filled,rounded", fontcolor="white"];`);
  }

  lines.push('');
  for (const edge of graph.edges) {
    const style = edge.type === "inherits" ? "dashed" : edge.type === "consumes" ? "dotted" : "solid";
    const color = edge.type === "depends_on" ? "#e74c3c" : edge.type === "inherits" ? "#f39c12" : edge.type === "consumes" ? "#2ecc71" : "#95a5a6";
    lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.type}", style=${style}, color="${color}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateSubDot(title: string, graph: DependencyGraph, edges: typeof graph.edges): string {
  const relevantNodes = new Set<string>();
  for (const e of edges) { relevantNodes.add(e.from); relevantNodes.add(e.to); }

  const lines: string[] = [`digraph ${title.replace(/\\s/g, "")} {`, '  rankdir=LR;', '  node [shape=box, style=rounded, fontname="monospace"];', '  edge [fontname="monospace", fontsize=10];', `  label="${title}";`, '  fontsize=16;', ''];

  for (const id of relevantNodes) {
    const node = graph.nodes[id];
    if (!node) continue;
    const label = id.replace(/-/g, "\\n");
    const color = id.endsWith("-directive") ? "#4CAF50" : id.endsWith("-prompt") ? "#2196F3" : id.startsWith("knowledge-") ? "#FF9800" : id.startsWith("foundation-") ? "#9C27B0" : "#607D8B";
    lines.push(`  "${id}" [label="${label}", fillcolor="${color}", style="filled,rounded", fontcolor="white"];`);
  }

  lines.push('');
  for (const edge of edges) {
    const style = edge.type === "inherits" ? "dashed" : edge.type === "consumes" ? "dotted" : "solid";
    const color = edge.type === "depends_on" ? "#e74c3c" : edge.type === "inherits" ? "#f39c12" : edge.type === "consumes" ? "#2ecc71" : "#95a5a6";
    lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.type}", style=${style}, color="${color}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}
