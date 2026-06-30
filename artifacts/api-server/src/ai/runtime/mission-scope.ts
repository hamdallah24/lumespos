// SPRINT 16: Mission Scope — context-based authorization
// CTO can deploy... but only for inventory. Not billing. Not auth.

interface MissionScope {
  missionId: string;
  description: string;
  allowedDomains: string[];      // e.g., ["inventory"]
  forbiddenDomains: string[];    // e.g., ["billing", "auth"]
  allowedCapabilities: string[]; // e.g., ["readFiles", "searchCode"]
  forbiddenCapabilities: string[];
  expiresAt: string;             // ISO timestamp
  grantedBy: string;             // Who authorized this
}

const _scopes = new Map<string, MissionScope[]>();
const MAX_SCOPES_PER_AGENT = 10;

/** Grant a mission scope to an agent */
export function grantScope(
  agentId: string,
  scope: Omit<MissionScope, "grantedBy"> & { grantedBy: string },
): void {
  const existing = _scopes.get(agentId) || [];
  existing.push({ ...scope });
  if (existing.length > MAX_SCOPES_PER_AGENT) existing.shift();
  _scopes.set(agentId, existing);
}

/** Check if agent can do something within mission scope */
export function withinScope(
  agentId: string,
  capability: string,
  domain: string,
): { allowed: boolean; reason?: string } {
  const scopes = _scopes.get(agentId) || [];
  if (scopes.length === 0) return { allowed: true }; // No scope = no restriction

  // Check any active scope covers this
  for (const scope of scopes) {
    if (new Date(scope.expiresAt) < new Date()) continue; // Expired
    if (scope.forbiddenDomains.includes(domain)) {
      return { allowed: false, reason: `Mission scope forbids domain "${domain}"` };
    }
    if (scope.forbiddenCapabilities.includes(capability)) {
      return { allowed: false, reason: `Mission scope forbids capability "${capability}"` };
    }
    if (scope.allowedDomains.length > 0 && !scope.allowedDomains.includes(domain)) {
      return { allowed: false, reason: `Mission scope only allows domains: ${scope.allowedDomains.join(", ")}` };
    }
  }

  return { allowed: true };
}

/** Get active scopes for an agent */
export function activeScopes(agentId: string): MissionScope[] {
  const scopes = _scopes.get(agentId) || [];
  return scopes.filter(s => new Date(s.expiresAt) > new Date());
}

export const missionScope = {
  name: "MissionScope",
  version: "1.0.0",
  capabilities: ["context-based-authorization", "domain-scoping", "capability-scoping"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
