import type { BusinessCapability } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";

export interface DependencyInfo {
  capabilityId: string;
  name: string;
  resolved: boolean;
  active: boolean;
  missing: string[];
}

export function getDependencies(capabilityId: string): string[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.dependencies || [];
}

export function getDependents(capabilityId: string): string[] {
  return CapabilityRegistry.getAllCapabilities()
    .filter(c => c.dependencies.includes(capabilityId))
    .map(c => c.id);
}

export function resolveDependencyChain(capabilityId: string): string[] {
  const visited = new Set<string>();
  const chain: string[] = [];

  function traverse(id: string): void {
    const cap = CapabilityRegistry.getCapabilityById(id);
    if (!cap || visited.has(id)) return;
    visited.add(id);
    for (const dep of cap.dependencies) {
      traverse(dep);
    }
    chain.push(id);
  }

  traverse(capabilityId);
  return chain;
}

export function resolveUpstreamDependencies(capabilityId: string): DependencyInfo[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return [];

  return cap.dependencies.map(depId => {
    const dep = CapabilityRegistry.getCapabilityById(depId);
    return {
      capabilityId: depId,
      name: dep?.name || "Unknown",
      resolved: !!dep,
      active: dep?.status === "active" || dep?.status === "beta",
      missing: dep ? [] : [depId],
    };
  });
}

export function resolveDownstreamDependents(capabilityId: string): DependencyInfo[] {
  const dependents = getDependents(capabilityId);
  return dependents.map(depId => {
    const dep = CapabilityRegistry.getCapabilityById(depId);
    return {
      capabilityId: depId,
      name: dep?.name || "Unknown",
      resolved: !!dep,
      active: dep?.status === "active" || dep?.status === "beta",
      missing: dep ? [] : [depId],
    };
  });
}

export function getDependencyTree(capabilityId: string): Record<string, unknown> {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return { error: "Capability not found" };

  const upstream = resolveUpstreamDependencies(capabilityId);
  const downstream = resolveDownstreamDependents(capabilityId);
  const chain = resolveDependencyChain(capabilityId);

  return {
    capability: cap.id,
    name: cap.name,
    upstream,
    downstream,
    dependencyChain: chain,
    totalUpstream: upstream.length,
    totalDownstream: downstream.length,
  };
}

export function areDependenciesSatisfied(capabilityId: string): boolean {
  const depInfo = resolveUpstreamDependencies(capabilityId);
  return depInfo.every(d => d.resolved && d.active);
}

export function findMissingDependencies(capabilityId: string): string[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return [];
  return cap.dependencies.filter(depId => !CapabilityRegistry.getCapabilityById(depId));
}

export function getCapabilitiesThatNeed(capabilityId: string): string[] {
  return getDependents(capabilityId);
}
