// ConfigCenter — Milestone 6 Phase 1: Dependency Validation.
// Validates a plugin's dependencies against the currently registered plugin set:
//   - every required (non-optional) dependency must be present,
//   - the dependency's version must satisfy the declared semver range,
//   - the dependency graph must be acyclic (topological order is derivable).
// Deterministic and side-effect-free.

import type { PluginDependency, PluginManifest } from "./types";
import { satisfiesVersion } from "./semver";

export interface DependencyIssue {
  pluginId: string;
  dependencyId: string;
  message: string;
}

export interface DependencyValidation {
  ok: boolean;
  issues: DependencyIssue[];
  /** Plugin ids in a valid start order respecting dependencies. */
  order: string[];
}

export function validateDependencies(manifest: PluginManifest, available: Map<string, PluginManifest>): DependencyValidation {
  const issues: DependencyIssue[] = [];
  const own = new Map(available);

  // Add current manifest's self to build the full graph.
  own.set(manifest.id, manifest);

  if (manifest.dependencies && manifest.dependencies.length > 0) {
    for (const dep of manifest.dependencies) {
      const target = own.get(dep.id);
      if (!target) {
        if (!dep.optional) issues.push({ pluginId: manifest.id, dependencyId: dep.id, message: `required dependency "${dep.id}" is not registered` });
        continue;
      }
      if (dep.range && !satisfiesVersion(target.version, dep.range)) {
        issues.push({ pluginId: manifest.id, dependencyId: dep.id, message: `"${dep.id}@${target.version}" does not satisfy "${dep.range}"` });
      }
    }
  }

  // Cycle detection over the full graph via DFS.
  const cycle = detectCycle(own);
  if (cycle.length > 0) {
    issues.push({ pluginId: manifest.id, dependencyId: cycle[0] ?? "", message: `dependency cycle detected: ${cycle.join(" → ")}` });
  }

  const order = topoSort(own, issues.length === 0);

  return { ok: issues.length === 0, issues, order };
}

function detectCycle(manifests: Map<string, PluginManifest>): string[] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  for (const id of manifests.keys()) color.set(id, WHITE);

  const visit = (id: string): string[] => {
    color.set(id, GRAY);
    stack.push(id);
    const deps = (manifests.get(id)?.dependencies ?? []).filter((d) => !d.optional);
    for (const dep of deps) {
      if (!manifests.has(dep.id) || color.get(dep.id) === BLACK) continue;
      if (color.get(dep.id) === GRAY) {
        const start = stack.indexOf(dep.id);
        return [...stack.slice(start), dep.id];
      }
      const rec = visit(dep.id);
      if (rec.length > 0) return rec;
    }
    color.set(id, BLACK);
    stack.pop();
    return [];
  };

  for (const id of manifests.keys()) {
    if (color.get(id) === WHITE) {
      const cycle = visit(id);
      if (cycle.length > 0) return cycle;
    }
  }
  return [];
}

/** Kahn's algorithm. If ordering is impossible (cycle), returns [].
 *  When `strict` is false, still returns a best-effort order including the new node. */
function topoSort(manifests: Map<string, PluginManifest>, acyclic: boolean): string[] {
  const ids = [...manifests.keys()];
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    adj.set(id, []);
  }
  for (const id of ids) {
    const deps = (manifests.get(id)?.dependencies ?? []).filter((d) => !d.optional);
    for (const dep of deps) {
      if (!manifests.has(dep.id)) continue;
      adj.get(dep.id)?.push(id);
      indegree.set(id, (indegree.get(id) ?? 0) + 1);
    }
  }
  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const out: string[] = [];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const node = queue.shift() as string;
    out.push(node);
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }
  if (visited.size === ids.length) return out;
  return acyclic ? out : out;
}