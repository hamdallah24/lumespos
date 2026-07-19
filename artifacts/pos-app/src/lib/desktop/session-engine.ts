import { useCallback, useEffect, useReducer, useRef } from "react";
import { desktopEventBus, emit } from "./event-bus";
import type { WindowState, Notification } from "./types";

/* ─── Session State ─── */

interface SessionState {
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  isAuthenticated: boolean;
  desktopLayout: {
    windows: WindowState[];
    activeWindowId: string | null;
    nextZIndex: number;
    nextWindowId: number;
  };
  workspaceState: unknown;
  notifications: Notification[];
  missionState: unknown;
  executiveState: unknown;
  dockApps: string[];
  windowStack: string[];
  lastSaved: number;
  sessionStarted: number;
}

type SessionAction =
  | { type: "SET_USER"; user: { id?: string; name?: string; email?: string; role?: string } | null }
  | { type: "SET_DESKTOP_LAYOUT"; layout: SessionState["desktopLayout"] }
  | { type: "SET_WORKSPACE_STATE"; state: unknown }
  | { type: "SET_NOTIFICATIONS"; notifications: Notification[] }
  | { type: "SET_MISSION_STATE"; state: unknown }
  | { type: "SET_EXECUTIVE_STATE"; state: unknown }
  | { type: "SET_DOCK_APPS"; apps: string[] }
  | { type: "SET_WINDOW_STACK"; stack: string[] }
  | { type: "SAVE" }
  | { type: "RESTORE" }
  | { type: "CLEAR" }
  | { type: "SET_AUTHENTICATED"; value: boolean };

/* ─── Storage ─── */

const STORAGE_KEY = "lume-session";

function getStorageKey(userId: string | null): string {
  return userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
}

/* ─── Reducer ─── */

function createInitialState(): SessionState {
  return {
    userId: null,
    userName: null,
    userRole: null,
    isAuthenticated: false,
    desktopLayout: {
      windows: [],
      activeWindowId: null,
      nextZIndex: 100,
      nextWindowId: 1,
    },
    workspaceState: null,
    notifications: [],
    missionState: null,
    executiveState: null,
    dockApps: [],
    windowStack: [],
    lastSaved: 0,
    sessionStarted: Date.now(),
  };
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "SET_USER":
      if (action.user === null) {
        return {
          ...state,
          userId: null,
          userName: null,
          userRole: null,
          isAuthenticated: false,
        };
      }
      return {
        ...state,
        userId: action.user.id ?? state.userId,
        userName: action.user.name ?? state.userName,
        userRole: action.user.role ?? state.userRole,
      };

    case "SET_DESKTOP_LAYOUT":
      return { ...state, desktopLayout: action.layout };

    case "SET_WORKSPACE_STATE":
      return { ...state, workspaceState: action.state };

    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.notifications };

    case "SET_MISSION_STATE":
      return { ...state, missionState: action.state };

    case "SET_EXECUTIVE_STATE":
      return { ...state, executiveState: action.state };

    case "SET_DOCK_APPS":
      return { ...state, dockApps: action.apps };

    case "SET_WINDOW_STACK":
      return { ...state, windowStack: action.stack };

    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.value };

    case "SAVE": {
      const key = getStorageKey(state.userId);
      try {
        const serializable: Record<string, unknown> = {
          userId: state.userId,
          userName: state.userName,
          userRole: state.userRole,
          isAuthenticated: state.isAuthenticated,
          desktopLayout: state.desktopLayout,
          workspaceState: state.workspaceState,
          notifications: state.notifications,
          missionState: state.missionState,
          executiveState: state.executiveState,
          dockApps: state.dockApps,
          windowStack: state.windowStack,
          lastSaved: Date.now(),
          sessionStarted: state.sessionStarted,
        };
        localStorage.setItem(key, JSON.stringify(serializable));
      } catch {}
      return { ...state, lastSaved: Date.now() };
    }

    case "RESTORE": {
      const key = getStorageKey(state.userId);
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SessionState>;
          return {
            ...state,
            ...parsed,
            lastSaved: parsed.lastSaved ?? 0,
            sessionStarted: parsed.sessionStarted ?? Date.now(),
          };
        }
      } catch {}
      return state;
    }

    case "CLEAR": {
      const key = getStorageKey(state.userId);
      try {
        localStorage.removeItem(key);
      } catch {}
      return createInitialState();
    }

    default:
      return state;
  }
}

/* ─── Module-Level Singleton ─── */

let _state: SessionState = createInitialState();
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function dispatch(action: SessionAction) {
  _state = sessionReducer(_state, action);
  _listeners.forEach((l) => l());
}

function getState(): SessionState {
  return _state;
}

/* ─── Snapshot Utilities ─── */

export function getSessionSnapshot(): string {
  return JSON.stringify(getState());
}

export function restoreSessionSnapshot(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Partial<SessionState>;
    dispatch({ type: "SET_USER", user: parsed.userId ? { id: parsed.userId, name: parsed.userName ?? undefined, role: parsed.userRole ?? undefined } : null });
    if (parsed.desktopLayout) dispatch({ type: "SET_DESKTOP_LAYOUT", layout: parsed.desktopLayout });
    if (parsed.workspaceState !== undefined) dispatch({ type: "SET_WORKSPACE_STATE", state: parsed.workspaceState });
    if (parsed.notifications) dispatch({ type: "SET_NOTIFICATIONS", notifications: parsed.notifications });
    if (parsed.missionState !== undefined) dispatch({ type: "SET_MISSION_STATE", state: parsed.missionState });
    if (parsed.executiveState !== undefined) dispatch({ type: "SET_EXECUTIVE_STATE", state: parsed.executiveState });
    if (parsed.dockApps) dispatch({ type: "SET_DOCK_APPS", apps: parsed.dockApps });
    if (parsed.windowStack) dispatch({ type: "SET_WINDOW_STACK", stack: parsed.windowStack });
    if (parsed.isAuthenticated !== undefined) dispatch({ type: "SET_AUTHENTICATED", value: parsed.isAuthenticated });
    dispatch({ type: "SAVE" });
    return true;
  } catch {
    return false;
  }
}

/* ─── Debounce ─── */

function useDebouncedCallback(callback: () => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debounced = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callback();
    }, delay);
  }, [callback, delay]);

  return debounced;
}

/* ─── React Hook ─── */

export function useSessionEngine(userId?: string) {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  const userIdRef = useRef(userId ?? null);
  userIdRef.current = userId ?? null;

  const doSave = useCallback(() => {
    dispatch({ type: "SAVE" });
    emit.sessionSaved(userIdRef.current ?? "anonymous");
  }, []);

  const debouncedSave = useDebouncedCallback(doSave, 500);

  // Subscribe to store changes
  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  // Set userId and restore on mount
  useEffect(() => {
    if (userId) {
      dispatch({ type: "SET_USER", user: { id: userId } });
    }
    dispatch({ type: "RESTORE" });
    emit.sessionRestored(userId ?? "anonymous");
  }, [userId]);

  // Auto-save on every state change
  useEffect(() => {
    return subscribe(() => {
      debouncedSave();
    });
  }, [debouncedSave]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      dispatch({ type: "SAVE" });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // User
  const setUser = useCallback(
    (user: { id?: string; name?: string; email?: string; role?: string } | null) => {
      dispatch({ type: "SET_USER", user });
      if (user?.id && user.id !== userIdRef.current) {
        userIdRef.current = user.id;
        dispatch({ type: "RESTORE" });
      }
    },
    []
  );

  const setAuthenticated = useCallback((v: boolean) => {
    dispatch({ type: "SET_AUTHENTICATED", value: v });
  }, []);

  // Desktop
  const setDesktopLayout = useCallback(
    (layout: SessionState["desktopLayout"]) => {
      dispatch({ type: "SET_DESKTOP_LAYOUT", layout });
    },
    []
  );

  // Workspace
  const setWorkspaceState = useCallback((state: unknown) => {
    dispatch({ type: "SET_WORKSPACE_STATE", state });
  }, []);

  // Notifications
  const setNotifications = useCallback((notifications: Notification[]) => {
    dispatch({ type: "SET_NOTIFICATIONS", notifications });
  }, []);

  // Mission
  const setMissionState = useCallback((state: unknown) => {
    dispatch({ type: "SET_MISSION_STATE", state });
  }, []);

  // Executive
  const setExecutiveState = useCallback((state: unknown) => {
    dispatch({ type: "SET_EXECUTIVE_STATE", state });
  }, []);

  // Dock
  const setDockApps = useCallback((apps: string[]) => {
    dispatch({ type: "SET_DOCK_APPS", apps });
  }, []);

  // Window stack
  const setWindowStack = useCallback((stack: string[]) => {
    dispatch({ type: "SET_WINDOW_STACK", stack });
  }, []);

  // Persistence
  const save = useCallback(() => {
    dispatch({ type: "SAVE" });
    emit.sessionSaved(stateRef.current.userId ?? "anonymous");
  }, []);

  const restore = useCallback(() => {
    dispatch({ type: "RESTORE" });
    emit.sessionRestored(stateRef.current.userId ?? "anonymous");
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  // Computed session duration
  const sessionDuration = Date.now() - stateRef.current.sessionStarted;

  return {
    state: stateRef.current,
    setUser,
    userId: stateRef.current.userId,
    userName: stateRef.current.userName,
    userRole: stateRef.current.userRole,
    isAuthenticated: stateRef.current.isAuthenticated,
    setAuthenticated,
    setDesktopLayout,
    setWorkspaceState,
    setNotifications,
    setMissionState,
    setExecutiveState,
    setDockApps,
    setWindowStack,
    save,
    restore,
    clear,
    lastSaved: stateRef.current.lastSaved,
    sessionStarted: stateRef.current.sessionStarted,
    sessionDuration,
  };
}
