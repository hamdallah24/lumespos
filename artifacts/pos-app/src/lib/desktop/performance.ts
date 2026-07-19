/**
 * Lumé OS Performance Layer
 * T13S Phase 12
 *
 * Utilities for optimizing the Cloud Desktop shell.
 * Targets: 60 FPS, minimal rerenders, lazy mounting, memory cleanup.
 */

import {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ComponentType,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// 1. React.memo wrappers with custom comparison
// ---------------------------------------------------------------------------

export function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}

export function memoShallow<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return memo(Component, shallowEqual);
}

export function memoCustom<P>(
  Component: ComponentType<P>,
  areEqual: (prev: P, next: P) => boolean,
): ComponentType<P> {
  return memo(Component, areEqual);
}

// ---------------------------------------------------------------------------
// 2. Stable callback hook
// ---------------------------------------------------------------------------

export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    ((...args: unknown[]) => fnRef.current(...args)) as T,
    [],
  );
}

// ---------------------------------------------------------------------------
// 3. Lazy mount — only mount component when condition is true
// ---------------------------------------------------------------------------

export function useLazyMount(shouldMount: boolean): boolean {
  const [mounted, setMounted] = useState(shouldMount);

  useEffect(() => {
    if (shouldMount) setMounted(true);
  }, [shouldMount]);

  return mounted;
}

// ---------------------------------------------------------------------------
// 4. Intersection observer hook for viewport-based rendering
// ---------------------------------------------------------------------------

export function useInView(options?: IntersectionObserverInit): {
  ref: (node: Element | null) => void;
  inView: boolean;
} {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => setInView(entry.isIntersecting),
        options,
      );
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return { ref, inView };
}

// ---------------------------------------------------------------------------
// 5. Debounced value hook
// ---------------------------------------------------------------------------

export function useDebouncedValue<T>(value: T, delay: number = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ---------------------------------------------------------------------------
// 6. RAF-based throttle
// ---------------------------------------------------------------------------

export function useRafThrottle<T extends (...args: unknown[]) => void>(
  fn: T,
): T {
  const frameRef = useRef<number>(0);
  const lastArgs = useRef<unknown[]>([]);

  return useCallback(
    ((...args: unknown[]) => {
      lastArgs.current = args;
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        fn(...lastArgs.current);
        frameRef.current = 0;
      });
    }) as T,
    [fn],
  );
}

// ---------------------------------------------------------------------------
// 7. Memory cleanup registry
// ---------------------------------------------------------------------------

const cleanupCallbacks: Array<() => void> = [];

export function registerCleanup(fn: () => void) {
  cleanupCallbacks.push(fn);
}

export function runCleanup() {
  cleanupCallbacks.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
  cleanupCallbacks.length = 0;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", runCleanup);
}

// ---------------------------------------------------------------------------
// 8. Window pooling for virtualized rendering
// ---------------------------------------------------------------------------

export function isWindowInViewport(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return !(
    x + width < 0 ||
    y + height < 0 ||
    x > window.innerWidth ||
    y > window.innerHeight
  );
}

export function useWindowVisibility(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const [visible, setVisible] = useState(() =>
    isWindowInViewport(x, y, width, height),
  );

  useEffect(() => {
    const check = () => {
      setVisible(isWindowInViewport(x, y, width, height));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [x, y, width, height]);

  return visible;
}

// ---------------------------------------------------------------------------
// 9. Performance monitor (dev only)
// ---------------------------------------------------------------------------

export function measureRender(componentName: string): void {
  if (process.env.NODE_ENV !== "development") return;
  const mark = `${componentName}-render`;
  performance.mark(mark);
  performance.mark(`${mark}-end`);
}

export function logSlowRender(
  componentName: string,
  thresholdMs: number = 16,
): void {
  if (process.env.NODE_ENV !== "development") return;
  const mark = `${componentName}-render`;
  const endMark = `${mark}-end`;
  try {
    performance.measure(`${componentName}-duration`, mark, endMark);
    const measure = performance.getEntriesByName(
      `${componentName}-duration`,
    )[0];
    if (measure && measure.duration > thresholdMs) {
      console.warn(
        `[Perf] ${componentName} took ${measure.duration.toFixed(1)}ms (threshold: ${thresholdMs}ms)`,
      );
    }
  } catch {}
}
