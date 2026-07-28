import type { BusinessCapability, ValidationResult } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityManager from "./CapabilityManager";
import * as CapabilityDependency from "./CapabilityDependency";

export function validateCapabilityAction(capabilityId: string, actionName: string, context?: Record<string, unknown>): ValidationResult {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) {
    return { valid: false, capabilityId, action: actionName, issues: [{ field: "capabilityId", message: `Capability '${capabilityId}' tidak ditemukan`, severity: "error" }] };
  }

  const issues: { field: string; message: string; severity: "error" | "warning" }[] = [];

  if (cap.status !== "active" && cap.status !== "beta") {
    issues.push({ field: "status", message: `Capability '${cap.name}' berstatus ${cap.status}`, severity: "error" });
  }

  const action = cap.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
  if (!action) {
    issues.push({ field: "actionName", message: `Action '${actionName}' tidak ditemukan di capability '${cap.name}'`, severity: "error" });
    return { valid: false, capabilityId, action: actionName, issues };
  }

  if (!CapabilityDependency.areDependenciesSatisfied(capabilityId)) {
    const missing = CapabilityDependency.findMissingDependencies(capabilityId);
    issues.push({ field: "dependencies", message: `Dependencies belum terpenuhi: ${missing.join(", ")}`, severity: "error" });
  }

  if (context) {
    const missingKeys = action.requiredContext.filter(key => {
      const value = context[key];
      return value === undefined || value === null || value === "";
    });
    if (missingKeys.length > 0) {
      issues.push({ field: "requiredContext", message: `Context wajib belum terisi: ${missingKeys.join(", ")}`, severity: "error" });
    }
  }

  const isActive = CapabilityManager.isCapabilityActive(capabilityId);
  if (!isActive) {
    issues.push({ field: "status", message: `Capability '${cap.name}' tidak aktif`, severity: "error" });
  }

  return { valid: issues.filter(i => i.severity === "error").length === 0, capabilityId, action: actionName, issues };
}

export function validateCapability(capabilityId: string): ValidationResult[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) {
    return [{ valid: false, capabilityId, action: "*", issues: [{ field: "capabilityId", message: `Capability '${capabilityId}' tidak ditemukan`, severity: "error" }] }];
  }

  return cap.supportedActions.map(action => validateCapabilityAction(capabilityId, action.name));
}

export function validateExecutionContext(capabilityId: string, actionName: string, context: Record<string, unknown>): ValidationResult {
  return validateCapabilityAction(capabilityId, actionName, context);
}

export function validatePlan(capabilityIds: string[]): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const id of capabilityIds) {
    const cap = CapabilityRegistry.getCapabilityById(id);
    if (!cap) {
      errors.push(`Capability '${id}' tidak ditemukan`);
      continue;
    }
    if (!CapabilityManager.isCapabilityActive(id)) {
      warnings.push(`Capability '${cap.name}' tidak aktif`);
    }
    if (!CapabilityDependency.areDependenciesSatisfied(id)) {
      errors.push(`Capability '${cap.name}' memiliki dependency yang belum terpenuhi`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function isActionAvailable(capabilityId: string, actionName: string): boolean {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return false;
  if (!CapabilityManager.isCapabilityActive(capabilityId)) return false;
  return cap.supportedActions.some(a => a.name.toLowerCase() === actionName.toLowerCase());
}
