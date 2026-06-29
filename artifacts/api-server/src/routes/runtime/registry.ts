// SPRINT 2: Runtime Component Registry
// Maps all runtime components with metadata + validates dependency graph

import { llmGateway } from "./llm-gateway";
import { toolExecutor } from "./tool-executor";

interface RuntimeComponentMeta {
  name: string;
  version: string;
  capabilities: string[];
  dependencies: string[];
  execute?: (...args: any[]) => any;
}

export const RUNTIME_COMPONENTS: Record<string, RuntimeComponentMeta> = {
  LLMGateway: llmGateway,
  ToolExecutor: toolExecutor,
  // Future: Validator, MemoryBridge, PromptAssembler, KnowledgeLoader, Planner, Renderer
};

/** Validate dependency graph — returns array of missing dependencies */
export function validateRegistry(): { valid: boolean; missing: string[]; circular: string[][] } {
  const names = Object.keys(RUNTIME_COMPONENTS);
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const comp = RUNTIME_COMPONENTS[name];
    if (!comp) continue;
    for (const dep of comp.dependencies) {
      if (!RUNTIME_COMPONENTS[dep]) {
        missing.push(`${name} → ${dep}`);
      }
    }
  }

  // Circular dependency check (simple DFS)
  const circular: string[][] = [];
  function hasCycle(node: string, path: Set<string>): boolean {
    if (path.has(node)) {
      circular.push([...path, node]);
      return true;
    }
    const comp = RUNTIME_COMPONENTS[node];
    if (!comp || seen.has(node)) return false;
    seen.add(node);
    path.add(node);
    for (const dep of comp.dependencies) {
      if (hasCycle(dep, new Set(path))) return true;
    }
    return false;
  }

  for (const name of names) {
    if (!seen.has(name)) hasCycle(name, new Set());
  }

  return { valid: missing.length === 0 && circular.length === 0, missing, circular };
}

/** Print registry status for debugging */
export function registryStatus(): string {
  const { valid, missing, circular } = validateRegistry();
  const lines = [
    `Registry: ${Object.keys(RUNTIME_COMPONENTS).length} components`,
    `Valid: ${valid}`,
    missing.length ? `Missing deps: ${missing.join(", ")}` : null,
    circular.length ? `CIRCULAR: ${circular.map(c => c.join(" → ")).join("; ")}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
