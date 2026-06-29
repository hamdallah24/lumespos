// SPRINT 3: Dynamic Runtime Component Registry v2
// register(), unregister(), getComponent(), health(), capabilities()

import { llmGateway } from "./llm-gateway";
import { toolExecutor } from "./tool-executor";
import { validator } from "./validator";
import { eventSystem } from "./events";
import { logSystem } from "./logger";
import { metricsSystem } from "./metrics";
import { traceSystem } from "./trace";

interface RuntimeComponentMeta {
  name: string;
  version: string;
  capabilities: string[];
  dependencies: string[];
  health?: () => { status: "healthy" | "degraded" | "unhealthy"; uptime: number; dependencies: any[]; version: string };
  execute?: (...args: any[]) => any;
}

// ── Dynamic Registry ──

const _components = new Map<string, RuntimeComponentMeta>();

export function register(component: RuntimeComponentMeta): void {
  if (_components.has(component.name)) {
    console.warn(`[Registry] Component "${component.name}" already registered — overwriting`);
  }
  _components.set(component.name, component);
}

export function unregister(name: string): boolean {
  return _components.delete(name);
}

export function getComponent(name: string): RuntimeComponentMeta | undefined {
  return _components.get(name);
}

export function capabilities(): string[] {
  const all: string[] = [];
  for (const [, c] of _components) {
    all.push(...(c.capabilities || []));
  }
  return [...new Set(all)];
}

export function health(): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [name, c] of _components) {
    result[name] = c.health ? c.health() : { status: "unknown" };
  }
  return result;
}

export function list(): { name: string; version: string }[] {
  return [..._components.values()].map(c => ({ name: c.name, version: c.version }));
}

// ── Dependency validation (unchanged from Sprint 2) ──

export function validateRegistry(): { valid: boolean; missing: string[]; circular: string[][] } {
  const components = Object.fromEntries(_components);
  const names = Object.keys(components);
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const comp = components[name];
    if (!comp) continue;
    for (const dep of comp.dependencies) {
      if (!components[dep]) {
        missing.push(`${name} → ${dep}`);
      }
    }
  }

  const circular: string[][] = [];
  function hasCycle(node: string, path: Set<string>): boolean {
    if (path.has(node)) { circular.push([...path, node]); return true; }
    const comp = components[node];
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

export function registryStatus(): string {
  const { valid, missing, circular } = validateRegistry();
  const lines = [
    `Registry: ${_components.size} components`,
    `Valid: ${valid}`,
    missing.length ? `Missing deps: ${missing.join(", ")}` : null,
    circular.length ? `CIRCULAR: ${circular.map(c => c.join(" → ")).join("; ")}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

// ── Bootstrap: register default components ──

register(llmGateway);
register(toolExecutor);
register(validator);
register(eventSystem);
register(logSystem);
register(metricsSystem);
register(traceSystem);

// Re-export for backward compat
export { llmGateway, toolExecutor, validator };
export const RUNTIME_COMPONENTS = Object.fromEntries(_components);
