/**
 * Lumé OS Desktop Event Bus
 * ────────────────────────
 * Centralized pub/sub system for all shell-wide communication.
 * No component calls another directly. Everything goes through events.
 *
 * T13S Phase 11 — Desktop Event Bus
 */

/* ─── Event Types ─── */
export type DesktopEvent =
  // Window events
  | { type: "WINDOW_OPENED"; windowId: string; appId: string }
  | { type: "WINDOW_CLOSED"; windowId: string; appId: string }
  | { type: "WINDOW_FOCUSED"; windowId: string }
  | { type: "WINDOW_MINIMIZED"; windowId: string }
  | { type: "WINDOW_MAXIMIZED"; windowId: string }
  | { type: "WINDOW_RESTORED"; windowId: string }
  | { type: "WINDOW_MOVED"; windowId: string; x: number; y: number }
  | { type: "WINDOW_RESIZED"; windowId: string; width: number; height: number }
  | { type: "WINDOW_PINNED"; windowId: string }
  | { type: "WINDOW_UNPINNED"; windowId: string }
  | { type: "WINDOW_ALWAYS_ON_TOP"; windowId: string; enabled: boolean }

  // Workspace events
  | { type: "WORKSPACE_CHANGED"; workspaceId: string }
  | { type: "WORKSPACE_CREATED"; workspaceId: string; name: string }
  | { type: "WORKSPACE_DELETED"; workspaceId: string }
  | { type: "WORKSPACE_RENAMED"; workspaceId: string; name: string }

  // Dock events
  | { type: "DOCK_UPDATED"; workspaceId: string }
  | { type: "DOCK_APP_ADDED"; appId: string }
  | { type: "DOCK_APP_REMOVED"; appId: string }
  | { type: "DOCK_REORDERED"; appIds: string[] }

  // Notification events
  | { type: "NOTIFICATION_ADDED"; notificationId: string; title: string }
  | { type: "NOTIFICATION_READ"; notificationId: string }
  | { type: "NOTIFICATION_DISMISSED"; notificationId: string }

  // Theme events
  | { type: "THEME_CHANGED"; theme: string }
  | { type: "MOTION_PREF_CHANGED"; prefersReduced: boolean }

  // Application events
  | { type: "APPLICATION_INSTALLED"; appId: string }
  | { type: "APPLICATION_REMOVED"; appId: string }

  // Session events
  | { type: "SESSION_RESTORED"; userId: string }
  | { type: "SESSION_SAVED"; userId: string }

  // Shell events
  | { type: "SHELL_READY" }
  | { type: "OVERLAY_OPENED"; overlay: string }
  | { type: "OVERLAY_CLOSED"; overlay: string };

type EventHandler = (event: DesktopEvent) => void;

interface EventBus {
  emit(event: DesktopEvent): void;
  on(handler: EventHandler): () => void;
  onType<T extends DesktopEvent["type"]>(
    type: T,
    handler: (event: Extract<DesktopEvent, { type: T }>) => void
  ): () => void;
  once(handler: EventHandler): () => void;
  listeners(): number;
}

/* ─── Singleton Event Bus ─── */
function createEventBus(): EventBus {
  const handlers = new Set<EventHandler>();

  return {
    emit(event: DesktopEvent) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, err);
        }
      });
    },

    on(handler: EventHandler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    onType<T extends DesktopEvent["type"]>(
      type: T,
      handler: (event: Extract<DesktopEvent, { type: T }>) => void
    ) {
      const wrapper = (event: DesktopEvent) => {
        if (event.type === type) {
          handler(event as Extract<DesktopEvent, { type: T }>);
        }
      };
      handlers.add(wrapper);
      return () => {
        handlers.delete(wrapper);
      };
    },

    once(handler: EventHandler) {
      const wrapper = (event: DesktopEvent) => {
        handler(event);
        handlers.delete(wrapper);
      };
      handlers.add(wrapper);
      return () => {
        handlers.delete(wrapper);
      };
    },

    listeners() {
      return handlers.size;
    },
  };
}

export const desktopEventBus = createEventBus();

/* ─── Convenience Emitters ─── */
export const emit = {
  windowOpened: (windowId: string, appId: string) =>
    desktopEventBus.emit({ type: "WINDOW_OPENED", windowId, appId }),
  windowClosed: (windowId: string, appId: string) =>
    desktopEventBus.emit({ type: "WINDOW_CLOSED", windowId, appId }),
  windowFocused: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_FOCUSED", windowId }),
  windowMinimized: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_MINIMIZED", windowId }),
  windowMaximized: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_MAXIMIZED", windowId }),
  windowRestored: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_RESTORED", windowId }),
  windowMoved: (windowId: string, x: number, y: number) =>
    desktopEventBus.emit({ type: "WINDOW_MOVED", windowId, x, y }),
  windowResized: (windowId: string, width: number, height: number) =>
    desktopEventBus.emit({ type: "WINDOW_RESIZED", windowId, width, height }),
  windowPinned: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_PINNED", windowId }),
  windowUnpinned: (windowId: string) =>
    desktopEventBus.emit({ type: "WINDOW_UNPINNED", windowId }),
  windowAlwaysOnTop: (windowId: string, enabled: boolean) =>
    desktopEventBus.emit({ type: "WINDOW_ALWAYS_ON_TOP", windowId, enabled }),

  workspaceChanged: (workspaceId: string) =>
    desktopEventBus.emit({ type: "WORKSPACE_CHANGED", workspaceId }),
  workspaceCreated: (workspaceId: string, name: string) =>
    desktopEventBus.emit({ type: "WORKSPACE_CREATED", workspaceId, name }),
  workspaceDeleted: (workspaceId: string) =>
    desktopEventBus.emit({ type: "WORKSPACE_DELETED", workspaceId }),
  workspaceRenamed: (workspaceId: string, name: string) =>
    desktopEventBus.emit({ type: "WORKSPACE_RENAMED", workspaceId, name }),

  dockUpdated: (workspaceId: string) =>
    desktopEventBus.emit({ type: "DOCK_UPDATED", workspaceId }),
  dockAppAdded: (appId: string) =>
    desktopEventBus.emit({ type: "DOCK_APP_ADDED", appId }),
  dockAppRemoved: (appId: string) =>
    desktopEventBus.emit({ type: "DOCK_APP_REMOVED", appId }),
  dockReordered: (appIds: string[]) =>
    desktopEventBus.emit({ type: "DOCK_REORDERED", appIds }),

  notificationAdded: (notificationId: string, title: string) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED", notificationId, title }),
  notificationRead: (notificationId: string) =>
    desktopEventBus.emit({ type: "NOTIFICATION_READ", notificationId }),
  notificationDismissed: (notificationId: string) =>
    desktopEventBus.emit({ type: "NOTIFICATION_DISMISSED", notificationId }),

  themeChanged: (theme: string) =>
    desktopEventBus.emit({ type: "THEME_CHANGED", theme }),
  motionPrefChanged: (prefersReduced: boolean) =>
    desktopEventBus.emit({ type: "MOTION_PREF_CHANGED", prefersReduced }),

  applicationInstalled: (appId: string) =>
    desktopEventBus.emit({ type: "APPLICATION_INSTALLED", appId }),
  applicationRemoved: (appId: string) =>
    desktopEventBus.emit({ type: "APPLICATION_REMOVED", appId }),

  sessionRestored: (userId: string) =>
    desktopEventBus.emit({ type: "SESSION_RESTORED", userId }),
  sessionSaved: (userId: string) =>
    desktopEventBus.emit({ type: "SESSION_SAVED", userId }),

  shellReady: () =>
    desktopEventBus.emit({ type: "SHELL_READY" }),
  overlayOpened: (overlay: string) =>
    desktopEventBus.emit({ type: "OVERLAY_OPENED", overlay }),
  overlayClosed: (overlay: string) =>
    desktopEventBus.emit({ type: "OVERLAY_CLOSED", overlay }),
};

/* ─── React Hook ─── */
import { useEffect } from "react";

export function useDesktopEvent<T extends DesktopEvent["type"]>(
  type: T,
  handler: (event: Extract<DesktopEvent, { type: T }>) => void
) {
  useEffect(() => {
    return desktopEventBus.onType(type, handler);
  }, [type, handler]);
}

export function useDesktopEvents(handler: (event: DesktopEvent) => void) {
  useEffect(() => {
    return desktopEventBus.on(handler);
  }, [handler]);
}
