/**
 * Lumé OS Accessibility Layer
 * T13S Phase 13
 *
 * Keyboard navigation, focus management, screen reader support,
 * high contrast, reduced motion, zoom, large text, touch targets.
 */

import { useEffect, useRef, useCallback, useState, type FC } from "react";

// ---------------------------------------------------------------------------
// Focus management
// ---------------------------------------------------------------------------

export function useFocusTrap(isActive: boolean): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const currentFocusable = getFocusableElements(container);
      if (currentFocusable.length === 0) return;

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

// ---------------------------------------------------------------------------
// Keyboard navigation for lists
// ---------------------------------------------------------------------------

export function useListNavigation(
  items: { length: number },
  onSelect: (index: number) => void,
  options?: { vertical?: boolean; loop?: boolean }
): {
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
} {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { vertical = true, loop = true } = options || {};

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = vertical ? "ArrowDown" : "ArrowRight";

      if (e.key === prevKey) {
        e.preventDefault();
        setSelectedIndex((i) => {
          if (i > 0) return i - 1;
          return loop ? items.length - 1 : 0;
        });
      } else if (e.key === nextKey) {
        e.preventDefault();
        setSelectedIndex((i) => {
          if (i < items.length - 1) return i + 1;
          return loop ? 0 : items.length - 1;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelectedIndex(items.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(selectedIndex);
      }
    },
    [items.length, selectedIndex, onSelect, vertical, loop]
  );

  return { selectedIndex, setSelectedIndex, handleKeyDown };
}

// ---------------------------------------------------------------------------
// Screen reader announcements
// ---------------------------------------------------------------------------

export function useLiveRegion(): {
  announce: (message: string, priority?: "polite" | "assertive") => void;
  LiveRegion: FC;
} {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"polite" | "assertive">("polite");

  const announce = useCallback((msg: string, p: "polite" | "assertive" = "polite") => {
    setMessage("");
    setPriority(p);
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  const LiveRegion: FC = useCallback(
    () => (
      <div role="status" aria-live={priority} aria-atomic="true" className="sr-only">
        {message}
      </div>
    ),
    [message, priority]
  );

  return { announce, LiveRegion };
}

// ---------------------------------------------------------------------------
// Reduced motion detection
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

// ---------------------------------------------------------------------------
// High contrast detection
// ---------------------------------------------------------------------------

export function useHighContrast(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-contrast: high)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-contrast: high)");
    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isHighContrast;
}

// ---------------------------------------------------------------------------
// Zoom level detection
// ---------------------------------------------------------------------------

export function useZoomLevel(): number {
  const [zoom, setZoom] = useState(() => {
    if (typeof window === "undefined") return 1;
    return window.devicePixelRatio || 1;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handler = () => setZoom(window.devicePixelRatio);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return zoom;
}

// ---------------------------------------------------------------------------
// Large text detection
// ---------------------------------------------------------------------------

export function useLargeText(): boolean {
  const [isLarge, setIsLarge] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(min-resolution: 1dppx)").matches &&
      parseInt(getComputedStyle(document.documentElement).fontSize) >= 20
    );
  });

  return isLarge;
}

// ---------------------------------------------------------------------------
// ARIA helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

export function useUniqueId(prefix: string = "lume"): string {
  const [id] = useState(() => `${prefix}-${++_idCounter}`);
  return id;
}

export function getComboboxProps(inputId: string, listboxId: string) {
  return {
    input: {
      id: inputId,
      role: "combobox" as const,
      "aria-expanded": true,
      "aria-controls": listboxId,
      "aria-autocomplete": "list" as const,
    },
    listbox: {
      id: listboxId,
      role: "listbox" as const,
      "aria-labelledby": inputId,
    },
  };
}

export function getOptionProps(
  optionId: string,
  listboxId: string,
  isSelected: boolean
) {
  return {
    id: optionId,
    role: "option" as const,
    "aria-selected": isSelected,
    "aria-controls": listboxId,
  };
}

// ---------------------------------------------------------------------------
// Skip to content link
// ---------------------------------------------------------------------------

export function SkipToContent({ targetId }: { targetId: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[99999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:text-sm focus:font-medium"
    >
      Skip to content
    </a>
  );
}

// ---------------------------------------------------------------------------
// Touch target sizing
// ---------------------------------------------------------------------------

export function ensureTouchTarget(
  size: number,
  minTarget: number = 44
): React.CSSProperties {
  if (size >= minTarget) return {};
  return {
    minWidth: minTarget,
    minHeight: minTarget,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
