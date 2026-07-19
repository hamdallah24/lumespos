/**
 * Lumé OS Permission Engine
 * T13X Phase 3
 *
 * Role → Permission → Capability → Application → Feature → Action
 * All access control lives in the Desktop Shell, not in ERP.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { desktopEventBus } from "./event-bus";

/* ─── Types ─── */

export type RoleLevel = "viewer" | "operator" | "manager" | "admin" | "founder";

export interface Permission {
  id: string;                      // e.g., "pos.write", "finance.read"
  resource: string;                // e.g., "pos", "finance", "inventory"
  action: "read" | "write" | "delete" | "admin" | "manage";
  description: string;
}

export interface Role {
  id: string;
  name: string;
  level: RoleLevel;
  permissions: string[];           // permission IDs
  description: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  requiredBy: string[];            // app IDs that need this capability
}

export interface PermissionState {
  roles: Role[];
  permissions: Permission[];
  capabilities: Capability[];
  userRole: RoleLevel;
  activeRole: RoleLevel;           // effective role (may be overridden)
  customPermissions: string[];     // additional permissions granted
  revokedPermissions: string[];    // permissions explicitly revoked
}

type PermissionAction =
  | { type: "SET_USER_ROLE"; role: RoleLevel }
  | { type: "SET_ACTIVE_ROLE"; role: RoleLevel }
  | { type: "ADD_CUSTOM_PERMISSION"; permissionId: string }
  | { type: "REMOVE_CUSTOM_PERMISSION"; permissionId: string }
  | { type: "REVOKE_PERMISSION"; permissionId: string }
  | { type: "RESTORE_PERMISSION"; permissionId: string }
  | { type: "ADD_ROLE"; role: Role }
  | { type: "REMOVE_ROLE"; roleId: string }
  | { type: "UPDATE_ROLE"; roleId: string; updates: Partial<Role> }
  | { type: "ADD_PERMISSION"; permission: Permission }
  | { type: "ADD_CAPABILITY"; capability: Capability }
  | { type: "RESTORE"; state: PermissionState };

/* ─── Default Roles ─── */

const ROLE_HIERARCHY: Record<RoleLevel, number> = {
  viewer: 0,
  operator: 1,
  manager: 2,
  admin: 3,
  founder: 4,
};

const DEFAULT_ROLES: Role[] = [
  {
    id: "viewer",
    name: "Viewer",
    level: "viewer",
    permissions: ["pos.read", "inventory.read", "crm.read", "marketplace.read"],
    description: "Read-only access to basic applications",
  },
  {
    id: "operator",
    name: "Operator",
    level: "operator",
    permissions: [
      "pos.read", "pos.write",
      "inventory.read", "inventory.write",
      "crm.read",
      "marketplace.read",
    ],
    description: "Can operate POS and manage inventory",
  },
  {
    id: "manager",
    name: "Manager",
    level: "manager",
    permissions: [
      "pos.read", "pos.write",
      "inventory.read", "inventory.write",
      "crm.read", "crm.write",
      "finance.read",
      "hr.read",
      "marketplace.read",
      "settings.read",
    ],
    description: "Can manage business operations and view finance",
  },
  {
    id: "admin",
    name: "Admin",
    level: "admin",
    permissions: [
      "pos.read", "pos.write", "pos.admin",
      "inventory.read", "inventory.write", "inventory.admin",
      "crm.read", "crm.write", "crm.admin",
      "finance.read", "finance.write", "finance.admin",
      "hr.read", "hr.write", "hr.admin",
      "marketplace.read", "marketplace.write",
      "settings.read", "settings.write", "settings.admin",
      "ai.chat",
    ],
    description: "Full administrative access to all applications",
  },
  {
    id: "founder",
    name: "Founder",
    level: "founder",
    permissions: [
      "pos.read", "pos.write", "pos.admin", "pos.manage",
      "inventory.read", "inventory.write", "inventory.admin", "inventory.manage",
      "crm.read", "crm.write", "crm.admin", "crm.manage",
      "finance.read", "finance.write", "finance.admin", "finance.manage",
      "hr.read", "hr.write", "hr.admin", "hr.manage",
      "marketplace.read", "marketplace.write", "marketplace.admin",
      "settings.read", "settings.write", "settings.admin", "settings.manage",
      "ai.chat", "ai.admin",
      "system.admin", "system.manage",
    ],
    description: "Complete access to everything including system-level controls",
  },
];

/* ─── Reducer ─── */

function permissionReducer(state: PermissionState, action: PermissionAction): PermissionState {
  switch (action.type) {
    case "SET_USER_ROLE":
      return { ...state, userRole: action.role, activeRole: action.role };
    case "SET_ACTIVE_ROLE":
      return { ...state, activeRole: action.role };
    case "ADD_CUSTOM_PERMISSION":
      return {
        ...state,
        customPermissions: [...new Set([...state.customPermissions, action.permissionId])],
        revokedPermissions: state.revokedPermissions.filter((p) => p !== action.permissionId),
      };
    case "REMOVE_CUSTOM_PERMISSION":
      return {
        ...state,
        customPermissions: state.customPermissions.filter((p) => p !== action.permissionId),
      };
    case "REVOKE_PERMISSION":
      return {
        ...state,
        revokedPermissions: [...new Set([...state.revokedPermissions, action.permissionId])],
        customPermissions: state.customPermissions.filter((p) => p !== action.permissionId),
      };
    case "RESTORE_PERMISSION":
      return {
        ...state,
        revokedPermissions: state.revokedPermissions.filter((p) => p !== action.permissionId),
      };
    case "ADD_ROLE":
      return {
        ...state,
        roles: [...state.roles.filter((r) => r.id !== action.role.id), action.role],
      };
    case "REMOVE_ROLE":
      return {
        ...state,
        roles: state.roles.filter((r) => r.id !== action.roleId),
      };
    case "UPDATE_ROLE":
      return {
        ...state,
        roles: state.roles.map((r) =>
          r.id === action.roleId ? { ...r, ...action.updates } : r
        ),
      };
    case "ADD_PERMISSION":
      return {
        ...state,
        permissions: [...state.permissions.filter((p) => p.id !== action.permission.id), action.permission],
      };
    case "ADD_CAPABILITY":
      return {
        ...state,
        capabilities: [...state.capabilities.filter((c) => c.id !== action.capability.id), action.capability],
      };
    case "RESTORE":
      return action.state;
    default:
      return state;
  }
}

/* ─── Storage ─── */

const STORAGE_KEY = "lume-permissions";

function loadState(): PermissionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PermissionState>;
      return {
        roles: parsed.roles || DEFAULT_ROLES,
        permissions: parsed.permissions || [],
        capabilities: parsed.capabilities || [],
        userRole: parsed.userRole || "viewer",
        activeRole: parsed.activeRole || parsed.userRole || "viewer",
        customPermissions: parsed.customPermissions || [],
        revokedPermissions: parsed.revokedPermissions || [],
      };
    }
  } catch {}
  return {
    roles: DEFAULT_ROLES,
    permissions: [],
    capabilities: [],
    userRole: "viewer",
    activeRole: "viewer",
    customPermissions: [],
    revokedPermissions: [],
  };
}

function saveState(state: PermissionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/* ─── Singleton ─── */

let _state: PermissionState = loadState();
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function dispatch(action: PermissionAction) {
  _state = permissionReducer(_state, action);
  saveState(_state);
  _listeners.forEach((l) => l());
}

function getState(): PermissionState {
  return _state;
}

/* ─── Permission Resolution ─── */

function resolvePermissions(state: PermissionState): string[] {
  const role = state.roles.find((r) => r.level === state.activeRole);
  const basePermissions = role ? [...role.permissions] : [];
  
  // Add custom, remove revoked
  const allPermissions = [...new Set([...basePermissions, ...state.customPermissions])];
  return allPermissions.filter((p) => !state.revokedPermissions.includes(p));
}

export function hasPermission(permissionId: string, state?: PermissionState): boolean {
  const s = state || getState();
  const resolved = resolvePermissions(s);
  return resolved.includes(permissionId);
}

export function hasAnyPermission(permissionIds: string[], state?: PermissionState): boolean {
  return permissionIds.some((id) => hasPermission(id, state));
}

export function hasAllPermissions(permissionIds: string[], state?: PermissionState): boolean {
  return permissionIds.every((id) => hasPermission(id, state));
}

export function canAccessApp(appId: string, requiredPermissions: string[], state?: PermissionState): boolean {
  return hasAllPermissions(requiredPermissions, state);
}

export function getEffectiveRole(state?: PermissionState): RoleLevel {
  return (state || getState()).activeRole;
}

export function getRoleLevel(roleId: string): number {
  return ROLE_HIERARCHY[roleId as RoleLevel] ?? 0;
}

export function isRoleAtLeast(required: RoleLevel, actual: RoleLevel): boolean {
  return (ROLE_HIERARCHY[actual] ?? 0) >= (ROLE_HIERARCHY[required] ?? 0);
}

/* ─── React Hook ─── */

export function usePermissionEngine() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const resolved = resolvePermissions(stateRef.current);

  const setUserRole = useCallback((role: RoleLevel) => {
    dispatch({ type: "SET_USER_ROLE", role });
  }, []);

  const setActiveRole = useCallback((role: RoleLevel) => {
    dispatch({ type: "SET_ACTIVE_ROLE", role });
  }, []);

  const grantPermission = useCallback((permissionId: string) => {
    dispatch({ type: "ADD_CUSTOM_PERMISSION", permissionId });
  }, []);

  const revokePermission = useCallback((permissionId: string) => {
    dispatch({ type: "REVOKE_PERMISSION", permissionId });
  }, []);

  const restorePermission = useCallback((permissionId: string) => {
    dispatch({ type: "RESTORE_PERMISSION", permissionId });
  }, []);

  const addRole = useCallback((role: Role) => {
    dispatch({ type: "ADD_ROLE", role });
  }, []);

  const removeRole = useCallback((roleId: string) => {
    dispatch({ type: "REMOVE_ROLE", roleId });
  }, []);

  const has = useCallback((permissionId: string) => {
    return hasPermission(permissionId, stateRef.current);
  }, []);

  const hasAny = useCallback((ids: string[]) => {
    return hasAnyPermission(ids, stateRef.current);
  }, []);

  const hasAll = useCallback((ids: string[]) => {
    return hasAllPermissions(ids, stateRef.current);
  }, []);

  return {
    state: stateRef.current,
    roles: stateRef.current.roles,
    userRole: stateRef.current.userRole,
    activeRole: stateRef.current.activeRole,
    resolvedPermissions: resolved,
    setUserRole,
    setActiveRole,
    grantPermission,
    revokePermission,
    restorePermission,
    addRole,
    removeRole,
    has,
    hasAny,
    hasAll,
  };
}
