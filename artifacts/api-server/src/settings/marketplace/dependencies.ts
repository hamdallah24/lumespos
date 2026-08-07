// ConfigCenter — Milestone 6 Phase 3: Package Dependency Graph.
// Models direct + transitive dependencies, validates existence, detects
// duplicate/conflicting ranges, cycles, and yields deterministic topological
// install/removal order. Pure functions over the registered package set — no
// side effects.

import { satisfiesVersion } from "../plugins/semver";
import type { PackageDependency, PackageManifest } from "./manifest";

export interface GraphNode {
  name: string;
  version: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  range: string;
}

export interface GraphIssue {
  kind: "missing" | "conflict" | "cycle" | "duplicate";
  package?: string;
  message: string;
}

export interface GraphValidation {
  ok: boolean;
  issues: GraphIssue[];
  /** Deterministic install order (dependencies first). Empty if cycle/missing. */
  installOrder: string[];
  /** Deterministic removal order (dependents first). Empty if cycle. */
  removalOrder: string[];
  direct: GraphEdge[];
  transitive: GraphEdge[];
}

type PackageMap = Map<string, PackageManifest>;

const allDeps = (pkg: PackageManifest): PackageDependency[] => [
  ...(pkg.dependencies ?? []),
  ...(pkg.peerDependencies ?? []),
];

/** Build the full graph and validate it. Deterministic given the package set. */
export function resolveDependencyGraph(packages: PackageMap): GraphValidation {
  const issues: GraphIssue[] = [];
  const names = new Set<string>(packages.keys());

  // direct + transitive edges per package (deps of deps, recursively)
  const edges = (pkgName: string): { from: string; to: string; range: string }[] => {
    const result: { from: string; to: string; range: string }[] = [];
    const visited = new Set<string>();
    const walk = (current: string): void => {
      if (visited.has(current)) return;
      visited.add(current);
      const pkg = packages.get(current);
      if (!pkg) return;
      for (const dep of allDeps(pkg)) {
        result.push({ from: current, to: dep.name, range: dep.range });
        if (packages.has(dep.name)) walk(dep.name);
      }
    };
    walk(pkgName);
    return result;
  };

  const direct = new Map<string, { from: string; to: string; range: string }[]>();
  const transitive = new Map<string, { from: string; to: string; range: string }[]>();
  const allEdges = new Set<string>();

  for (const name of packages.keys()) {
    const deps = edges(name).filter((e) => e.from !== e.to);
    const directEdges = deps.filter((e) => e.from === name);
    const transitiveEdges = deps.filter((e) => e.from !== name);
    direct.set(name, directEdges);
    transitive.set(name, transitiveEdges);
    for (const e of deps) allEdges.add(`${e.from}->${e.to}:${e.range}`);
  }

  // 1. missing dependency + version range satisfaction
  for (const pkg of packages.values()) {
    for (const dep of allDeps(pkg)) {
      if (!packages.has(dep.name)) {
        issues.push({ kind: "missing", package: pkg.name, message: `dependency "${dep.name}" (${dep.range}) is not registered` });
        continue;
      }
      const target = packages.get(dep.name)!;
      if (!satisfiesVersion(target.version, dep.range)) {
        issues.push({ kind: "missing", package: pkg.name, message: `dependency "${dep.name}@${target.version}" does not satisfy "${dep.range}"` });
      }
    }
  }

  // 2. duplicate / conflicting ranges declared by a single package
  for (const pkg of packages.values()) {
    const declared = new Map<string, string>();
    for (const dep of allDeps(pkg)) {
      const prev = declared.get(dep.name);
      if (prev != null) {
        if (prev === dep.range) {
          issues.push({ kind: "duplicate", package: pkg.name, message: `duplicate dependency "${dep.name}" on "${pkg.name}"` });
        } else {
          issues.push({ kind: "conflict", package: pkg.name, message: `conflicting ranges for "${dep.name}" on "${pkg.name}": "${prev}" vs "${dep.range}"` });
        }
      } else {
        declared.set(dep.name, dep.range);
      }
    }
  }

  // 3. cycle detection + topological order (Kahn)
  const edgesOf = (n: string): string[] => {
    const pkg = packages.get(n);
    if (!pkg) return [];
    return allDeps(pkg).map((d) => d.name).filter((name) => packages.has(name) && name !== n);
  };

  const cycle = findCycle(names, edgesOf);
  if (cycle.length > 0) {
    issues.push({ kind: "cycle", message: `circular dependency detected: ${cycle.join(" → ")}` });
  }

  const hasCycle = cycle.length > 0;
  const hasMissing = issues.some((i) => i.kind === "missing");
  const installOrder = hasCycle || hasMissing ? [] : topoSort(names, edgesOf);
  const removalOrder = installOrder.length > 0 ? [...installOrder].reverse() : [];

  return {
    ok: issues.length === 0,
    issues,
    installOrder,
    removalOrder,
    direct: [...direct.values()].flat(),
    transitive: [...transitive.values()].flat(),
  };
}

function findCycle(nodes: Set<string>, edgesOf: (n: string) => string[]): string[] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  for (const n of nodes) color.set(n, WHITE);

  const visit = (n: string): string[] => {
    color.set(n, GRAY);
    stack.push(n);
    for (const next of edgesOf(n)) {
      if (!nodes.has(next)) continue;
      if (color.get(next) === BLACK) continue;
      if (color.get(next) === GRAY) {
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      const rec = visit(next);
      if (rec.length > 0) return rec;
    }
    color.set(n, BLACK);
    stack.pop();
    return [];
  };

  const ordered = [...nodes].sort();
  for (const n of ordered) {
    if (color.get(n) === WHITE) {
      const c = visit(n);
      if (c.length > 0) return c;
    }
  }
  return [];
}

function topoSort(nodes: Set<string>, edgesOf: (n: string) => string[]): string[] {
  // Post-order DFS yields a dependency-first topological order deterministically:
  // a dependency is emitted before any node that depends on it (>= installOrder).
  const sorted = [...nodes].sort();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(node: string): boolean {
    if (visited.has(node)) return true;
    if (visiting.has(node)) return false; // cycle
    visiting.add(node);
    for (const dep of edgesOf(node).slice().sort()) {
      if (!visit(dep)) return false;
    }
    visiting.delete(node);
    visited.add(node);
    order.push(node);
    return true;
  }

  for (const n of sorted) {
    if (!visit(n)) return [];
  }
  return order;
}
