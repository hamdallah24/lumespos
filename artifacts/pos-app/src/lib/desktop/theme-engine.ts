/**
 * Lumé OS Theme Engine
 * ────────────────────
 * Token-based theming. No component owns colors.
 * Supports: dark, light, auto, high-contrast, brand.
 *
 * T13S Phase 7 — Theme Engine
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { colors, generateCSSVariables } from "./tokens";

/* ─── Theme Types ─── */
export type ThemeId = "dark" | "light" | "high-contrast" | "brand";

export interface ThemeColors {
  navy: Record<string, string>;
  primary: Record<string, string>;
  accent: Record<string, string>;
  success: string;
  warning: string;
  error: string;
  info: string;
  surface: {
    base: string;
    raised: string;
    overlay: string;
    glass: string;
    glassHeavy: string;
    glassLight: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    ghost: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    accent: string;
  };
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
}

/* ─── Theme Definitions ─── */
const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  colors: colors,
};

const lightTheme: Theme = {
  id: "light",
  name: "Light",
  colors: {
    ...colors,
    surface: {
      base: "#F8FAFC",
      raised: "#FFFFFF",
      overlay: "#F1F5F9",
      glass: "rgba(255, 255, 255, 0.72)",
      glassHeavy: "rgba(255, 255, 255, 0.85)",
      glassLight: "rgba(255, 255, 255, 0.4)",
    },
    text: {
      primary: "rgba(0, 0, 0, 0.90)",
      secondary: "rgba(0, 0, 0, 0.60)",
      tertiary: "rgba(0, 0, 0, 0.40)",
      muted: "rgba(0, 0, 0, 0.25)",
      ghost: "rgba(0, 0, 0, 0.12)",
    },
    border: {
      subtle: "rgba(0, 0, 0, 0.06)",
      default: "rgba(0, 0, 0, 0.08)",
      strong: "rgba(0, 0, 0, 0.12)",
      accent: "rgba(37, 99, 235, 0.3)",
    },
  },
};

const highContrastTheme: Theme = {
  id: "high-contrast",
  name: "High Contrast",
  colors: {
    ...colors,
    primary: {
      ...colors.primary,
      400: "#60A5FA",
      500: "#3B82F6",
    },
    text: {
      primary: "rgba(255, 255, 255, 1)",
      secondary: "rgba(255, 255, 255, 0.80)",
      tertiary: "rgba(255, 255, 255, 0.60)",
      muted: "rgba(255, 255, 255, 0.40)",
      ghost: "rgba(255, 255, 255, 0.25)",
    },
    border: {
      subtle: "rgba(142, 216, 255, 0.15)",
      default: "rgba(142, 216, 255, 0.25)",
      strong: "rgba(142, 216, 255, 0.40)",
      accent: "rgba(37, 99, 235, 0.6)",
    },
  },
};

const brandTheme: Theme = {
  id: "brand",
  name: "Brand",
  colors: {
    ...colors,
    primary: {
      ...colors.primary,
      500: "#6366F1",
      400: "#818CF8",
      600: "#4F46E5",
    },
    accent: {
      ...colors.accent,
      500: "#8B5CF6",
      400: "#A78BFA",
    },
  },
};

const themes: Record<ThemeId, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  "high-contrast": highContrastTheme,
  brand: brandTheme,
};

/* ─── Theme State ─── */
interface ThemeState {
  themeId: ThemeId;
  autoMode: boolean;
}

type ThemeAction =
  | { type: "SET_THEME"; themeId: ThemeId }
  | { type: "SET_AUTO"; auto: boolean }
  | { type: "RESTORE"; state: ThemeState };

const THEME_STORAGE_KEY = "lume-theme";

function loadThemeState(): ThemeState {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ThemeState;
  } catch {}
  return { themeId: "dark", autoMode: false };
}

function saveThemeState(state: ThemeState) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case "SET_THEME":
      return { ...state, themeId: action.themeId, autoMode: false };
    case "SET_AUTO":
      return { ...state, autoMode: action.auto };
    case "RESTORE":
      return action.state;
    default:
      return state;
  }
}

/* ─── Singleton ─── */
let _state: ThemeState = loadThemeState();
let _listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function dispatch(action: ThemeAction) {
  _state = themeReducer(_state, action);
  saveThemeState(_state);
  _listeners.forEach((l) => l());
}

function getState(): ThemeState {
  return _state;
}

/* ─── CSS Variables Application ─── */
function applyThemeCSS(theme: Theme) {
  const root = document.documentElement;
  const vars = generateCSSVariables();
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Apply theme-specific overrides
  root.style.setProperty("--lume-theme-id", theme.id);
  root.setAttribute("data-theme", theme.id);
}

/* ─── Auto Theme (system preference) ─── */
function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* ─── React Hook ─── */
export function useThemeStore() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  // Apply theme on state change
  useEffect(() => {
    const resolved = stateRef.current.autoMode
      ? getSystemPreference()
      : stateRef.current.themeId;
    applyThemeCSS(themes[resolved] || themes.dark);
  }, [stateRef.current.themeId, stateRef.current.autoMode]);

  // Listen for system preference changes when in auto mode
  useEffect(() => {
    if (!stateRef.current.autoMode) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyThemeCSS(themes[getSystemPreference()]);
      forceUpdate();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [stateRef.current.autoMode]);

  const setTheme = useCallback((themeId: ThemeId) => {
    dispatch({ type: "SET_THEME", themeId });
  }, []);

  const setAuto = useCallback((auto: boolean) => {
    dispatch({ type: "SET_AUTO", auto });
  }, []);

  const resolvedThemeId = stateRef.current.autoMode
    ? getSystemPreference()
    : stateRef.current.themeId;

  const currentTheme = themes[resolvedThemeId] || themes.dark;

  return {
    themeId: resolvedThemeId,
    autoMode: stateRef.current.autoMode,
    theme: currentTheme,
    setTheme,
    setAuto,
    themes: Object.values(themes),
  };
}

/* ─── Static helpers (non-hook) ─── */
export function getTheme(id: ThemeId): Theme {
  return themes[id] || themes.dark;
}

export function getCurrentTheme(): Theme {
  const state = loadThemeState();
  const resolved = state.autoMode ? getSystemPreference() : state.themeId;
  return themes[resolved] || themes.dark;
}
