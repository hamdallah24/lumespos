import type { BusinessCapability, CapabilityAction, CapabilityDomain } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityManager from "./CapabilityManager";

export function resolveCapability(id: string): BusinessCapability | undefined {
  return CapabilityRegistry.getCapabilityById(id);
}

export function resolveCapabilities(ids: string[]): BusinessCapability[] {
  return ids.map(id => CapabilityRegistry.getCapabilityById(id)).filter((c): c is BusinessCapability => c !== undefined);
}

export function resolveAction(capabilityId: string, actionName: string): (BusinessCapability & { resolvedAction: CapabilityAction }) | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return undefined;
  const action = cap.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
  if (!action) return undefined;
  return { ...cap, resolvedAction: action };
}

export function resolveActions(actionNames: string[]): { capability: BusinessCapability; action: CapabilityAction }[] {
  const results: { capability: BusinessCapability; action: CapabilityAction }[] = [];
  for (const name of actionNames) {
    const found = CapabilityRegistry.getAllActionsByActionName(name);
    for (const f of found) {
      results.push(f);
    }
  }
  return results;
}

export function resolveByContext(context: Record<string, unknown>): BusinessCapability[] {
  const contextKeys = Object.keys(context).map(k => k.toLowerCase());
  return CapabilityRegistry.getAllCapabilities().filter(cap => {
    if (!CapabilityManager.isCapabilityActive(cap.id)) return false;
    return cap.requiredContext.some(req => contextKeys.includes(req.toLowerCase()));
  });
}

export function resolveByExecutive(executive: string): BusinessCapability[] {
  return CapabilityRegistry.getCapabilitiesByExecutive(executive).filter(c => CapabilityManager.isCapabilityActive(c.id));
}

export function resolveByDomain(domain: CapabilityDomain): BusinessCapability[] {
  return CapabilityRegistry.getCapabilitiesByDomain(domain).filter(c => CapabilityManager.isCapabilityActive(c.id));
}

export function resolveHandler(capabilityId: string, actionName: string): string | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return undefined;
  const action = cap.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
  return action?.executionHandler;
}

export function resolveApprovalLevel(capabilityId: string, actionName: string): string | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return undefined;
  const action = cap.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
  return action?.approvalLevel;
}

export function resolveRequiredCapabilities(capabilityId: string): string[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.requiredCapabilities || [];
}

export function resolveExecutivesForAction(actionName: string): string[] {
  const results = CapabilityRegistry.getAllActionsByActionName(actionName);
  return [...new Set(results.map(r => r.capability.ownerExecutive))];
}

export function resolveAllEvents(): string[] {
  const eventSet = new Set<string>();
  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    for (const evt of cap.generatedEvents) eventSet.add(evt);
  }
  return Array.from(eventSet).sort();
}

export function resolveAllKPIs(): string[] {
  const kpiSet = new Set<string>();
  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    for (const kpi of cap.affectedKPIs) kpiSet.add(kpi);
  }
  return Array.from(kpiSet).sort();
}
