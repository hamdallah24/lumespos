import type { BusinessCapability, CapabilityAction } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";

export function describeCapability(id: string): string {
  const cap = CapabilityRegistry.getCapabilityById(id);
  if (!cap) return `Capability '${id}' not found.`;
  const lines = [
    `## ${cap.name} (${cap.id})`,
    `Domain: ${cap.domain} | Executive: ${cap.ownerExecutive} | Version: ${cap.version}`,
    ``,
    cap.description,
    ``,
    `## Actions`,
    ...cap.supportedActions.map(a => `- **${a.name}** — ${a.purpose}
  - Approval: ${a.approvalLevel} | Risk: ${a.riskLevel}
  - Handler: ${a.executionHandler}
  - Events: ${a.eventsGenerated.join(", ")}`),
    ``,
    `## Dependencies: ${cap.dependencies.length > 0 ? cap.dependencies.join(", ") : "None"}`,
    `## KPIs: ${cap.affectedKPIs.join(", ")}`,
    `## Risk: ${cap.estimatedRisk} | Complexity: ${cap.estimatedComplexity}`,
  ];
  return lines.join("\n");
}

export function describeAction(capabilityId: string, actionName: string): string {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return `Capability '${capabilityId}' not found.`;
  const action = cap.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
  if (!action) return `Action '${actionName}' not found in ${cap.name}.`;
  return formatActionDetail(cap, action);
}

export function summarizeCapability(id: string): Record<string, unknown> {
  const cap = CapabilityRegistry.getCapabilityById(id);
  if (!cap) return { error: "Capability not found" };
  return {
    id: cap.id,
    name: cap.name,
    domain: cap.domain,
    owner: cap.ownerExecutive,
    actions: cap.supportedActions.length,
    risk: cap.estimatedRisk,
    complexity: cap.estimatedComplexity,
    dependencies: cap.dependencies,
    status: cap.status,
  };
}

export function getActionMetadata(capabilityId: string, actionName: string): CapabilityAction | undefined {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  return cap?.supportedActions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
}

export function listAllCapabilities(): string[] {
  return CapabilityRegistry.getAllCapabilities().map(c => `${c.id} — ${c.name} (${c.domain}, ${c.ownerExecutive})`);
}

export function listActionsForExecutive(executive: string): { capabilityId: string; capabilityName: string; action: string }[] {
  const results: { capabilityId: string; capabilityName: string; action: string }[] = [];
  const caps = CapabilityRegistry.getCapabilitiesByExecutive(executive);
  for (const cap of caps) {
    for (const action of cap.supportedActions) {
      results.push({ capabilityId: cap.id, capabilityName: cap.name, action: action.name });
    }
  }
  return results;
}

function formatActionDetail(cap: BusinessCapability, action: CapabilityAction): string {
  return `## ${action.name}
**Capability**: ${cap.name} (${cap.id})
**Purpose**: ${action.purpose}
**When Used**: ${action.whenUsed}
**Approval Level**: ${action.approvalLevel}
**Risk Level**: ${action.riskLevel}
**Execution Handler**: ${action.executionHandler}
**Events Generated**: ${action.eventsGenerated.join(", ")}

**Required Context**:
${action.requiredContext.map(c => `- ${c}`).join("\n")}

**KPIs Affected**:
${action.kpisAffected.map(k => `- ${k}`).join("\n")}

**Business Constraints**:
${action.businessConstraints.map(c => `- ${c}`).join("\n")}

**Examples**:
${action.examples.map(e => `- ${e}`).join("\n")}`;
}
