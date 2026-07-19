import { useCallback, useEffect, useReducer, useRef } from "react";
import { appRegistry } from "./registry";
import { emit } from "./event-bus";

interface DockState {
  pinnedApps: string[];
  recentApps: string[];
  badges: Record<string, number>;
  reorderIndex: number | null;
}

type DockAction =
  | { type: "SET_PINNED"; appIds: string[] }
  | { type: "ADD_PINNED"; appId: string }
  | { type: "REMOVE_PINNED"; appId: string }
  | { type: "ADD_RECENT"; appId: string }
  | { type: "SET_BADGE"; appId: string; count: number }
  | { type: "CLEAR_BADGE"; appId: string }
  | { type: "SET_REORDER_INDEX"; index: number | null }
  | { type: "MOVE_APP"; from: number; to: number }
  | { type: "RESTORE"; state: DockState };

const MAX_RECENT = 5;
const MAX_RECENT_EXTRA = 2;

const defaultState: DockState = {
  pinnedApps: ["pos", "finance", "inventory", "crm", "hr", "ai-chat", "marketplace", "settings"],
  recentApps: [],
  badges: {},
  reorderIndex: null,
};

function dockReducer(state: DockState, action: DockAction): DockState {
  switch (action.type) {
    case "SET_PINNED":
      return { ...state, pinnedApps: action.appIds };

    case "ADD_PINNED":
      if (state.pinnedApps.includes(action.appId)) return state;
      return { ...state, pinnedApps: [...state.pinnedApps, action.appId] };

    case "REMOVE_PINNED":
      return { ...state, pinnedApps: state.pinnedApps.filter((id) => id !== action.appId) };

    case "ADD_RECENT": {
      const filtered = state.recentApps.filter((id) => id !== action.appId);
      const recentApps = [action.appId, ...filtered].slice(0, MAX_RECENT);
      return { ...state, recentApps };
    }

    case "SET_BADGE":
      return { ...state, badges: { ...state.badges, [action.appId]: action.count } };

    case "CLEAR_BADGE": {
      const badges = { ...state.badges };
      delete badges[action.appId];
      return { ...state, badges };
    }

    case "SET_REORDER_INDEX":
      return { ...state, reorderIndex: action.index };

    case "MOVE_APP": {
      const pinnedApps = [...state.pinnedApps];
      const [moved] = pinnedApps.splice(action.from, 1);
      pinnedApps.splice(action.to, 0, moved);
      return { ...state, pinnedApps, reorderIndex: null };
    }

    case "RESTORE":
      return action.state;

    default:
      return state;
  }
}

let _workspaceId = "default";

function getStorageKey(workspaceId: string): string {
  return `lume-dock-${workspaceId}`;
}

function loadFromStorage(workspaceId: string): DockState {
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceId));
    if (raw) {
      const parsed = JSON.parse(raw) as DockState;
      if (Array.isArray(parsed.pinnedApps)) return parsed;
    }
  } catch {}
  return { ...defaultState };
}

function saveToStorage(state: DockState) {
  try {
    localStorage.setItem(getStorageKey(_workspaceId), JSON.stringify(state));
  } catch {}
}

let _state: DockState = loadFromStorage(_workspaceId);
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function dispatch(action: DockAction) {
  _state = dockReducer(_state, action);
  saveToStorage(_state);
  _listeners.forEach((l) => l());
}

function getState(): DockState {
  return _state;
}

export function useDockStore(workspaceId?: string) {
  const targetWorkspaceId = workspaceId || "default";

  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;
  const workspaceIdRef = useRef(targetWorkspaceId);
  workspaceIdRef.current = targetWorkspaceId;

  useEffect(() => {
    if (workspaceId && workspaceId !== _workspaceId) {
      _workspaceId = workspaceId;
      _state = loadFromStorage(workspaceId);
      _listeners.forEach((l) => l());
    }
  }, [workspaceId]);

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const { windows, activeWindowId } = (window as any).__desktopStoreState || { windows: [], activeWindowId: null };

  const desktopStore = (() => {
    try {
      const mod = require("./store");
      const storeState = mod.useDesktopStore;
      return storeState;
    } catch {
      return null;
    }
  })();

  const isPinned = useCallback((appId: string) => {
    return _state.pinnedApps.includes(appId);
  }, []);

  const setPinned = useCallback((appIds: string[]) => {
    dispatch({ type: "SET_PINNED", appIds });
    emit.dockReordered(appIds);
    emit.dockUpdated(workspaceIdRef.current);
  }, []);

  const addPinned = useCallback((appId: string) => {
    dispatch({ type: "ADD_PINNED", appId });
    emit.dockAppAdded(appId);
    emit.dockUpdated(workspaceIdRef.current);
  }, []);

  const removePinned = useCallback((appId: string) => {
    dispatch({ type: "REMOVE_PINNED", appId });
    emit.dockAppRemoved(appId);
    emit.dockUpdated(workspaceIdRef.current);
  }, []);

  const addRecent = useCallback((appId: string) => {
    dispatch({ type: "ADD_RECENT", appId });
  }, []);

  const setBadge = useCallback((appId: string, count: number) => {
    dispatch({ type: "SET_BADGE", appId, count });
  }, []);

  const clearBadge = useCallback((appId: string) => {
    dispatch({ type: "CLEAR_BADGE", appId });
  }, []);

  const reorderApp = useCallback((from: number, to: number) => {
    dispatch({ type: "MOVE_APP", from, to });
    emit.dockReordered(_state.pinnedApps);
    emit.dockUpdated(workspaceIdRef.current);
  }, []);

  const getDockApps = useCallback(() => {
    const pinned = stateRef.current.pinnedApps;
    const seen = new Set(pinned);

    const runningAppIds = new Set<string>();
    if (desktopStore) {
      const ds = desktopStore();
      if (ds.state?.windows) {
        for (const w of ds.state.windows) {
          runningAppIds.add(w.appId);
        }
      }
    }

    const runningNotPinned = Array.from(runningAppIds).filter((id) => !seen.has(id));
    for (const id of runningNotPinned) {
      seen.add(id);
    }

    const recentNotShown = stateRef.current.recentApps
      .filter((id) => !seen.has(id))
      .slice(0, MAX_RECENT_EXTRA);
    for (const id of recentNotShown) {
      seen.add(id);
    }

    const orderedIds = [...pinned, ...runningNotPinned, ...recentNotShown];

    const activeAppId = desktopStore ? (() => {
      const ds = desktopStore();
      if (ds.state?.activeWindowId && ds.state.windows) {
        const activeWin = ds.state.windows.find((w: any) => w.id === ds.state.activeWindowId);
        return activeWin?.appId || null;
      }
      return null;
    })() : null;

    return orderedIds.map((appId) => {
      const def = appRegistry.find((a) => a.id === appId);
      const isOpen = runningAppIds.has(appId);
      const isActive = activeAppId === appId;
      const badge = stateRef.current.badges[appId] || 0;

      return {
        id: appId,
        title: def?.title || appId,
        icon: def?.icon || "App",
        color: def?.color || "#64748B",
        isOpen,
        isActive,
        badge,
      };
    });
  }, []);

  return {
    state: stateRef.current,
    pinnedApps: stateRef.current.pinnedApps,
    recentApps: stateRef.current.recentApps,
    badges: stateRef.current.badges,
    isPinned,
    setPinned,
    addPinned,
    removePinned,
    addRecent,
    setBadge,
    clearBadge,
    reorderApp,
    getDockApps,
  };
}
