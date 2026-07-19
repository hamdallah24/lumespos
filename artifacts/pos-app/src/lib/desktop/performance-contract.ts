/**
 * Lumé OS Performance Contract
 * T13X Phase 14
 *
 * Every application must meet these targets:
 * - Startup: <200ms
 * - Window Open: <150ms
 * - Background Resume: <100ms
 * - Memory: <100MB
 * - FPS: 60
 *
 * Violations trigger warnings.
 */

/* ─── Performance Targets ─── */

export const PERF_TARGETS = {
  startup: 200,            // ms — app initialization
  windowOpen: 150,         // ms — window mount time
  backgroundResume: 100,   // ms — resume from background
  memoryLimit: 100,        // MB — max memory per app
  fpsTarget: 60,           // target FPS
  fpsWarning: 30,          // warn below this FPS
  renderBudget: 16,        // ms — per-frame render budget
  maxRerenders: 10,        // max rerenders per second
  maxBundleSize: 200,      // KB — max initial bundle
} as const;

/* ─── Performance Metrics ─── */

export interface PerformanceMetrics {
  appId: string;
  startupTime: number | null;
  windowOpenTime: number | null;
  backgroundResumeTime: number | null;
  memoryUsage: number | null;
  currentFPS: number;
  averageFPS: number;
  rerenderCount: number;
  lastRenderTime: number;
  violations: PerformanceViolation[];
}

export interface PerformanceViolation {
  type: "startup" | "window-open" | "background-resume" | "memory" | "fps" | "rerender" | "render-time";
  actual: number;
  threshold: number;
  timestamp: number;
  severity: "warning" | "critical";
}

/* ─── Performance Monitor ─── */

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>();
  private _listeners: Array<() => void> = [];
  private _frameTimes: number[] = [];
  private _lastFrameTime = 0;
  private _rafId: number | null = null;
  private _running = false;

  subscribe(listener: () => void) {
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter((l) => l !== listener); };
  }

  private notify() {
    this._listeners.forEach((l) => l());
  }

  // Start FPS monitoring
  startFPSMonitoring() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();

    const measure = (now: number) => {
      if (!this._running) return;
      const delta = now - this._lastFrameTime;
      this._frameTimes.push(delta);
      if (this._frameTimes.length > 60) this._frameTimes.shift();
      this._lastFrameTime = now;
      this._rafId = requestAnimationFrame(measure);
    };
    this._rafId = requestAnimationFrame(measure);
  }

  stopFPSMonitoring() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // Get current FPS
  getCurrentFPS(): number {
    if (this._frameTimes.length < 2) return 60;
    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    return avg > 0 ? Math.round(1000 / avg) : 60;
  }

  // Get average FPS
  getAverageFPS(): number {
    return this.getCurrentFPS();
  }

  // Start timing an operation
  startTiming(appId: string, operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(appId, operation, duration);
      return duration;
    };
  }

  // Record a metric
  recordMetric(appId: string, operation: string, duration: number) {
    let metrics = this.metrics.get(appId);
    if (!metrics) {
      metrics = this.createDefaultMetrics(appId);
      this.metrics.set(appId, metrics);
    }

    // Check thresholds
    let target = 0;
    let type: PerformanceViolation["type"] = "startup";

    switch (operation) {
      case "startup":
        target = PERF_TARGETS.startup;
        type = "startup";
        metrics.startupTime = duration;
        break;
      case "window-open":
        target = PERF_TARGETS.windowOpen;
        type = "window-open";
        metrics.windowOpenTime = duration;
        break;
      case "background-resume":
        target = PERF_TARGETS.backgroundResume;
        type = "background-resume";
        metrics.backgroundResumeTime = duration;
        break;
      case "render":
        metrics.lastRenderTime = duration;
        metrics.rerenderCount++;
        if (duration > PERF_TARGETS.renderBudget) {
          type = "render-time";
          target = PERF_TARGETS.renderBudget;
        }
        break;
    }

    if (target > 0 && duration > target) {
      const severity = duration > target * 2 ? "critical" : "warning";
      metrics.violations.push({
        type,
        actual: Math.round(duration),
        threshold: target,
        timestamp: Date.now(),
        severity,
      });
      console.warn(
        `[Perf Contract] ${appId}: ${operation} took ${Math.round(duration)}ms (target: ${target}ms) [${severity}]`
      );
    }

    // Update FPS
    metrics.currentFPS = this.getCurrentFPS();
    metrics.averageFPS = this.getAverageFPS();

    this.notify();
  }

  // Check memory
  checkMemory(appId: string) {
    if (typeof performance === "undefined" || !(performance as any).memory) return;
    
    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    
    let metrics = this.metrics.get(appId);
    if (!metrics) {
      metrics = this.createDefaultMetrics(appId);
      this.metrics.set(appId, metrics);
    }

    metrics.memoryUsage = usedMB;

    if (usedMB > PERF_TARGETS.memoryLimit) {
      metrics.violations.push({
        type: "memory",
        actual: usedMB,
        threshold: PERF_TARGETS.memoryLimit,
        timestamp: Date.now(),
        severity: usedMB > PERF_TARGETS.memoryLimit * 1.5 ? "critical" : "warning",
      });
      console.warn(`[Perf Contract] ${appId}: Memory ${usedMB}MB exceeds ${PERF_TARGETS.memoryLimit}MB`);
    }

    this.notify();
  }

  // Reset rerender count (call every second)
  resetRerenderCount(appId: string) {
    const metrics = this.metrics.get(appId);
    if (metrics) {
      metrics.rerenderCount = 0;
    }
  }

  // Get metrics for an app
  getMetrics(appId: string): PerformanceMetrics | undefined {
    return this.metrics.get(appId);
  }

  // Get all metrics
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Check if app passes contract
  passesContract(appId: string): { passed: boolean; violations: PerformanceViolation[] } {
    const metrics = this.metrics.get(appId);
    if (!metrics) return { passed: true, violations: [] };
    const activeViolations = metrics.violations.filter(
      (v) => Date.now() - v.timestamp < 60000 // last minute
    );
    return {
      passed: activeViolations.length === 0,
      violations: activeViolations,
    };
  }

  // Get contract summary
  getContractSummary(): {
    totalApps: number;
    passing: number;
    failing: number;
    violations: PerformanceViolation[];
  } {
    const all = this.getAllMetrics();
    let passing = 0;
    let failing = 0;
    const allViolations: PerformanceViolation[] = [];

    all.forEach((m) => {
      const recent = m.violations.filter((v) => Date.now() - v.timestamp < 60000);
      if (recent.length === 0) passing++;
      else {
        failing++;
        allViolations.push(...recent);
      }
    });

    return { totalApps: all.length, passing, failing, violations: allViolations };
  }

  private createDefaultMetrics(appId: string): PerformanceMetrics {
    return {
      appId,
      startupTime: null,
      windowOpenTime: null,
      backgroundResumeTime: null,
      memoryUsage: null,
      currentFPS: 60,
      averageFPS: 60,
      rerenderCount: 0,
      lastRenderTime: 0,
      violations: [],
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/* ─── React Hook ─── */

import { useCallback, useEffect, useReducer, useRef } from "react";

export function usePerformanceContract(appId: string) {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const monitorRef = useRef(performanceMonitor);

  useEffect(() => {
    return monitorRef.current.subscribe(forceUpdate);
  }, []);

  // Start timing on mount
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const elapsed = performance.now() - startTimeRef.current;
    monitorRef.current.recordMetric(appId, "startup", elapsed);
  }, [appId]);

  // Check memory periodically
  useEffect(() => {
    const interval = setInterval(() => {
      monitorRef.current.checkMemory(appId);
    }, 10000);
    return () => clearInterval(interval);
  }, [appId]);

  const metrics = monitorRef.current.getMetrics(appId);
  const contract = monitorRef.current.passesContract(appId);

  return {
    metrics,
    passesContract: contract.passed,
    violations: contract.violations,
    startTiming: useCallback(
      (operation: string) => monitorRef.current.startTiming(appId, operation),
      [appId]
    ),
    recordRender: useCallback(
      (duration: number) => monitorRef.current.recordMetric(appId, "render", duration),
      [appId]
    ),
  };
}
