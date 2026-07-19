import { useCallback, useEffect, useReducer, useRef } from "react";

type Breakpoint = "mobile" | "tablet" | "desktop";
type Density = "compact" | "comfortable" | "spacious";

type ResponsiveState = {
  breakpoint: Breakpoint;
  density: Density;
  isTouchMode: boolean;
  isCompactMode: boolean;
  isSidebarCollapsed: boolean;
  isDockCollapsed: boolean;
};

type ResponsiveAction =
  | { type: "SET_BREAKPOINT"; breakpoint: Breakpoint }
  | { type: "SET_DENSITY"; density: Density }
  | { type: "SET_TOUCH_MODE"; isTouchMode: boolean }
  | { type: "SET_COMPACT_MODE"; isCompactMode: boolean }
  | { type: "SET_SIDEBAR_COLLAPSED"; isSidebarCollapsed: boolean }
  | { type: "SET_DOCK_COLLAPSED"; isDockCollapsed: boolean };

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;

const STORAGE_KEY = "lume-responsive";

function prefersTouchMode(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window;
}

function detectBreakpoint(width: number): Breakpoint {
  if (width < MOBILE_BREAKPOINT) return "mobile";
  if (width < TABLET_BREAKPOINT) return "tablet";
  return "desktop";
}

function loadFromStorage(): Partial<ResponsiveState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        density: parsed.density ?? "comfortable",
        isCompactMode: parsed.isCompactMode ?? false,
      };
    }
  } catch {}
  return {};
}

function saveToStorage(state: ResponsiveState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        density: state.density,
        isCompactMode: state.isCompactMode,
      })
    );
  } catch {}
}

function getInitialState(): ResponsiveState {
  const width = typeof window !== "undefined" ? window.innerWidth : TABLET_BREAKPOINT;
  const saved = loadFromStorage();
  return {
    breakpoint: detectBreakpoint(width),
    density: saved.density ?? "comfortable",
    isTouchMode: prefersTouchMode(),
    isCompactMode: saved.isCompactMode ?? false,
    isSidebarCollapsed: false,
    isDockCollapsed: false,
  };
}

function responsiveReducer(state: ResponsiveState, action: ResponsiveAction): ResponsiveState {
  switch (action.type) {
    case "SET_BREAKPOINT":
      return { ...state, breakpoint: action.breakpoint };
    case "SET_DENSITY":
      return { ...state, density: action.density };
    case "SET_TOUCH_MODE":
      return { ...state, isTouchMode: action.isTouchMode };
    case "SET_COMPACT_MODE":
      return { ...state, isCompactMode: action.isCompactMode };
    case "SET_SIDEBAR_COLLAPSED":
      return { ...state, isSidebarCollapsed: action.isSidebarCollapsed };
    case "SET_DOCK_COLLAPSED":
      return { ...state, isDockCollapsed: action.isDockCollapsed };
    default:
      return state;
  }
}

let _state: ResponsiveState = getInitialState();
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function dispatch(action: ResponsiveAction) {
  _state = responsiveReducer(_state, action);
  saveToStorage(_state);
  _listeners.forEach((l) => l());
}

function getState(): ResponsiveState {
  return _state;
}

interface LayoutConstants {
  menuBarHeight: number;
  dockHeight: number;
  sidebarWidth: number;
  windowPadding: number;
}

function getLayoutConstants(breakpoint: Breakpoint, density: Density): LayoutConstants {
  const base: Record<Breakpoint, LayoutConstants> = {
    desktop: {
      menuBarHeight: 32,
      dockHeight: 68,
      sidebarWidth: 320,
      windowPadding: 40,
    },
    tablet: {
      menuBarHeight: 32,
      dockHeight: 60,
      sidebarWidth: 280,
      windowPadding: 24,
    },
    mobile: {
      menuBarHeight: 32,
      dockHeight: 0,
      sidebarWidth: 0,
      windowPadding: 16,
    },
  };

  const result = { ...base[breakpoint] };

  switch (density) {
    case "compact":
      result.menuBarHeight -= 4;
      result.dockHeight -= 8;
      result.windowPadding = Math.max(8, result.windowPadding - 8);
      break;
    case "spacious":
      result.menuBarHeight += 4;
      result.dockHeight += 8;
      result.windowPadding += 8;
      break;
    default:
      break;
  }

  return result;
}

export function useResponsiveStore() {
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
    const handleResize = () => {
      const newBreakpoint = detectBreakpoint(window.innerWidth);
      if (newBreakpoint !== getState().breakpoint) {
        dispatch({ type: "SET_BREAKPOINT", breakpoint: newBreakpoint });
      }
    };

    const handleTouchStart = () => {
      if (!getState().isTouchMode) {
        dispatch({ type: "SET_TOUCH_MODE", isTouchMode: true });
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  const state = stateRef.current;
  const layout = getLayoutConstants(state.breakpoint, state.density);

  const setDensity = useCallback((density: Density) => {
    dispatch({ type: "SET_DENSITY", density });
  }, []);

  const setCompactMode = useCallback((isCompactMode: boolean) => {
    dispatch({ type: "SET_COMPACT_MODE", isCompactMode });
  }, []);

  const setSidebarCollapsed = useCallback((isSidebarCollapsed: boolean) => {
    dispatch({ type: "SET_SIDEBAR_COLLAPSED", isSidebarCollapsed });
  }, []);

  const setDockCollapsed = useCallback((isDockCollapsed: boolean) => {
    dispatch({ type: "SET_DOCK_COLLAPSED", isDockCollapsed });
  }, []);

  return {
    breakpoint: state.breakpoint,
    isMobile: state.breakpoint === "mobile",
    isTablet: state.breakpoint === "tablet",
    isDesktop: state.breakpoint === "desktop",
    density: state.density,
    isTouchMode: state.isTouchMode,
    isCompactMode: state.isCompactMode,
    isSidebarCollapsed: state.isSidebarCollapsed,
    isDockCollapsed: state.isDockCollapsed,
    setDensity,
    setCompactMode,
    setSidebarCollapsed,
    setDockCollapsed,
    menuBarHeight: layout.menuBarHeight,
    dockHeight: layout.dockHeight,
    sidebarWidth: layout.sidebarWidth,
    windowPadding: layout.windowPadding,
  };
}

export { prefersTouchMode, detectBreakpoint, getLayoutConstants };
export type { Breakpoint, Density, ResponsiveState, ResponsiveAction };
