import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Notification } from "./types";
import { desktopEventBus, emit } from "./event-bus";

/* ─── Workspace V2 ─── */
export interface WorkspaceV2 {
  id: string;
  name: string;
  icon: string;
  windowIds: string[];
  dockApps: string[];
  widgets: string[];
  theme: string | null;
  filters: Record<string, string>;
  openTabs: Record<string, string>;
  aiSessionId: string | null;
  scrollPositions: Record<string, number>;
  sidebarState: Record<string, boolean>;
  applicationState: Record<string, unknown>;
  metadata: {
    createdAt: number;
    lastUsed: number;
    lastSaved: number;
    useCount: number;
    totalActiveTime: number;
    color?: string;
  };
}

/* ─── Engine State ─── */
export interface WorkspaceEngineState {
  workspaces: WorkspaceV2[];
  activeWorkspaceId: string;
  snapshotHistory: Array<{ timestamp: number; state: WorkspaceEngineState }>;
}

/* ─── Engine Actions ─── */
export type WorkspaceEngineAction =
  | { type: "CREATE_WORKSPACE"; name: string; icon?: string; color?: string }
  | { type: "DELETE_WORKSPACE"; workspaceId: string }
  | { type: "RENAME_WORKSPACE"; workspaceId: string; name: string }
  | { type: "SWITCH_WORKSPACE"; workspaceId: string }
  | { type: "DUPLICATE_WORKSPACE"; workspaceId: string; newName: string }
  | { type: "SET_WINDOW_IDS"; workspaceId: string; windowIds: string[] }
  | { type: "ADD_WINDOW"; workspaceId: string; windowId: string }
  | { type: "REMOVE_WINDOW"; workspaceId: string; windowId: string }
  | { type: "SET_DOCK_APPS"; workspaceId: string; appIds: string[] }
  | { type: "SET_WIDGETS"; workspaceId: string; widgets: string[] }
  | { type: "SET_THEME"; workspaceId: string; theme: string | null }
  | { type: "SET_FILTER"; workspaceId: string; key: string; value: string }
  | { type: "SET_OPEN_TAB"; workspaceId: string; appId: string; tabId: string }
  | { type: "SET_AI_SESSION"; workspaceId: string; sessionId: string | null }
  | { type: "SET_SCROLL_POSITION"; workspaceId: string; appId: string; position: number }
  | { type: "SET_SIDEBAR_STATE"; workspaceId: string; appId: string; isOpen: boolean }
  | { type: "SET_APPLICATION_STATE"; workspaceId: string; appId: string; state: unknown }
  | { type: "UPDATE_METADATA"; workspaceId: string; updates: Partial<WorkspaceV2["metadata"]> }
  | { type: "TAKE_SNAPSHOT" }
  | { type: "RESTORE"; state: WorkspaceEngineState }
  | { type: "IMPORT"; workspaces: WorkspaceV2[] }
  | { type: "EXPORT" };

/* ─── Defaults ─── */
const DEFAULT_DOCK_APPS = [
  "pos",
  "finance",
  "inventory",
  "crm",
  "hr",
  "ai-chat",
  "marketplace",
  "settings",
];

function createWorkspaceV2(
  name: string,
  icon?: string,
  color?: string
): WorkspaceV2 {
  const now = Date.now();
  return {
    id: `ws-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    icon: icon || "Layers",
    windowIds: [],
    dockApps: [...DEFAULT_DOCK_APPS],
    widgets: [],
    theme: null,
    filters: {},
    openTabs: {},
    aiSessionId: null,
    scrollPositions: {},
    sidebarState: {},
    applicationState: {},
    metadata: {
      createdAt: now,
      lastUsed: now,
      lastSaved: now,
      useCount: 0,
      totalActiveTime: 0,
      color,
    },
  };
}

const PRESET_WORKSPACES: WorkspaceV2[] = [
  createWorkspaceV2("Operations", "Monitor"),
  (() => {
    const ws = createWorkspaceV2("Finance", "TrendingUp");
    ws.dockApps = ["finance", "inventory", "crm", "settings"];
    return ws;
  })(),
  (() => {
    const ws = createWorkspaceV2("Executive", "Crown");
    ws.dockApps = ["ai-chat", "crm", "finance", "settings"];
    return ws;
  })(),
];

/* ─── Storage ─── */
const STORAGE_KEY = "lume-workspace-engine";
const SNAPSHOT_STORAGE_KEY = "lume-workspace-snapshots";
const MAX_SNAPSHOTS = 10;

/* ─── Initial State ─── */
function getInitialState(): WorkspaceEngineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceEngineState;
      if (
        parsed.workspaces?.length > 0 &&
        typeof parsed.activeWorkspaceId === "string"
      ) {
        return {
          ...parsed,
          snapshotHistory: parsed.snapshotHistory || [],
        };
      }
    }
  } catch {}
  return {
    workspaces: PRESET_WORKSPACES,
    activeWorkspaceId: PRESET_WORKSPACES[0].id,
    snapshotHistory: [],
  };
}

function loadSnapshots(): WorkspaceEngineState["snapshotHistory"] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSnapshots(snapshots: WorkspaceEngineState["snapshotHistory"]) {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {}
}

/* ─── Reducer ─── */
function workspaceEngineReducer(
  state: WorkspaceEngineState,
  action: WorkspaceEngineAction
): WorkspaceEngineState {
  const now = Date.now();

  function markSaved(workspaces: WorkspaceV2[]): WorkspaceV2[] {
    return workspaces.map((w) =>
      w.id === (action as any).workspaceId
        ? { ...w, metadata: { ...w.metadata, lastSaved: now } }
        : w
    );
  }

  function updateSingle(
    workspaces: WorkspaceV2[],
    workspaceId: string,
    updater: (ws: WorkspaceV2) => WorkspaceV2
  ): WorkspaceV2[] {
    return workspaces.map((w) =>
      w.id === workspaceId ? updater({ ...w, metadata: { ...w.metadata, lastSaved: now } }) : w
    );
  }

  switch (action.type) {
    case "CREATE_WORKSPACE": {
      const newWs = createWorkspaceV2(action.name, action.icon, action.color);
      return {
        ...state,
        workspaces: [...state.workspaces, newWs],
        activeWorkspaceId: newWs.id,
      };
    }

    case "DELETE_WORKSPACE": {
      if (state.workspaces.length <= 1) return state;
      const filtered = state.workspaces.filter((w) => w.id !== action.workspaceId);
      return {
        ...state,
        workspaces: filtered,
        activeWorkspaceId:
          state.activeWorkspaceId === action.workspaceId
            ? filtered[0].id
            : state.activeWorkspaceId,
      };
    }

    case "RENAME_WORKSPACE":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          name: action.name,
        })),
      };

    case "SWITCH_WORKSPACE": {
      const prevActive = state.workspaces.find(
        (w) => w.id === state.activeWorkspaceId
      );
      let updatedWorkspaces = state.workspaces;

      if (prevActive && prevActive.id !== action.workspaceId) {
        updatedWorkspaces = state.workspaces.map((w) => {
          if (w.id === prevActive.id) {
            const elapsed = now - w.metadata.lastUsed;
            return {
              ...w,
              metadata: {
                ...w.metadata,
                lastUsed: w.metadata.lastUsed,
                totalActiveTime: w.metadata.totalActiveTime + elapsed,
              },
            };
          }
          if (w.id === action.workspaceId) {
            return {
              ...w,
              metadata: {
                ...w.metadata,
                lastUsed: now,
                useCount: w.metadata.useCount + 1,
              },
            };
          }
          return w;
        });
      } else {
        updatedWorkspaces = state.workspaces.map((w) =>
          w.id === action.workspaceId
            ? {
                ...w,
                metadata: {
                  ...w.metadata,
                  lastUsed: now,
                  useCount: w.metadata.useCount + 1,
                },
              }
            : w
        );
      }

      return {
        ...state,
        activeWorkspaceId: action.workspaceId,
        workspaces: updatedWorkspaces,
      };
    }

    case "DUPLICATE_WORKSPACE": {
      const original = state.workspaces.find((w) => w.id === action.workspaceId);
      if (!original) return state;
      const dupId = `ws-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const dup: WorkspaceV2 = {
        ...structuredClone(original),
        id: dupId,
        name: action.newName,
        windowIds: [],
        metadata: {
          createdAt: now,
          lastUsed: now,
          lastSaved: now,
          useCount: 0,
          totalActiveTime: 0,
          color: original.metadata.color,
        },
      };
      return {
        ...state,
        workspaces: [...state.workspaces, dup],
        activeWorkspaceId: dup.id,
      };
    }

    case "SET_WINDOW_IDS":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          windowIds: action.windowIds,
        })),
      };

    case "ADD_WINDOW":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          windowIds: [...new Set([...ws.windowIds, action.windowId])],
        })),
      };

    case "REMOVE_WINDOW":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          windowIds: ws.windowIds.filter((id) => id !== action.windowId),
        })),
      };

    case "SET_DOCK_APPS":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          dockApps: action.appIds,
        })),
      };

    case "SET_WIDGETS":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          widgets: action.widgets,
        })),
      };

    case "SET_THEME":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          theme: action.theme,
        })),
      };

    case "SET_FILTER":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          filters: { ...ws.filters, [action.key]: action.value },
        })),
      };

    case "SET_OPEN_TAB":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          openTabs: { ...ws.openTabs, [action.appId]: action.tabId },
        })),
      };

    case "SET_AI_SESSION":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          aiSessionId: action.sessionId,
        })),
      };

    case "SET_SCROLL_POSITION":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          scrollPositions: { ...ws.scrollPositions, [action.appId]: action.position },
        })),
      };

    case "SET_SIDEBAR_STATE":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          sidebarState: { ...ws.sidebarState, [action.appId]: action.isOpen },
        })),
      };

    case "SET_APPLICATION_STATE":
      return {
        ...state,
        workspaces: updateSingle(state.workspaces, action.workspaceId, (ws) => ({
          ...ws,
          applicationState: { ...ws.applicationState, [action.appId]: action.state },
        })),
      };

    case "UPDATE_METADATA":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId
            ? {
                ...w,
                metadata: {
                  ...w.metadata,
                  ...action.updates,
                  lastSaved: now,
                },
              }
            : w
        ),
      };

    case "TAKE_SNAPSHOT": {
      const snapshot: { timestamp: number; state: WorkspaceEngineState } = {
        timestamp: now,
        state: structuredClone(state),
      };
      const history = [...state.snapshotHistory, snapshot].slice(-MAX_SNAPSHOTS);
      return {
        ...state,
        snapshotHistory: history,
      };
    }

    case "RESTORE":
      return action.state;

    case "IMPORT":
      return {
        ...state,
        workspaces: action.workspaces,
        activeWorkspaceId:
          action.workspaces.find((w) => w.id === state.activeWorkspaceId) !==
          undefined
            ? state.activeWorkspaceId
            : action.workspaces[0]?.id ?? state.activeWorkspaceId,
      };

    case "EXPORT":
      return state;

    default:
      return state;
  }
}

/* ─── Singleton Store ─── */
let _state: WorkspaceEngineState = getInitialState();
let _snapshots = loadSnapshots();
let _listeners: (() => void)[] = [];
let _lastSwitchTime = Date.now();

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
  saveSnapshots(_state.snapshotHistory);
}

function dispatch(action: WorkspaceEngineAction) {
  _state = workspaceEngineReducer(_state, action);
  persist();
  _listeners.forEach((l) => l());
}

function getState(): WorkspaceEngineState {
  return _state;
}

function emitEventForAction(action: WorkspaceEngineAction) {
  switch (action.type) {
    case "CREATE_WORKSPACE":
      emit.workspaceCreated(
        _state.workspaces[_state.workspaces.length - 1].id,
        action.name
      );
      break;
    case "DELETE_WORKSPACE":
      emit.workspaceDeleted(action.workspaceId);
      break;
    case "RENAME_WORKSPACE":
      emit.workspaceRenamed(action.workspaceId, action.name);
      break;
    case "SWITCH_WORKSPACE":
      emit.workspaceChanged(action.workspaceId);
      break;
    case "SET_DOCK_APPS":
      emit.dockUpdated(action.workspaceId);
      break;
    default:
      break;
  }
}

/* ─── React Hook ─── */
export function useWorkspaceEngine() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  useEffect(() => {
    _lastSwitchTime = Date.now();
  }, []);

  const dispatchWithEvents = useCallback((action: WorkspaceEngineAction) => {
    const prevActiveId = _state.activeWorkspaceId;
    dispatch(action);
    emitEventForAction(action);

    if (
      action.type === "SWITCH_WORKSPACE" &&
      action.workspaceId !== prevActiveId
    ) {
      _lastSwitchTime = Date.now();
      dispatch({ type: "TAKE_SNAPSHOT" });
    }
  }, []);

  const activeWorkspace = stateRef.current.workspaces.find(
    (w) => w.id === stateRef.current.activeWorkspaceId
  );

  /* ─── CRUD ─── */
  const createWorkspace = useCallback(
    (name: string, icon?: string, color?: string) => {
      dispatchWithEvents({ type: "CREATE_WORKSPACE", name, icon, color });
    },
    [dispatchWithEvents]
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      dispatchWithEvents({ type: "DELETE_WORKSPACE", workspaceId: id });
    },
    [dispatchWithEvents]
  );

  const renameWorkspace = useCallback(
    (id: string, name: string) => {
      dispatchWithEvents({ type: "RENAME_WORKSPACE", workspaceId: id, name });
    },
    [dispatchWithEvents]
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      dispatchWithEvents({ type: "SWITCH_WORKSPACE", workspaceId: id });
    },
    [dispatchWithEvents]
  );

  const duplicateWorkspace = useCallback(
    (id: string, newName: string) => {
      dispatchWithEvents({
        type: "DUPLICATE_WORKSPACE",
        workspaceId: id,
        newName,
      });
    },
    [dispatchWithEvents]
  );

  /* ─── Window Management ─── */
  const addWindow = useCallback(
    (workspaceId: string, windowId: string) => {
      dispatchWithEvents({ type: "ADD_WINDOW", workspaceId, windowId });
    },
    [dispatchWithEvents]
  );

  const removeWindow = useCallback(
    (workspaceId: string, windowId: string) => {
      dispatchWithEvents({ type: "REMOVE_WINDOW", workspaceId, windowId });
    },
    [dispatchWithEvents]
  );

  const setWindowIds = useCallback(
    (workspaceId: string, windowIds: string[]) => {
      dispatchWithEvents({ type: "SET_WINDOW_IDS", workspaceId, windowIds });
    },
    [dispatchWithEvents]
  );

  /* ─── Dock ─── */
  const setDockApps = useCallback(
    (workspaceId: string, appIds: string[]) => {
      dispatchWithEvents({ type: "SET_DOCK_APPS", workspaceId, appIds });
    },
    [dispatchWithEvents]
  );

  /* ─── Widgets ─── */
  const setWidgets = useCallback(
    (workspaceId: string, widgets: string[]) => {
      dispatchWithEvents({ type: "SET_WIDGETS", workspaceId, widgets });
    },
    [dispatchWithEvents]
  );

  /* ─── Theme ─── */
  const setWorkspaceTheme = useCallback(
    (workspaceId: string, theme: string | null) => {
      dispatchWithEvents({ type: "SET_THEME", workspaceId, theme });
    },
    [dispatchWithEvents]
  );

  /* ─── Tabs ─── */
  const setOpenTab = useCallback(
    (workspaceId: string, appId: string, tabId: string) => {
      dispatchWithEvents({ type: "SET_OPEN_TAB", workspaceId, appId, tabId });
    },
    [dispatchWithEvents]
  );

  const getOpenTab = useCallback(
    (workspaceId: string, appId: string): string | undefined => {
      const ws = stateRef.current.workspaces.find((w) => w.id === workspaceId);
      return ws?.openTabs[appId];
    },
    []
  );

  /* ─── AI ─── */
  const setAISession = useCallback(
    (workspaceId: string, sessionId: string | null) => {
      dispatchWithEvents({ type: "SET_AI_SESSION", workspaceId, sessionId });
    },
    [dispatchWithEvents]
  );

  /* ─── Scroll ─── */
  const setScrollPosition = useCallback(
    (workspaceId: string, appId: string, pos: number) => {
      dispatchWithEvents({
        type: "SET_SCROLL_POSITION",
        workspaceId,
        appId,
        position: pos,
      });
    },
    [dispatchWithEvents]
  );

  const getScrollPosition = useCallback(
    (workspaceId: string, appId: string): number => {
      const ws = stateRef.current.workspaces.find((w) => w.id === workspaceId);
      return ws?.scrollPositions[appId] ?? 0;
    },
    []
  );

  /* ─── Sidebar ─── */
  const setSidebarState = useCallback(
    (workspaceId: string, appId: string, isOpen: boolean) => {
      dispatchWithEvents({
        type: "SET_SIDEBAR_STATE",
        workspaceId,
        appId,
        isOpen,
      });
    },
    [dispatchWithEvents]
  );

  const getSidebarState = useCallback(
    (workspaceId: string, appId: string): boolean => {
      const ws = stateRef.current.workspaces.find((w) => w.id === workspaceId);
      return ws?.sidebarState[appId] ?? false;
    },
    []
  );

  /* ─── Application State ─── */
  const setApplicationState = useCallback(
    (workspaceId: string, appId: string, state: unknown) => {
      dispatchWithEvents({
        type: "SET_APPLICATION_STATE",
        workspaceId,
        appId,
        state,
      });
    },
    [dispatchWithEvents]
  );

  const getApplicationState = useCallback(
    <T = unknown>(workspaceId: string, appId: string): T | undefined => {
      const ws = stateRef.current.workspaces.find((w) => w.id === workspaceId);
      return ws?.applicationState[appId] as T | undefined;
    },
    []
  );

  /* ─── Metadata ─── */
  const updateMetadata = useCallback(
    (workspaceId: string, updates: Partial<WorkspaceV2["metadata"]>) => {
      dispatchWithEvents({ type: "UPDATE_METADATA", workspaceId, updates });
    },
    [dispatchWithEvents]
  );

  /* ─── Snapshots ─── */
  const takeSnapshot = useCallback(() => {
    dispatch({ type: "TAKE_SNAPSHOT" });
  }, []);

  /* ─── Import / Export ─── */
  const exportWorkspaces = useCallback((): string => {
    dispatch({ type: "EXPORT" });
    return JSON.stringify(stateRef.current, null, 2);
  }, []);

  const importWorkspaces = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed.workspaces)) {
        dispatchWithEvents({ type: "IMPORT", workspaces: parsed.workspaces });
      } else if (Array.isArray(parsed)) {
        dispatchWithEvents({ type: "IMPORT", workspaces: parsed });
      }
    } catch (err) {
      console.error("[WorkspaceEngine] Failed to import:", err);
    }
  }, [dispatchWithEvents]);

  return {
    state: stateRef.current,
    workspaces: stateRef.current.workspaces,
    activeWorkspace,
    activeWorkspaceId: stateRef.current.activeWorkspaceId,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    switchWorkspace,
    duplicateWorkspace,
    addWindow,
    removeWindow,
    setWindowIds,
    setDockApps,
    setWidgets,
    setWorkspaceTheme,
    setOpenTab,
    getOpenTab,
    setAISession,
    setScrollPosition,
    getScrollPosition,
    setSidebarState,
    getSidebarState,
    setApplicationState,
    getApplicationState,
    updateMetadata,
    takeSnapshot,
    exportWorkspaces,
    importWorkspaces,
  };
}
