import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Workspace, WorkspaceState, WorkspaceAction } from "./types";

const DEFAULT_WORKSPACE: Workspace = {
  id: "default",
  name: "Operations",
  icon: "Monitor",
  windowIds: [],
  dockApps: ["pos", "finance", "inventory", "crm", "hr", "ai-chat", "marketplace", "settings"],
  createdAt: Date.now(),
  lastUsed: Date.now(),
};

const PRESET_WORKSPACES: Workspace[] = [
  DEFAULT_WORKSPACE,
  {
    id: "finance",
    name: "Finance",
    icon: "TrendingUp",
    windowIds: [],
    dockApps: ["finance", "inventory", "crm", "settings"],
    createdAt: Date.now(),
    lastUsed: Date.now(),
  },
  {
    id: "executive",
    name: "Executive",
    icon: "Crown",
    windowIds: [],
    dockApps: ["ai-chat", "crm", "finance", "settings"],
    createdAt: Date.now(),
    lastUsed: Date.now(),
  },
];

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "CREATE_WORKSPACE": {
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name: action.name,
        icon: action.icon || "Layers",
        windowIds: [],
        dockApps: ["pos", "finance", "inventory", "ai-chat", "settings"],
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
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
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId ? { ...w, name: action.name } : w
        ),
      };

    case "SWITCH_WORKSPACE":
      return {
        ...state,
        activeWorkspaceId: action.workspaceId,
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId ? { ...w, lastUsed: Date.now() } : w
        ),
      };

    case "DUPLICATE_WORKSPACE": {
      const original = state.workspaces.find((w) => w.id === action.workspaceId);
      if (!original) return state;
      const dup: Workspace = {
        ...original,
        id: `ws-${Date.now()}`,
        name: action.newName,
        windowIds: [],
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      return {
        ...state,
        workspaces: [...state.workspaces, dup],
        activeWorkspaceId: dup.id,
      };
    }

    case "ADD_WINDOW_TO_WORKSPACE":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId
            ? { ...w, windowIds: [...new Set([...w.windowIds, action.windowId])] }
            : w
        ),
      };

    case "REMOVE_WINDOW_FROM_WORKSPACE":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId
            ? { ...w, windowIds: w.windowIds.filter((id) => id !== action.windowId) }
            : w
        ),
      };

    case "SET_DOCK_APPS":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.workspaceId ? { ...w, dockApps: action.appIds } : w
        ),
      };

    case "RESTORE_WORKSPACES":
      return action.state;

    default:
      return state;
  }
}

const STORAGE_KEY = "lume-workspaces";

function loadFromStorage(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceState;
      if (parsed.workspaces?.length > 0) return parsed;
    }
  } catch {}
  return { workspaces: PRESET_WORKSPACES, activeWorkspaceId: "default" };
}

function saveToStorage(state: WorkspaceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let _state: WorkspaceState = loadFromStorage();
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function dispatch(action: WorkspaceAction) {
  _state = workspaceReducer(_state, action);
  saveToStorage(_state);
  _listeners.forEach((l) => l());
}

function getState(): WorkspaceState {
  return _state;
}

export function useWorkspaceStore() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const activeWorkspace = stateRef.current.workspaces.find(
    (w) => w.id === stateRef.current.activeWorkspaceId
  ) || stateRef.current.workspaces[0];

  const createWorkspace = useCallback((name: string, icon?: string) => {
    dispatch({ type: "CREATE_WORKSPACE", name, icon });
  }, []);

  const deleteWorkspace = useCallback((workspaceId: string) => {
    dispatch({ type: "DELETE_WORKSPACE", workspaceId });
  }, []);

  const renameWorkspace = useCallback((workspaceId: string, name: string) => {
    dispatch({ type: "RENAME_WORKSPACE", workspaceId, name });
  }, []);

  const switchWorkspace = useCallback((workspaceId: string) => {
    dispatch({ type: "SWITCH_WORKSPACE", workspaceId });
  }, []);

  const duplicateWorkspace = useCallback((workspaceId: string, newName: string) => {
    dispatch({ type: "DUPLICATE_WORKSPACE", workspaceId, newName });
  }, []);

  const addWindowToWorkspace = useCallback((workspaceId: string, windowId: string) => {
    dispatch({ type: "ADD_WINDOW_TO_WORKSPACE", workspaceId, windowId });
  }, []);

  const removeWindowFromWorkspace = useCallback((workspaceId: string, windowId: string) => {
    dispatch({ type: "REMOVE_WINDOW_FROM_WORKSPACE", workspaceId, windowId });
  }, []);

  return {
    state: stateRef.current,
    workspaces: stateRef.current.workspaces,
    activeWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    switchWorkspace,
    duplicateWorkspace,
    addWindowToWorkspace,
    removeWindowFromWorkspace,
  };
}
