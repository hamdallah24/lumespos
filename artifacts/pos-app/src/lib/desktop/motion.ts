/**
 * Lumé OS Motion Engine
 * ─────────────────────
 * Centralized animation system. No component defines its own timings.
 * All motion flows through this engine.
 *
 * T13S Phase 6 — Motion Engine
 */

import { timing, easing } from "./tokens";

/* ─── Animation Presets ─── */
export const motion = {
  // Window animations
  window: {
    enter: {
      initial: { opacity: 0, scale: 0.96, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 8 },
      transition: { duration: timing.normal / 1000, ease: easing.default },
    },
    close: {
      initial: { opacity: 1, scale: 1, y: 0 },
      animate: { opacity: 0, scale: 0.96, y: 8 },
      transition: { duration: timing.fast / 1000, ease: easing.easeIn },
    },
    maximize: {
      transition: { duration: timing.normal / 1000, ease: easing.default },
    },
    restore: {
      transition: { duration: timing.normal / 1000, ease: easing.default },
    },
  },

  // Panel slide (Executive Center, Settings sidebar)
  panel: {
    enter: {
      initial: { x: 320, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 320, opacity: 0 },
      transition: { duration: timing.normal / 1000, ease: easing.default },
    },
  },

  // Dropdown / popover (workspace menu, context menu)
  dropdown: {
    enter: {
      initial: { opacity: 0, y: -4, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -4, scale: 0.98 },
      transition: { duration: timing.fast / 1000 },
    },
  },

  // Overlay backdrop (modals, command palette)
  overlay: {
    enter: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: timing.fast / 1000 },
    },
  },

  // Modal / command palette
  modal: {
    enter: {
      initial: { opacity: 0, scale: 0.96, y: -8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: -8 },
      transition: { duration: timing.fast / 1000, ease: easing.default },
    },
  },

  // Context menu
  contextMenu: {
    enter: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: timing.instant / 1000 },
    },
  },

  // Tooltip
  tooltip: {
    enter: {
      initial: { opacity: 0, y: 4, scale: 0.9 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 4, scale: 0.9 },
      transition: { duration: timing.instant / 1000 },
    },
  },

  // Dock hover (spring physics)
  dockHover: {
    hover: { scale: 1.25, y: -4 },
    normal: { scale: 1, y: 0 },
    transition: easing.spring,
  },

  // Menu bar entrance
  menuBar: {
    enter: {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: timing.slower / 1000 },
    },
  },

  // Dock entrance
  dock: {
    enter: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: timing.slower / 1000, delay: 0.2 },
    },
  },

  // Widget entrance
  widget: {
    enter: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: timing.slower / 1000, delay: 0.3 },
    },
  },

  // List item stagger
  stagger: {
    item: (index: number) => ({
      initial: { opacity: 0, x: -8 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: timing.normal / 1000, delay: index * 0.03 },
    }),
  },

  // Notification slide in
  notification: {
    enter: {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
      transition: { duration: timing.fast / 1000 },
    },
  },

  // AI pulse (for executive status)
  aiPulse: {
    animate: { opacity: [0.4, 1, 0.4] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },

  // Mission complete celebration
  missionComplete: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: timing.slower / 1000, ease: easing.springBouncy },
  },

  // Loading spinner
  loading: {
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },

  // Fade
  fade: {
    enter: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: timing.normal / 1000 },
    },
  },

  // Scale
  scale: {
    enter: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: timing.normal / 1000, ease: easing.default },
    },
  },
} as const;

/* ─── Reduced Motion Detection ─── */
let _prefersReducedMotion = false;

if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  _prefersReducedMotion = mq.matches;
  mq.addEventListener("change", (e) => {
    _prefersReducedMotion = e.matches;
  });
}

export function prefersReducedMotion(): boolean {
  return _prefersReducedMotion;
}

/**
 * Returns motion props that respect prefers-reduced-motion.
 * If reduced motion is preferred, returns instant transitions.
 */
export function reducedMotion<T extends { transition?: { duration?: number } }>(
  props: T
): T {
  if (!_prefersReducedMotion) return props;
  return {
    ...props,
    transition: { ...props.transition, duration: 0 },
  };
}

/**
 * Get CSS transition string from timing token.
 */
export function cssTransition(
  properties: string[],
  timingMs: number = timing.normal,
  easingFn: string = "cubic-bezier(0.16, 1, 0.3, 1)"
): string {
  return properties
    .map((prop) => `${prop} ${timingMs}ms ${easingFn}`)
    .join(", ");
}

/**
 * Get CSS transition for a specific action.
 */
export function windowTransition(): string {
  return cssTransition(["opacity", "transform"], timing.normal);
}

export function panelTransition(): string {
  return cssTransition(["transform", "opacity"], timing.normal);
}

export function dropdownTransition(): string {
  return cssTransition(["opacity", "transform"], timing.fast);
}
