import { SecurityMonitor } from "./SecurityMonitor";

export type Permission = string;
export type Role = string;

const ROLE_PERMISSIONS = new Map<Role, Set<Permission>>();
const SUBJECT_PERMISSIONS = new Map<string, Set<Permission>>();

export const Authorization = {
  defineRole(role: Role, permissions: Permission[]): void {
    ROLE_PERMISSIONS.set(role.toUpperCase(), new Set(permissions));
  },

  grant(subjectId: string, permission: Permission): void {
    if (!SUBJECT_PERMISSIONS.has(subjectId)) SUBJECT_PERMISSIONS.set(subjectId, new Set());
    SUBJECT_PERMISSIONS.get(subjectId)!.add(permission);
  },

  revoke(subjectId: string, permission: Permission): void {
    SUBJECT_PERMISSIONS.get(subjectId)?.delete(permission);
  },

  check(subjectId: string, role: Role | null, permission: Permission): boolean {
    const direct = SUBJECT_PERMISSIONS.get(subjectId);
    if (direct?.has(permission)) return true;
    if (role) {
      const rolePerms = ROLE_PERMISSIONS.get(role.toUpperCase());
      if (rolePerms?.has(permission)) return true;
    }
    return false;
  },

  assert(subjectId: string, role: Role | null, permission: Permission): void {
    if (!this.check(subjectId, role, permission)) {
      SecurityMonitor.report("PERMISSION_DENIED", subjectId, `Lacks "${permission}"`, "high");
      SecurityMonitor.detectBruteForce(subjectId);
      throw new Error(`Permission denied: "${permission}" is not granted to "${subjectId}"`);
    }
  },

  clear(): void { ROLE_PERMISSIONS.clear(); SUBJECT_PERMISSIONS.clear(); },
};
