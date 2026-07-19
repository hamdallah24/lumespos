import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AppDefinition, WindowState } from "./types";
import { layout } from "./tokens";
import { emit } from "./event-bus";

/* ─── Types ─── */

export type WindowLifecycle =
  | "created"
  | "opening"
  | "active"
  | "background"
  | "minimized"
  | "maximized"
  | "restored"
  | "closed"
  | "destroyed";

export interface WindowStateV2 extends WindowState {
  lifecycle: WindowLifecycle;
  previousPosition: { x: number; y: number } | null;
  previousSize: { width: number; height: number } | null;
  snapState: "none" | "left" | "right" | "top" | "bottom" | "maximized";
  history: Array<{ action: string; timestamp: number }>;
  createdAt: number;
  lastFocusedAt: number;
  workspaceId: string;
}

const MAX_HISTORY = 20;
const SNAP_THRESHOLD = 20;

/* ─── WindowController ─── */

class WindowController {
  private windows: Map<string, WindowStateV2> = new Map();
  private focusStack: string[] = [];
  private activeWindowId: string | null = null;
  private nextZIndex: number = 100;
  private nextWindowId: number = 1;
  private listeners: Array<() => void> = [];

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private addHistory(win: WindowStateV2, action: string): void {
    win.history.push({ action, timestamp: Date.now() });
    if (win.history.length > MAX_HISTORY) {
      win.history = win.history.slice(-MAX_HISTORY);
    }
  }

  private getWindowPosition(app: AppDefinition): { x: number; y: number } {
    const existingCount = Array.from(this.windows.values()).filter(
      (w) => w.appId === app.id
    ).length;
    const offset = existingCount * 30;
    const width = app.defaultWidth ?? layout.windowDefaultWidth;
    const height = app.defaultHeight ?? layout.windowDefaultHeight;
    const x = Math.max(
      layout.windowPadding,
      Math.min(
        window.innerWidth / 2 - width / 2 + offset,
        window.innerWidth - width - layout.windowPadding
      )
    );
    const y = Math.max(
      layout.menuBarHeight + layout.windowPadding,
      Math.min(
        window.innerHeight / 2 - height / 2 + offset,
        window.innerHeight - layout.dockHeight - height - layout.windowPadding
      )
    );
    return { x, y };
  }

  /* ─── Lifecycle ─── */

  openWindow(app: AppDefinition, workspaceId: string): WindowStateV2 {
    if (!app.allowMultiple) {
      const existing = Array.from(this.windows.values()).find(
        (w) => w.appId === app.id && w.lifecycle !== "closed" && w.lifecycle !== "destroyed"
      );
      if (existing && existing.lifecycle !== "minimized") {
        this.focusWindow(existing.id);
        return existing;
      }
      if (existing && existing.lifecycle === "minimized") {
        return this.restoreWindow(existing.id);
      }
    }

    const id = `win-${this.nextWindowId++}`;
    const now = Date.now();
    const pos = this.getWindowPosition(app);
    const zIndex = this.nextZIndex++;

    const win: WindowStateV2 = {
      id,
      appId: app.id,
      title: app.title,
      x: pos.x,
      y: pos.y,
      width: app.defaultWidth ?? layout.windowDefaultWidth,
      height: app.defaultHeight ?? layout.windowDefaultHeight,
      minWidth: app.minWidth ?? layout.windowMinWidth,
      minHeight: app.minHeight ?? layout.windowMinHeight,
      isMinimized: false,
      isMaximized: false,
      isPinned: false,
      isAlwaysOnTop: false,
      zIndex,
      icon: app.icon,
      color: app.color,
      lifecycle: "opening",
      previousPosition: null,
      previousSize: null,
      snapState: "none",
      history: [{ action: "opened", timestamp: now }],
      createdAt: now,
      lastFocusedAt: now,
      workspaceId,
    };

    this.windows.set(id, win);
    this.pushFocus(id);
    this.activeWindowId = id;
    win.lifecycle = "active";
    this.notify();
    emit.windowOpened(id, app.id);
    return win;
  }

  closeWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.lifecycle = "closed";
    this.addHistory(win, "closed");
    emit.windowClosed(windowId, win.appId);

    this.popFocus(windowId);

    if (this.activeWindowId === windowId) {
      this.activeWindowId = this.focusStack.length > 0 ? this.focusStack[this.focusStack.length - 1] : null;
      if (this.activeWindowId) {
        const nextWin = this.windows.get(this.activeWindowId);
        if (nextWin) {
          nextWin.lifecycle = "active";
          nextWin.lastFocusedAt = Date.now();
          nextWin.zIndex = this.nextZIndex++;
          emit.windowFocused(this.activeWindowId);
        }
      }
    }

    this.windows.delete(windowId);
    win.lifecycle = "destroyed";
    this.notify();
  }

  minimizeWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.isMinimized = true;
    win.lifecycle = "minimized";
    this.addHistory(win, "minimized");
    emit.windowMinimized(windowId);

    this.popFocus(windowId);

    if (this.activeWindowId === windowId) {
      this.activeWindowId = this.focusStack.length > 0 ? this.focusStack[this.focusStack.length - 1] : null;
      if (this.activeWindowId) {
        const nextWin = this.windows.get(this.activeWindowId);
        if (nextWin) {
          nextWin.lifecycle = "active";
          nextWin.lastFocusedAt = Date.now();
          nextWin.zIndex = this.nextZIndex++;
          emit.windowFocused(this.activeWindowId);
        }
      }
    }

    this.notify();
  }

  maximizeWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    if (win.isMaximized) {
      this.restoreWindow(windowId);
      return;
    }

    win.previousPosition = { x: win.x, y: win.y };
    win.previousSize = { width: win.width, height: win.height };
    win.isMaximized = true;
    win.lifecycle = "maximized";
    win.snapState = "maximized";
    this.addHistory(win, "maximized");

    const pos = this.calculateSnapPosition("maximized", win);
    win.x = pos.x;
    win.y = pos.y;
    win.width = pos.width;
    win.height = pos.height;

    emit.windowMaximized(windowId);
    this.notify();
  }

  restoreWindow(windowId: string): WindowStateV2 {
    const win = this.windows.get(windowId);
    if (!win) return win!;

    const wasMinimized = win.isMinimized;
    const wasMaximized = win.isMaximized;

    win.isMinimized = false;
    win.isMaximized = false;
    win.lifecycle = "restored";
    win.snapState = "none";
    this.addHistory(win, "restored");

    if (wasMaximized && win.previousPosition && win.previousSize) {
      win.x = win.previousPosition.x;
      win.y = win.previousPosition.y;
      win.width = win.previousSize.width;
      win.height = win.previousSize.height;
      win.previousPosition = null;
      win.previousSize = null;
    }

    win.zIndex = this.nextZIndex++;
    this.pushFocus(windowId);
    this.activeWindowId = windowId;
    win.lifecycle = "active";
    win.lastFocusedAt = Date.now();

    emit.windowRestored(windowId);
    emit.windowFocused(windowId);
    this.notify();
    return win;
  }

  focusWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win || win.lifecycle === "closed" || win.lifecycle === "destroyed") return;

    if (this.activeWindowId && this.activeWindowId !== windowId) {
      const prev = this.windows.get(this.activeWindowId);
      if (prev && prev.lifecycle === "active") {
        prev.lifecycle = "background";
        this.addHistory(prev, "background");
      }
    }

    win.zIndex = this.nextZIndex++;
    win.lastFocusedAt = Date.now();
    win.lifecycle = "active";
    this.pushFocus(windowId);
    this.activeWindowId = windowId;
    this.addHistory(win, "focused");

    emit.windowFocused(windowId);
    this.notify();
  }

  /* ─── Movement ─── */

  moveWindow(windowId: string, x: number, y: number): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.x = x;
    win.y = y;

    const snapThreshold = SNAP_THRESHOLD;
    let detectedSnap: WindowStateV2["snapState"] = "none";

    if (x <= snapThreshold) {
      detectedSnap = "left";
    } else if (x + win.width >= window.innerWidth - snapThreshold) {
      detectedSnap = "right";
    } else if (y <= layout.menuBarHeight + snapThreshold) {
      detectedSnap = "maximized";
    }

    if (detectedSnap !== "none" && win.snapState === "none") {
      win.previousPosition = { x: win.x, y: win.y };
      win.previousSize = { width: win.width, height: win.height };
    }

    if (detectedSnap !== win.snapState) {
      win.snapState = detectedSnap;
      if (detectedSnap !== "none") {
        const pos = this.calculateSnapPosition(detectedSnap, win);
        win.x = pos.x;
        win.y = pos.y;
        win.width = pos.width;
        win.height = pos.height;
      }
    }

    emit.windowMoved(windowId, win.x, win.y);
    this.notify();
  }

  resizeWindow(windowId: string, width: number, height: number): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.width = Math.max(win.minWidth, width);
    win.height = Math.max(win.minHeight, height);
    this.addHistory(win, "resized");

    emit.windowResized(windowId, win.width, win.height);
    this.notify();
  }

  /* ─── Snap ─── */

  snapWindow(windowId: string, snap: WindowStateV2["snapState"]): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    if (snap === "none" && win.snapState !== "none") {
      if (win.previousPosition && win.previousSize) {
        win.x = win.previousPosition.x;
        win.y = win.previousPosition.y;
        win.width = win.previousSize.width;
        win.height = win.previousSize.height;
        win.previousPosition = null;
        win.previousSize = null;
      }
      win.snapState = "none";
      win.isMaximized = false;
      this.addHistory(win, "unsnap");
    } else if (snap !== "none") {
      if (win.snapState === "none") {
        win.previousPosition = { x: win.x, y: win.y };
        win.previousSize = { width: win.width, height: win.height };
      }
      const pos = this.calculateSnapPosition(snap, win);
      win.x = pos.x;
      win.y = pos.y;
      win.width = pos.width;
      win.height = pos.height;
      win.snapState = snap;
      win.isMaximized = snap === "maximized";
      this.addHistory(win, `snap-${snap}`);
    }

    this.notify();
  }

  /* ─── Pin ─── */

  pinWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.isPinned = true;
    this.addHistory(win, "pinned");
    emit.windowPinned(windowId);
    this.notify();
  }

  unpinWindow(windowId: string): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.isPinned = false;
    this.addHistory(win, "unpinned");
    emit.windowUnpinned(windowId);
    this.notify();
  }

  setAlwaysOnTop(windowId: string, enabled: boolean): void {
    const win = this.windows.get(windowId);
    if (!win) return;

    win.isAlwaysOnTop = enabled;
    if (enabled) {
      win.zIndex = layout.alwaysOnTopZIndex;
    }
    this.addHistory(win, enabled ? "alwaysOnTop" : "alwaysOffTop");
    emit.windowAlwaysOnTop(windowId, enabled);
    this.notify();
  }

  /* ─── Queries ─── */

  getWindow(windowId: string): WindowStateV2 | undefined {
    return this.windows.get(windowId);
  }

  getActiveWindow(): WindowStateV2 | undefined {
    if (!this.activeWindowId) return undefined;
    return this.windows.get(this.activeWindowId);
  }

  getFocusStack(): string[] {
    return [...this.focusStack];
  }

  getWindowsByWorkspace(workspaceId: string): WindowStateV2[] {
    return Array.from(this.windows.values()).filter(
      (w) => w.workspaceId === workspaceId
    );
  }

  getAllWindows(): WindowStateV2[] {
    return Array.from(this.windows.values());
  }

  getWindowCount(): number {
    return this.windows.size;
  }

  /* ─── Focus Management ─── */

  private pushFocus(windowId: string): void {
    this.focusStack = this.focusStack.filter((id) => id !== windowId);
    this.focusStack.push(windowId);
  }

  private popFocus(windowId: string): void {
    this.focusStack = this.focusStack.filter((id) => id !== windowId);
  }

  recalculateZIndex(): void {
    const sorted = Array.from(this.windows.values()).sort(
      (a, b) => a.lastFocusedAt - b.lastFocusedAt
    );
    let z = 100;
    for (const win of sorted) {
      if (win.isAlwaysOnTop) {
        win.zIndex = layout.alwaysOnTopZIndex;
      } else {
        win.zIndex = z++;
      }
    }
    this.nextZIndex = z;
    this.notify();
  }

  /* ─── Snap Logic ─── */

  calculateSnapPosition(
    snap: WindowStateV2["snapState"],
    win: WindowStateV2
  ): { x: number; y: number; width: number; height: number } {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const menuBar = layout.menuBarHeight;
    const dock = layout.dockHeight;

    switch (snap) {
      case "left":
        return {
          x: 0,
          y: menuBar,
          width: Math.floor(screenWidth / 2),
          height: screenHeight - menuBar - dock,
        };
      case "right":
        return {
          x: Math.floor(screenWidth / 2),
          y: menuBar,
          width: Math.floor(screenWidth / 2),
          height: screenHeight - menuBar - dock,
        };
      case "maximized":
        return {
          x: 0,
          y: menuBar,
          width: screenWidth,
          height: screenHeight - menuBar,
        };
      case "top":
        return {
          x: 0,
          y: menuBar,
          width: screenWidth,
          height: Math.floor((screenHeight - menuBar - dock) / 2),
        };
      case "bottom":
        return {
          x: 0,
          y: menuBar + Math.floor((screenHeight - menuBar - dock) / 2),
          width: screenWidth,
          height: Math.floor((screenHeight - menuBar - dock) / 2),
        };
      case "none":
      default:
        return {
          x: win.previousPosition?.x ?? win.x,
          y: win.previousPosition?.y ?? win.y,
          width: win.previousSize?.width ?? win.width,
          height: win.previousSize?.height ?? win.height,
        };
    }
  }

  /* ─── Snapshot ─── */

  snapshot(): WindowStateV2[] {
    return Array.from(this.windows.values());
  }

  restore(windows: WindowStateV2[]): void {
    this.windows.clear();
    this.focusStack = [];
    this.activeWindowId = null;
    this.nextZIndex = 100;
    this.nextWindowId = 1;

    for (const win of windows) {
      this.windows.set(win.id, { ...win });
      this.pushFocus(win.id);
      const idNum = parseInt(win.id.replace("win-", ""), 10);
      if (!isNaN(idNum) && idNum >= this.nextWindowId) {
        this.nextWindowId = idNum + 1;
      }
      if (win.zIndex >= this.nextZIndex) {
        this.nextZIndex = win.zIndex + 1;
      }
    }

    if (this.focusStack.length > 0) {
      this.activeWindowId = this.focusStack[this.focusStack.length - 1];
    }

    this.notify();
  }
}

/* ─── Singleton ─── */

export const windowController = new WindowController();

/* ─── React Hook ─── */

export function useWindowController() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(windowController.getAllWindows());

  useEffect(() => {
    return windowController.subscribe(() => {
      stateRef.current = windowController.getAllWindows();
      forceUpdate();
    });
  }, []);

  const openApp = useCallback((app: AppDefinition) => {
    windowController.openWindow(app, "default");
  }, []);

  const closeWindow = useCallback((id: string) => {
    windowController.closeWindow(id);
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    windowController.minimizeWindow(id);
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    windowController.maximizeWindow(id);
  }, []);

  const restoreWindow = useCallback((id: string) => {
    windowController.restoreWindow(id);
  }, []);

  const focusWindow = useCallback((id: string) => {
    windowController.focusWindow(id);
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    windowController.moveWindow(id, x, y);
  }, []);

  const resizeWindow = useCallback((id: string, w: number, h: number) => {
    windowController.resizeWindow(id, w, h);
  }, []);

  const snapWindow = useCallback(
    (id: string, snap: WindowStateV2["snapState"]) => {
      windowController.snapWindow(id, snap);
    },
    []
  );

  const pinWindow = useCallback((id: string) => {
    windowController.pinWindow(id);
  }, []);

  const unpinWindow = useCallback((id: string) => {
    windowController.unpinWindow(id);
  }, []);

  const setAlwaysOnTop = useCallback((id: string, enabled: boolean) => {
    windowController.setAlwaysOnTop(id, enabled);
  }, []);

  const getWindow = useCallback((id: string) => {
    return windowController.getWindow(id);
  }, []);

  return {
    windows: stateRef.current,
    activeWindowId: windowController.getActiveWindow()?.id ?? null,
    focusStack: windowController.getFocusStack(),
    openApp,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    snapWindow,
    pinWindow,
    unpinWindow,
    setAlwaysOnTop,
    getWindow,
    activeWindow: windowController.getActiveWindow(),
  };
}
