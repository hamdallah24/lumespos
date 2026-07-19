/**
 * Lumé OS Design Tokens
 * ─────────────────────
 * Frozen design system. No component owns colors, spacing, or motion.
 * All visual properties flow through these tokens.
 *
 * T13S Phase 9 — Design System Freeze
 */

/* ─── Colors ─── */
export const colors = {
  // Base
  navy: {
    50: "#E8EEF6",
    100: "#C5D4E8",
    200: "#9DB5D6",
    300: "#7496C4",
    400: "#567FB7",
    500: "#3968AA",
    600: "#2F5B9C",
    700: "#23498A",
    800: "#183778",
    900: "#0A1E3D",
    950: "#071426",
  },
  // Primary (Electric Blue)
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#2563EB",
    600: "#1D4ED8",
    700: "#1E40AF",
    800: "#1E3A8A",
    900: "#1E3A5F",
  },
  // Accent (Cyan)
  accent: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    200: "#BAE6FD",
    300: "#7DD3FC",
    400: "#38BDF8",
    500: "#0EA5E9",
    600: "#0284C7",
    700: "#0369A1",
    800: "#075985",
    900: "#0C4A6E",
  },
  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  // Neutral
  white: "#FFFFFF",
  black: "#000000",
  // Surfaces
  surface: {
    base: "#071426",
    raised: "#0A1E3D",
    overlay: "#0F1923",
    glass: "rgba(7, 20, 38, 0.72)",
    glassHeavy: "rgba(7, 20, 38, 0.85)",
    glassLight: "rgba(7, 20, 38, 0.4)",
  },
  // Text
  text: {
    primary: "rgba(255, 255, 255, 0.90)",
    secondary: "rgba(255, 255, 255, 0.60)",
    tertiary: "rgba(255, 255, 255, 0.40)",
    muted: "rgba(255, 255, 255, 0.25)",
    ghost: "rgba(255, 255, 255, 0.12)",
  },
  // Border
  border: {
    subtle: "rgba(142, 216, 255, 0.06)",
    default: "rgba(142, 216, 255, 0.08)",
    strong: "rgba(142, 216, 255, 0.12)",
    accent: "rgba(37, 99, 235, 0.3)",
  },
} as const;

/* ─── Spacing ─── */
export const spacing = {
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  3.5: "14px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

/* ─── Radius ─── */
export const radius = {
  none: "0px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
} as const;

/* ─── Elevation (Box Shadows) ─── */
export const elevation = {
  none: "none",
  xs: "0 1px 2px rgba(0, 0, 0, 0.2)",
  sm: "0 2px 4px rgba(0, 0, 0, 0.25)",
  md: "0 4px 8px rgba(0, 0, 0, 0.3)",
  lg: "0 8px 16px rgba(0, 0, 0, 0.35)",
  xl: "0 16px 32px rgba(0, 0, 0, 0.4)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  // Glass-specific
  glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
  glassLg: "0 20px 50px -12px rgba(0, 0, 0, 0.5)",
  glassPanel: "0 15px 40px -10px rgba(0, 0, 0, 0.5)",
  glassWindow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(142, 216, 255, 0.08)",
  // Glow
  glowPrimary: "0 8px 24px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(142, 216, 255, 0.2)",
  glowAccent: "0 8px 24px rgba(14, 165, 233, 0.4)",
} as const;

/* ─── Blur ─── */
export const blur = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "40px",
} as const;

/* ─── Typography ─── */
export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: {
    xs: "10px",
    sm: "11px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "24px",
    "3xl": "30px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
  },
  letterSpacing: {
    tight: "-0.01em",
    normal: "0",
    wide: "0.02em",
    wider: "0.05em",
  },
} as const;

/* ─── Animation Timing ─── */
export const timing = {
  instant: 80,
  fast: 120,
  normal: 180,
  slow: 260,
  slower: 400,
} as const;

/* ─── Easing Curves ─── */
export const easing = {
  default: [0.16, 1, 0.3, 1] as [number, number, number, number],
  spring: { stiffness: 400, damping: 25 },
  springGentle: { stiffness: 300, damping: 30 },
  springSnappy: { stiffness: 500, damping: 30 },
  springBouncy: { stiffness: 400, damping: 20 },
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

/* ─── Layout Constants ─── */
export const layout = {
  menuBarHeight: 32,
  dockHeight: 68,
  dockIconSize: 44,
  dockGap: 4,
  dockPadding: 12,
  dockBorderRadius: 20,
  windowTitleBarHeight: 36,
  windowMinWidth: 400,
  windowMinHeight: 300,
  windowDefaultWidth: 800,
  windowDefaultHeight: 500,
  windowPadding: 40,
  sidebarWidth: 320,
  commandPaletteWidth: 560,
  contextMenuMinWidth: 180,
  panelBorderRadius: 16,
  cardBorderRadius: 12,
  notificationWidth: 340,
  notificationMaxHeight: "70vh",
  alwaysOnTopZIndex: 90000,
  dockZIndex: 9998,
  menuBarZIndex: 9999,
  overlayZIndex: 10001,
  modalZIndex: 10002,
  widgetZIndex: 100,
  minTouchTarget: 44,
} as const;

/* ─── Glass Presets ─── */
export const glass = {
  menuBar: {
    background: colors.surface.glass,
    backdropFilter: `blur(${blur.lg}) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur.lg}) saturate(180%)`,
    borderBottom: `1px solid ${colors.border.default}`,
  },
  dock: {
    background: "rgba(7, 20, 38, 0.65)",
    backdropFilter: `blur(${blur.lg}) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur.lg}) saturate(180%)`,
    border: `1px solid ${colors.border.default}`,
    boxShadow: elevation.glass,
  },
  panel: {
    background: "rgba(10, 18, 35, 0.97)",
    backdropFilter: `blur(${blur["2xl"]})`,
    border: `1px solid ${colors.border.strong}`,
    boxShadow: elevation.glassLg,
  },
  window: {
    titleBar: {
      background: "rgba(10, 20, 40, 0.92)",
      backdropFilter: `blur(${blur.md})`,
      borderBottom: `1px solid ${colors.border.subtle}`,
    },
    titleBarPinned: {
      background: "rgba(21, 101, 255, 0.12)",
      backdropFilter: `blur(${blur.md})`,
      borderBottom: `1px solid ${colors.border.subtle}`,
    },
    content: {
      background: "rgba(10, 18, 35, 0.98)",
    },
  },
  contextMenu: {
    background: "rgba(15, 25, 45, 0.95)",
    backdropFilter: `blur(${blur.lg})`,
    border: `1px solid ${colors.border.strong}`,
    boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(142, 216, 255, 0.05)",
  },
  overlay: {
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: `blur(${blur.sm})`,
  },
  tooltip: {
    background: "rgba(7, 20, 38, 0.85)",
    backdropFilter: `blur(${blur.sm})`,
    border: `1px solid ${colors.border.strong}`,
  },
  widget: {
    background: colors.surface.glassLight,
    backdropFilter: `blur(${blur.md})`,
    border: `1px solid ${colors.border.subtle}`,
  },
  executiveCenter: {
    background: "rgba(8, 14, 28, 0.96)",
    backdropFilter: `blur(${blur.xl})`,
    borderLeft: `1px solid ${colors.border.default}`,
    boxShadow: "-20px 0 40px rgba(0, 0, 0, 0.3)",
  },
} as const;

/* ─── CSS Variable Generator ─── */
export function generateCSSVariables(): Record<string, string> {
  return {
    "--lume-navy-base": colors.navy[950],
    "--lume-navy-raised": colors.navy[900],
    "--lume-primary": colors.primary[500],
    "--lume-primary-light": colors.primary[400],
    "--lume-primary-dark": colors.primary[600],
    "--lume-accent": colors.accent[500],
    "--lume-accent-light": colors.accent[400],
    "--lume-success": colors.success,
    "--lume-warning": colors.warning,
    "--lume-error": colors.error,
    "--lume-info": colors.info,
    "--lume-text-primary": colors.text.primary,
    "--lume-text-secondary": colors.text.secondary,
    "--lume-text-tertiary": colors.text.tertiary,
    "--lume-border-subtle": colors.border.subtle,
    "--lume-border-default": colors.border.default,
    "--lume-border-strong": colors.border.strong,
    "--lume-radius-sm": radius.sm,
    "--lume-radius-md": radius.md,
    "--lume-radius-lg": radius.lg,
    "--lume-radius-xl": radius.xl,
    "--lume-radius-2xl": radius["2xl"],
    "--lume-menubar-h": `${layout.menuBarHeight}px`,
    "--lume-dock-h": `${layout.dockHeight}px`,
    "--lume-sidebar-w": `${layout.sidebarWidth}px`,
    "--lume-font-family": typography.fontFamily,
  };
}
