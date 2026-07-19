/**
 * Lumé OS Application SDK
 * T13X Phase 11
 *
 * All ERP applications must use these hooks.
 * ERP must not know Desktop internals.
 * Only through the SDK.
 */

import React, { useCallback, useContext } from "react";
import { useShellContext, useWorkspaceContext, useWindowContext, useThemeContext, useSessionContext, useAIContext } from "./app-contract";
import { useDesktopStore } from "./store";
import { useNotificationStore } from "./notification-store";
import { useWorkspaceStore } from "./workspace-store";
import { useExecutiveStore } from "./executive-store";
import { useThemeStore } from "./theme-engine";
import { useDesktopEvent, emit } from "./event-bus";
import { useAppRuntime, type AppInstance } from "./app-runtime";
import { useAIRuntime, type AIMission } from "./ai-runtime";
import { usePermissionEngine, type RoleLevel } from "./permission-engine";
import { useSessionEngine } from "./session-engine";
import { registerCommand, unregisterCommand } from "./command-registry";
import type { CommandItem, Notification, AIExecutive } from "./types";
import { useEffect, useRef } from "react";

/* ─── useApplication ─── */
// Core application lifecycle hook

export function useApplication(appId: string) {
  const shell = useShellContext();
  const runtime = useAppRuntime();
  const permission = usePermissionEngine();

  const instance = runtime.instances.find((i) => i.manifestId === appId);
  const isActive = instance?.lifecycle === "active";

  return {
    // Identity
    appId,
    
    // Lifecycle
    lifecycle: instance?.lifecycle || "destroyed",
    isActive,
    instance,
    
    // Shell operations
    open: () => shell.openApp(appId),
    close: () => {
      if (instance) runtime.closeApp(instance.id);
    },
    focus: () => {
      if (instance?.windowId) shell.focusWindow(instance.windowId);
    },
    
    // Permissions
    hasPermission: permission.has,
    hasAnyPermission: permission.hasAny,
    hasAllPermissions: permission.hasAll,
    
    // Session data
    getSessionData: <T = unknown>(key: string) => instance ? runtime.getSessionData<T>(instance.id, key) : undefined,
    setSessionData: (key: string, value: unknown) => {
      if (instance) runtime.setSessionData(instance.id, key, value);
    },
    
    // Notifications
    notify: shell.notify,
    
    // Commands
    registerCommand,
    unregisterCommand,
  };
}

/* ─── useWindow ─── */
// Window-specific operations

export function useWindow() {
  const winCtx = useWindowContext();
  const store = useDesktopStore();
  
  const win = store.state.windows.find((w) => w.id === winCtx.windowId);

  return {
    // Identity
    windowId: winCtx.windowId,
    appId: winCtx.appId,
    title: winCtx.title,
    
    // State
    isFocused: winCtx.isFocused,
    isMaximized: winCtx.isMaximized,
    isMinimized: winCtx.isMinimized,
    isPinned: win?.isPinned || false,
    isAlwaysOnTop: win?.isAlwaysOnTop || false,
    
    // Dimensions
    x: win?.x || 0,
    y: win?.y || 0,
    width: win?.width || 800,
    height: win?.height || 500,
    
    // Actions
    setTitle: winCtx.setTitle,
    close: () => store.closeWindow(winCtx.windowId),
    minimize: () => store.minimizeWindow(winCtx.windowId),
    maximize: () => store.maximizeWindow(winCtx.windowId),
    restore: () => store.restoreWindow(winCtx.windowId),
    focus: () => store.focusWindow(winCtx.windowId),
    pin: () => store.pinWindow(winCtx.windowId),
    unpin: () => store.unpinWindow(winCtx.windowId),
    setAlwaysOnTop: (v: boolean) => store.setAlwaysOnTop(winCtx.windowId, v),
    move: (x: number, y: number) => store.moveWindow(winCtx.windowId, x, y),
    resize: (w: number, h: number) => store.resizeWindow(winCtx.windowId, w, h),
  };
}

/* ─── useMission ─── */
// Mission management for apps

export function useMission(appId?: string) {
  const ai = useAIRuntime();
  
  const missions = appId ? ai.getActiveMissions(appId) : ai.missions;

  const createMission = useCallback((params: {
    title: string;
    description: string;
    executive?: string;
    priority?: "low" | "medium" | "high" | "critical";
    tools?: string[];
  }) => {
    return ai.createMission({
      ...params,
      assignedApp: appId || undefined,
      assignedExecutive: params.executive || "caio",
    });
  }, [appId]);

  const completeMission = useCallback((missionId: string, result?: unknown) => {
    ai.updateMission(missionId, { status: "completed", progress: 100, result });
  }, []);

  const failMission = useCallback((missionId: string, error: string) => {
    ai.updateMission(missionId, { status: "failed", result: { error } });
  }, []);

  return {
    missions,
    activeMissions: missions.filter((m) => m.status === "active" || m.status === "pending"),
    completedMissions: missions.filter((m) => m.status === "completed"),
    createMission,
    completeMission,
    failMission,
    updateMission: ai.updateMission,
  };
}

/* ─── useExecutive ─── */
// Executive access

export function useExecutive(executiveId?: string) {
  const { executives } = useExecutiveStore();
  const ai = useAIRuntime();
  
  const exec = executiveId ? executives.find((e) => e.id === executiveId) : null;
  const activeExecs = executives.filter((e) => e.status === "thinking" || e.status === "executing");

  return {
    executives,
    executive: exec,
    activeExecutives: activeExecs,
    activeCount: activeExecs.length,
    health: ai.health,
    createMission: ai.createMission,
  };
}

/* ─── useRuntime ─── */
// Low-level runtime access

export function useRuntime() {
  const runtime = useAppRuntime();
  const ai = useAIRuntime();
  const session = useSessionEngine();
  const backgroundServices = React.useMemo(() => {
    // Lazy import to avoid circular deps
    try {
      return require("./background-services").useBackgroundServices();
    } catch {
      return null;
    }
  }, []);

  return {
    // App instances
    instances: runtime.instances,
    activeInstances: runtime.activeInstances,
    
    // AI
    aiHealth: ai.health,
    missions: ai.missions,
    
    // Session
    sessionDuration: session.sessionDuration,
    save: session.save,
    
    // Performance
    getInstanceCount: runtime.instances.length,
  };
}

/* ─── useNotification ─── */
// Notification operations for apps

export function useAppNotification() {
  const ns = useNotificationStore();

  const notify = useCallback((title: string, message: string, type: Notification["type"] = "info") => {
    ns.addNotification({ title, message, type, source: "app" });
  }, []);

  return {
    notifications: ns.state.notifications,
    unreadCount: ns.state.unreadCount,
    notify,
    markRead: ns.markRead,
    markAllRead: ns.markAllRead,
  };
}

/* ─── useWorkspace (SDK version) ─── */

export function useAppWorkspace() {
  const wsCtx = useWorkspaceContext();
  const wsStore = useWorkspaceStore();
  const engine = React.useMemo(() => {
    try {
      return require("./workspace-engine").useWorkspaceEngine();
    } catch {
      return null;
    }
  }, []);

  return {
    workspaceId: wsCtx.workspaceId,
    workspaceName: wsCtx.workspaceName,
    switchWorkspace: wsCtx.switchWorkspace,
    workspaces: wsStore.workspaces,
    activeWorkspace: wsStore.activeWorkspace,
    createWorkspace: wsStore.createWorkspace,
    // Extended (if engine available)
    ...(engine ? {
      setScrollPosition: engine.setScrollPosition,
      getScrollPosition: engine.getScrollPosition,
      setOpenTab: engine.setOpenTab,
      getOpenTab: engine.getOpenTab,
    } : {}),
  };
}

/* ─── usePermission (SDK version) ─── */

export function useAppPermission(requiredPermissions?: string[]) {
  const perm = usePermissionEngine();

  const hasAccess = requiredPermissions
    ? perm.hasAll(requiredPermissions)
    : true;

  return {
    userRole: perm.userRole,
    activeRole: perm.activeRole,
    hasAccess,
    has: perm.has,
    hasAny: perm.hasAny,
    hasAll: perm.hasAll,
    resolvedPermissions: perm.resolvedPermissions,
  };
}

/* ─── useTheme (SDK version) ─── */

export function useAppTheme() {
  const themeCtx = useThemeContext();
  return {
    themeId: themeCtx.themeId,
    colors: themeCtx.colors,
    setTheme: themeCtx.setTheme,
  };
}

/* ─── useSession (SDK version) ─── */

export function useAppSession() {
  const sessionCtx = useSessionContext();
  return {
    userId: sessionCtx.userId,
    userName: sessionCtx.userName,
    userRole: sessionCtx.userRole,
    isAuthenticated: sessionCtx.isAuthenticated,
  };
}

/* ─── useDesktopEvent (re-export for convenience) ─── */
export { useDesktopEvent as useEvent };
