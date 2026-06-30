// SPRINT 14: Authorization Runtime — permission vs capability
// Capability = permanent ability. Authorization = current permission.
// CEO can temporarily revoke CTO's deploy authorization without removing capability.

import type { AgentIdentity } from "./identity";

interface Permission {
  capability: string;
  granted: boolean;
  reason?: string;
  expiresAt?: string;
}

class Authorization {
  private permissions = new Map<string, Permission[]>();

  /** Grant a permission to an agent */
  grant(agentId: string, capability: string, reason?: string): void {
    const perms = this.getPermissions(agentId);
    const existing = perms.find(p => p.capability === capability);
    if (existing) {
      existing.granted = true;
      existing.reason = reason;
    } else {
      perms.push({ capability, granted: true, reason });
    }
    this.permissions.set(agentId, perms);
  }

  /** Revoke a permission (temporarily) */
  revoke(agentId: string, capability: string, reason: string): void {
    const perms = this.getPermissions(agentId);
    const existing = perms.find(p => p.capability === capability);
    if (existing) {
      existing.granted = false;
      existing.reason = reason;
    } else {
      perms.push({ capability, granted: false, reason });
    }
    this.permissions.set(agentId, perms);
  }

  /** Check if agent currently has permission */
  can(agentId: string, capability: string): boolean {
    const perms = this.getPermissions(agentId);
    const perm = perms.find(p => p.capability === capability);
    if (!perm) return true; // Default: if not explicitly revoked, allowed
    if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) return false;
    return perm.granted;
  }

  /** Get all permissions for agent */
  getPermissions(agentId: string): Permission[] {
    return this.permissions.get(agentId) || [];
  }

  /** Check constitutional constraint: no agent may bypass Founder */
  assertFounderSovereignty(from: AgentIdentity, to: AgentIdentity): void {
    if (to.role !== "Founder" && from.role === "CTO" && !this.can(from.id, "modifyFoundation")) {
      throw new Error(`Constitutional violation: ${from.role} may not modify the Foundation`);
    }
  }
}

// Singleton
const _auth = new Authorization();

export { _auth as authorization };

export const authorizationRuntime = {
  name: "AuthorizationRuntime",
  version: "1.0.0",
  capabilities: ["permission-management", "revocation", "constitutional-enforcement", "temporary-auth"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
