import type { BusinessCapability, CapabilityStatus } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";

const capabilityStatus = new Map<string, CapabilityStatus>();

function initialize(): void {
  if (capabilityStatus.size > 0) return;
  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    capabilityStatus.set(cap.id, cap.status);
  }
}
initialize();

export function getCapabilityStatus(capabilityId: string): CapabilityStatus | undefined {
  return capabilityStatus.get(capabilityId);
}

export function setCapabilityStatus(capabilityId: string, status: CapabilityStatus): boolean {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return false;
  capabilityStatus.set(capabilityId, status);
  return true;
}

export function isCapabilityActive(capabilityId: string): boolean {
  const status = capabilityStatus.get(capabilityId);
  return status === "active" || status === "beta";
}

export function getActiveCapabilities(): BusinessCapability[] {
  return CapabilityRegistry.getAllCapabilities().filter(c => {
    const s = capabilityStatus.get(c.id);
    return s === "active" || s === "beta";
  });
}

export function getCapabilitiesByStatus(status: CapabilityStatus): BusinessCapability[] {
  return CapabilityRegistry.getAllCapabilities().filter(c => capabilityStatus.get(c.id) === status);
}

export function getCapabilityOwner(capabilityId: string): string | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.ownerExecutive;
}

export function getCapabilityDomain(capabilityId: string): string | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.domain;
}

export function getCapabilityVersion(capabilityId: string): string | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.version;
}

export function resetStatuses(): void {
  capabilityStatus.clear();
  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    capabilityStatus.set(cap.id, cap.status);
  }
}
