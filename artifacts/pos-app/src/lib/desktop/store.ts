import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AppDefinition,
  DesktopAction,
  DesktopState,
  WindowState,
} from "./types";

const MENU_BAR_HEIGHT = 32;
const DOCK_HEIGHT = 68;
const WINDOW_PADDING = 40;

function getWindowPosition(
  state: DesktopState,
  app: AppDefinition
): { x: number; y: number } {
  const existingCount = state.windows.filter(
    (w) => w.appId === app.id
  ).length;
  const offset = existingCount * 30;
  const x = Math.max(
    WINDOW_PADDING,
    Math.min(
      window.innerWidth / 2 - (app.defaultWidth ?? 800) / 2 + offset,
      window.innerWidth - (app.defaultWidth ?? 800) - WINDOW_PADDING
    )
  );
  const y = Math.max(
    MENU_BAR_HEIGHT + WINDOW_PADDING,
    Math.min(
      window.innerHeight / 2 - (app.defaultHeight ?? 500) / 2 + offset,
      window.innerHeight - DOCK_HEIGHT - (app.defaultHeight ?? 500) - WINDOW_PADDING
    )
  );
  return { x, y };
}

function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  switch (action.type) {
    case "OPEN_WINDOW": {
      if (!action.app.allowMultiple) {
        const existing = state.windows.find(
          (w) => w.appId === action.app.id && !w.isMinimized
        );
        if (existing) {
          return {
            ...state,
            windows: state.windows.map((w) =>
              w.id === existing.id
                ? { ...w, isMinimized: false, zIndex: state.nextZIndex }
                : w
            ),
            activeWindowId: existing.id,
            nextZIndex: state.nextZIndex + 1,
          };
        }
        const minimized = state.windows.find(
          (w) => w.appId === action.app.id && w.isMinimized
        );
        if (minimized) {
          return {
            ...state,
            windows: state.windows.map((w) =>
              w.id === minimized.id
                ? { ...w, isMinimized: false, zIndex: state.nextZIndex }
                : w
            ),
            activeWindowId: minimized.id,
            nextZIndex: state.nextZIndex + 1,
          };
        }
      }

      const pos = getWindowPosition(state, action.app);
      const newWindow: WindowState = {
        id: `win-${state.nextWindowId}`,
        appId: action.app.id,
        title: action.app.title,
        x: pos.x,
        y: pos.y,
        width: action.app.defaultWidth ?? 800,
        height: action.app.defaultHeight ?? 500,
        minWidth: action.app.minWidth ?? 400,
        minHeight: action.app.minHeight ?? 300,
        isMinimized: false,
        isMaximized: false,
        isPinned: false,
        isAlwaysOnTop: false,
        zIndex: state.nextZIndex,
        icon: action.app.icon,
        color: action.app.color,
      };
      return {
        ...state,
        windows: [...state.windows, newWindow],
        activeWindowId: newWindow.id,
        nextZIndex: state.nextZIndex + 1,
        nextWindowId: state.nextWindowId + 1,
      };
    }

    case "CLOSE_WINDOW":
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== action.windowId),
        activeWindowId:
          state.activeWindowId === action.windowId
            ? (() => {
                const remaining = state.windows.filter(
                  (w) => w.id !== action.windowId && !w.isMinimized
                );
                return remaining.length > 0
                  ? remaining.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
                  : null;
              })()
            : state.activeWindowId,
      };

    case "MINIMIZE_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId ? { ...w, isMinimized: true } : w
        ),
        activeWindowId:
          state.activeWindowId === action.windowId
            ? (() => {
                const visible = state.windows.filter(
                  (w) => w.id !== action.windowId && !w.isMinimized
                );
                return visible.length > 0
                  ? visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
                  : null;
              })()
            : state.activeWindowId,
      };

    case "MAXIMIZE_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId ? { ...w, isMaximized: true } : w
        ),
      };

    case "RESTORE_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId
            ? { ...w, isMinimized: false, isMaximized: false, zIndex: state.nextZIndex }
            : w
        ),
        activeWindowId: action.windowId,
        nextZIndex: state.nextZIndex + 1,
      };

    case "FOCUS_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId
            ? { ...w, zIndex: state.nextZIndex }
            : w
        ),
        activeWindowId: action.windowId,
        nextZIndex: state.nextZIndex + 1,
      };

    case "MOVE_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId ? { ...w, x: action.x, y: action.y } : w
        ),
      };

    case "RESIZE_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId
            ? {
                ...w,
                width: Math.max(w.minWidth, action.width),
                height: Math.max(w.minHeight, action.height),
              }
            : w
        ),
      };

    case "CLOSE_ALL_WINDOWS":
      return {
        ...state,
        windows: [],
        activeWindowId: null,
      };

    case "PIN_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId ? { ...w, isPinned: true } : w
        ),
      };

    case "UNPIN_WINDOW":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId ? { ...w, isPinned: false } : w
        ),
      };

    case "SET_ALWAYS_ON_TOP":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.windowId
            ? {
                ...w,
                isAlwaysOnTop: action.alwaysOnTop,
                zIndex: action.alwaysOnTop ? 90000 : w.zIndex,
              }
            : w
        ),
      };

    default:
      return state;
  }
}

const initialState: DesktopState = {
  windows: [],
  activeWindowId: null,
  nextZIndex: 100,
  nextWindowId: 1,
};

type Listener = () => void;
let _state = initialState;
let _listeners: Listener[] = [];

function subscribe(listener: Listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function dispatch(action: DesktopAction) {
  _state = desktopReducer(_state, action);
  _listeners.forEach((l) => l());
}

function getState(): DesktopState {
  return _state;
}

export function useDesktopStore() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const openApp = useCallback((app: AppDefinition) => {
    dispatch({ type: "OPEN_WINDOW", app });
  }, []);

  const closeWindow = useCallback((windowId: string) => {
    dispatch({ type: "CLOSE_WINDOW", windowId });
  }, []);

  const minimizeWindow = useCallback((windowId: string) => {
    dispatch({ type: "MINIMIZE_WINDOW", windowId });
  }, []);

  const maximizeWindow = useCallback((windowId: string) => {
    dispatch({ type: "MAXIMIZE_WINDOW", windowId });
  }, []);

  const restoreWindow = useCallback((windowId: string) => {
    dispatch({ type: "RESTORE_WINDOW", windowId });
  }, []);

  const focusWindow = useCallback((windowId: string) => {
    dispatch({ type: "FOCUS_WINDOW", windowId });
  }, []);

  const moveWindow = useCallback((windowId: string, x: number, y: number) => {
    dispatch({ type: "MOVE_WINDOW", windowId, x, y });
  }, []);

  const resizeWindow = useCallback(
    (windowId: string, width: number, height: number) => {
      dispatch({ type: "RESIZE_WINDOW", windowId, width, height });
    },
    []
  );

  const closeAllWindows = useCallback(() => {
    dispatch({ type: "CLOSE_ALL_WINDOWS" });
  }, []);

  const pinWindow = useCallback((windowId: string) => {
    dispatch({ type: "PIN_WINDOW", windowId });
  }, []);

  const unpinWindow = useCallback((windowId: string) => {
    dispatch({ type: "UNPIN_WINDOW", windowId });
  }, []);

  const setAlwaysOnTop = useCallback((windowId: string, alwaysOnTop: boolean) => {
    dispatch({ type: "SET_ALWAYS_ON_TOP", windowId, alwaysOnTop });
  }, []);

  return {
    state: stateRef.current,
    openApp,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    closeAllWindows,
    pinWindow,
    unpinWindow,
    setAlwaysOnTop,
  };
}
