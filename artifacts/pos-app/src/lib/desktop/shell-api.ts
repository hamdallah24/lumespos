/**
 * Lumé OS Shell API — Frozen Public Interface
 * T13S Phase 14
 *
 * Applications may only use these APIs.
 * No direct internal access to stores, controllers, or engines.
 *
 * @since 1.0.0
 */

import { useDesktopStore } from "./store";
import { useNotificationStore } from "./notification-store";
import { useWorkspaceStore } from "./workspace-store";
import { useThemeStore, type ThemeId, type Theme } from "./theme-engine";
import { useSessionEngine } from "./session-engine";
import { useDockStore } from "./dock-engine";
import { appRegistry, getAppById } from "./registry";
import { desktopEventBus, emit } from "./event-bus";
import { registerCommand as _registerCommand, unregisterCommand as _unregisterCommand } from "./command-registry";
import type { CommandItem, WindowState, Notification, Workspace } from "./types";
import type { DesktopEvent } from "./event-bus";

/* ═══════════════════════════════════════════════════════════════════════════════
 *  1. DesktopAPI — Desktop Shell Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface DesktopAPIValue {
  /** Shell version — @since 1.0.0 */
  readonly version: string;
  /** Target platform — @since 1.0.0 */
  readonly platform: "web";
  /** Open an app by registry ID — @since 1.0.0 */
  openApp(appId: string): void;
  /** Close every open window — @since 1.0.0 */
  closeAllWindows(): void;
  /** Number of currently open windows — @since 1.0.0 */
  getWindowCount(): number;
  /** Show a notification to the user — @since 1.0.0 */
  notify(title: string, message: string, type?: "info" | "success" | "warning" | "error"): void;
  /** Register a command in the command palette — @since 1.0.0 */
  registerCommand(command: CommandItem): void;
  /** Unregister a command by ID — @since 1.0.0 */
  unregisterCommand(id: string): void;
  /** Emit a desktop event — @since 1.0.0 */
  emit(event: DesktopEvent): void;
  /** Subscribe to all desktop events (returns unsubscribe) — @since 1.0.0 */
  onEvent(handler: (event: DesktopEvent) => void): () => void;
  /** Subscribe to a specific event type (returns unsubscribe) — @since 1.0.0 */
  onEventTyped<T extends DesktopEvent["type"]>(
    type: T,
    handler: (event: Extract<DesktopEvent, { type: T }>) => void
  ): () => void;
}

/**
 * Desktop shell operations.
 * Must be called inside a React component (uses store hooks internally).
 *
 * @since 1.0.0
 */
export function useDesktopAPI(): DesktopAPIValue {
  const store = useDesktopStore();
  const notifStore = useNotificationStore();

  return {
    version: "1.0.0",
    platform: "web",

    openApp(appId: string) {
      const app = getAppById(appId);
      if (app) store.openApp(app);
    },

    closeAllWindows: store.closeAllWindows,

    getWindowCount() {
      return store.state.windows.length;
    },

    notify(
      title: string,
      message: string,
      type: "info" | "success" | "warning" | "error" = "info"
    ) {
      notifStore.addNotification({ title, message, type, source: "shell-api" });
    },

    registerCommand: _registerCommand,
    unregisterCommand: _unregisterCommand,

    emit: desktopEventBus.emit.bind(desktopEventBus),
    onEvent: desktopEventBus.on.bind(desktopEventBus),
    onEventTyped: desktopEventBus.onType.bind(desktopEventBus),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  2. WindowAPI — Window Operations (scoped to a single window)
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface WindowAPIValue {
  /** The window this API is scoped to — @since 1.0.0 */
  readonly windowId: string;
  /** Current window title — @since 1.0.0 */
  readonly title: string;
  /** App that owns this window — @since 1.0.0 */
  readonly appId: string;
  /** Whether the window is minimized — @since 1.0.0 */
  readonly isMinimized: boolean;
  /** Whether the window is maximized — @since 1.0.0 */
  readonly isMaximized: boolean;
  /** Whether the window is pinned — @since 1.0.0 */
  readonly isPinned: boolean;
  /** Whether the window is set to always-on-top — @since 1.0.0 */
  readonly isAlwaysOnTop: boolean;
  /** Close this window — @since 1.0.0 */
  close(): void;
  /** Minimize this window — @since 1.0.0 */
  minimize(): void;
  /** Maximize this window — @since 1.0.0 */
  maximize(): void;
  /** Restore this window from minimized/maximized — @since 1.0.0 */
  restore(): void;
  /** Bring this window to focus — @since 1.0.0 */
  focus(): void;
  /** Pin this window — @since 1.0.0 */
  pin(): void;
  /** Unpin this window — @since 1.0.0 */
  unpin(): void;
  /** Set always-on-top for this window — @since 1.0.0 */
  setAlwaysOnTop(value: boolean): void;
}

/**
 * Window operations scoped to a specific window ID.
 * Must be called inside a React component.
 *
 * @param windowId - The ID of the window to operate on.
 * @since 1.0.0
 */
export function useWindowAPI(windowId: string): WindowAPIValue {
  const store = useDesktopStore();
  const win = store.state.windows.find((w) => w.id === windowId);

  return {
    windowId,
    title: win?.title ?? "",
    appId: win?.appId ?? "",
    isMinimized: win?.isMinimized ?? false,
    isMaximized: win?.isMaximized ?? false,
    isPinned: win?.isPinned ?? false,
    isAlwaysOnTop: win?.isAlwaysOnTop ?? false,

    close() {
      store.closeWindow(windowId);
    },
    minimize() {
      store.minimizeWindow(windowId);
    },
    maximize() {
      store.maximizeWindow(windowId);
    },
    restore() {
      store.restoreWindow(windowId);
    },
    focus() {
      store.focusWindow(windowId);
    },
    pin() {
      store.pinWindow(windowId);
    },
    unpin() {
      store.unpinWindow(windowId);
    },
    setAlwaysOnTop(value: boolean) {
      store.setAlwaysOnTop(windowId, value);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  3. WorkspaceAPI — Workspace Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface WorkspaceAPIValue {
  /** All available workspaces — @since 1.0.0 */
  readonly workspaces: Workspace[];
  /** The currently active workspace — @since 1.0.0 */
  readonly activeWorkspace: Workspace;
  /** Create a new workspace — @since 1.0.0 */
  createWorkspace(name: string, icon?: string): void;
  /** Delete a workspace by ID — @since 1.0.0 */
  deleteWorkspace(workspaceId: string): void;
  /** Rename a workspace — @since 1.0.0 */
  renameWorkspace(workspaceId: string, name: string): void;
  /** Switch to a different workspace — @since 1.0.0 */
  switchWorkspace(workspaceId: string): void;
  /** Duplicate an existing workspace with a new name — @since 1.0.0 */
  duplicateWorkspace(workspaceId: string, newName: string): void;
  /** Add a window to a workspace — @since 1.0.0 */
  addWindowToWorkspace(workspaceId: string, windowId: string): void;
  /** Remove a window from a workspace — @since 1.0.0 */
  removeWindowFromWorkspace(workspaceId: string, windowId: string): void;
}

/**
 * Workspace management operations.
 * Must be called inside a React component.
 *
 * @since 1.0.0
 */
export function useWorkspaceAPI(): WorkspaceAPIValue {
  const ws = useWorkspaceStore();

  return {
    workspaces: ws.workspaces,
    activeWorkspace: ws.activeWorkspace,
    createWorkspace: ws.createWorkspace,
    deleteWorkspace: ws.deleteWorkspace,
    renameWorkspace: ws.renameWorkspace,
    switchWorkspace: ws.switchWorkspace,
    duplicateWorkspace: ws.duplicateWorkspace,
    addWindowToWorkspace: ws.addWindowToWorkspace,
    removeWindowFromWorkspace: ws.removeWindowFromWorkspace,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  4. DockAPI — Dock Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface DockAPIValue {
  /** All dock-eligible apps from the registry — @since 1.0.0 */
  readonly dockApps: typeof appRegistry;
  /** Number of open windows for a given app — @since 1.0.0 */
  openCount(appId: string): number;
  /** Whether an app currently has any open windows — @since 1.0.0 */
  isRunning(appId: string): boolean;
  /** Pinned app IDs — @since 1.0.0 */
  readonly pinnedApps: string[];
  /** Recently used app IDs — @since 1.0.0 */
  readonly recentApps: string[];
  /** Badge counts per app — @since 1.0.0 */
  readonly badges: Record<string, number>;
  /** Check if an app is pinned in the dock — @since 1.0.0 */
  isPinned(appId: string): boolean;
  /** Set the full list of pinned apps — @since 1.0.0 */
  setPinned(appIds: string[]): void;
  /** Pin an app to the dock — @since 1.0.0 */
  addPinned(appId: string): void;
  /** Unpin an app from the dock — @since 1.0.0 */
  removePinned(appId: string): void;
  /** Record an app as recently used — @since 1.0.0 */
  addRecent(appId: string): void;
  /** Set a badge count on an app — @since 1.0.0 */
  setBadge(appId: string, count: number): void;
  /** Clear the badge on an app — @since 1.0.0 */
  clearBadge(appId: string): void;
  /** Reorder pinned apps — @since 1.0.0 */
  reorderApp(from: number, to: number): void;
  /** Get the resolved dock items with runtime metadata — @since 1.0.0 */
  getDockItems(): Array<{
    id: string;
    title: string;
    icon: string;
    color: string;
    isOpen: boolean;
    isActive: boolean;
    badge: number;
  }>;
}

/**
 * Dock management operations.
 * Must be called inside a React component.
 *
 * @since 1.0.0
 */
export function useDockAPI(): DockAPIValue {
  const store = useDesktopStore();
  const dock = useDockStore();

  const dockApps = appRegistry.filter((a) =>
    ["pos", "finance", "inventory", "crm", "hr", "ai-chat", "marketplace", "settings"].includes(a.id)
  );

  return {
    dockApps,

    openCount(appId: string): number {
      return store.state.windows.filter((w) => w.appId === appId).length;
    },

    isRunning(appId: string): boolean {
      return store.state.windows.some((w) => w.appId === appId);
    },

    pinnedApps: dock.pinnedApps,
    recentApps: dock.recentApps,
    badges: dock.badges,
    isPinned: dock.isPinned,
    setPinned: dock.setPinned,
    addPinned: dock.addPinned,
    removePinned: dock.removePinned,
    addRecent: dock.addRecent,
    setBadge: dock.setBadge,
    clearBadge: dock.clearBadge,
    reorderApp: dock.reorderApp,
    getDockItems: dock.getDockApps,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  5. NotificationAPI — Notification Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface NotificationAPIValue {
  /** All notifications — @since 1.0.0 */
  readonly notifications: Notification[];
  /** Number of unread notifications — @since 1.0.0 */
  readonly unreadCount: number;
  /** Add a new notification — @since 1.0.0 */
  add(notification: Omit<Notification, "id" | "read" | "pinned" | "archived" | "timestamp">): void;
  /** Mark a single notification as read — @since 1.0.0 */
  markRead(id: string): void;
  /** Mark all notifications as read — @since 1.0.0 */
  markAllRead(): void;
  /** Pin a notification — @since 1.0.0 */
  pin(id: string): void;
  /** Unpin a notification — @since 1.0.0 */
  unpin(id: string): void;
  /** Archive a notification — @since 1.0.0 */
  archive(id: string): void;
  /** Permanently delete a notification — @since 1.0.0 */
  delete(id: string): void;
  /** Clear all notifications — @since 1.0.0 */
  clear(): void;
}

/**
 * Notification management operations.
 * Must be called inside a React component.
 *
 * @since 1.0.0
 */
export function useNotificationAPI(): NotificationAPIValue {
  const ns = useNotificationStore();

  return {
    notifications: ns.state.notifications,
    unreadCount: ns.state.unreadCount,
    add: ns.addNotification,
    markRead: ns.markRead,
    markAllRead: ns.markAllRead,
    pin: ns.pinNotification,
    unpin: ns.unpinNotification,
    archive: ns.archiveNotification,
    delete: ns.deleteNotification,
    clear: ns.clearAll,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  6. ThemeAPI — Theme Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface ThemeAPIValue {
  /** Current resolved theme ID — @since 1.0.0 */
  readonly themeId: ThemeId;
  /** Whether auto (system preference) mode is active — @since 1.0.0 */
  readonly autoMode: boolean;
  /** All available themes — @since 1.0.0 */
  readonly themes: Theme[];
  /** Switch to a specific theme — @since 1.0.0 */
  setTheme(themeId: ThemeId): void;
  /** Toggle auto (system preference) mode — @since 1.0.0 */
  setAuto(auto: boolean): void;
}

/**
 * Theme management operations.
 * Must be called inside a React component.
 *
 * @since 1.0.0
 */
export function useThemeAPI(): ThemeAPIValue {
  const theme = useThemeStore();

  return {
    themeId: theme.themeId,
    autoMode: theme.autoMode,
    themes: theme.themes,
    setTheme: theme.setTheme,
    setAuto: theme.setAuto,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  7. SessionAPI — Session Operations
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface SessionAPIValue {
  /** Current user ID — @since 1.0.0 */
  readonly userId: string | null;
  /** Current user display name — @since 1.0.0 */
  readonly userName: string | null;
  /** Current user role — @since 1.0.0 */
  readonly userRole: string | null;
  /** Whether a user session is authenticated — @since 1.0.0 */
  readonly isAuthenticated: boolean;
  /** Timestamp of last save (ms since epoch) — @since 1.0.0 */
  readonly lastSaved: number;
  /** Duration of current session (ms) — @since 1.0.0 */
  readonly sessionDuration: number;
  /** Persist the current session to storage — @since 1.0.0 */
  save(): void;
  /** Clear the session and all persisted data — @since 1.0.0 */
  clear(): void;
}

/**
 * Session management operations.
 * Must be called inside a React component.
 *
 * @since 1.0.0
 */
export function useSessionAPI(): SessionAPIValue {
  const session = useSessionEngine();

  return {
    userId: session.userId,
    userName: session.userName,
    userRole: session.userRole,
    isAuthenticated: session.isAuthenticated,
    lastSaved: session.lastSaved,
    sessionDuration: session.sessionDuration,
    save: session.save,
    clear: session.clear,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  Unified ShellAPI — Combined Namespace
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface ShellAPIValue {
  /** Desktop shell operations — @since 1.0.0 */
  readonly desktop: DesktopAPIValue;
  /** Notification operations — @since 1.0.0 */
  readonly notification: NotificationAPIValue;
  /** Theme operations — @since 1.0.0 */
  readonly theme: ThemeAPIValue;
  /** Session operations — @since 1.0.0 */
  readonly session: SessionAPIValue;
  /** Workspace operations — @since 1.0.0 */
  readonly workspace: WorkspaceAPIValue;
  /** Dock operations — @since 1.0.0 */
  readonly dock: DockAPIValue;
}

/**
 * Unified Shell API — provides access to all frozen public interfaces.
 * Must be called inside a React component (all underlying stores are React hooks).
 *
 * This is the single entry point applications should use. Do not
 * import individual stores, engines, or internal modules directly.
 *
 * @since 1.0.0
 */
export function useShellAPI(): ShellAPIValue {
  return {
    desktop: useDesktopAPI(),
    notification: useNotificationAPI(),
    theme: useThemeAPI(),
    session: useSessionAPI(),
    workspace: useWorkspaceAPI(),
    dock: useDockAPI(),
  };
}
