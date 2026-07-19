/**
 * Lumé OS Native Background Services
 * T13X Phase 6
 *
 * Services run as daemons — even when windows are closed.
 * Like systemd on Linux: always running, always monitoring.
 */

import { desktopEventBus } from "./event-bus";

/* ─── Service Types ─── */

export type ServiceStatus = "stopped" | "starting" | "running" | "error" | "stopping";

export interface BackgroundService {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  interval: number;              // run interval in ms (0 = event-driven only)
  lastRun: number;
  lastError: string | null;
  runCount: number;
  startedAt: number | null;
  config: Record<string, unknown>;
}

export interface ServiceTask {
  id: string;
  serviceId: string;
  type: string;
  payload: unknown;
  timestamp: number;
  status: "pending" | "processing" | "completed" | "failed";
}

/* ─── Service Manager ─── */

class BackgroundServiceManager {
  private services = new Map<string, BackgroundService>();
  private handlers = new Map<string, (task: ServiceTask) => Promise<unknown>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private taskQueue: ServiceTask[] = [];
  private _listeners: Array<() => void> = [];
  private _nextTaskId = 1;

  subscribe(listener: () => void) {
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter((l) => l !== listener); };
  }

  private notify() {
    this._listeners.forEach((l) => l());
  }

  // Register a service
  register(service: Omit<BackgroundService, "status" | "lastRun" | "lastError" | "runCount" | "startedAt">) {
    this.services.set(service.id, {
      ...service,
      status: "stopped",
      lastRun: 0,
      lastError: null,
      runCount: 0,
      startedAt: null,
    });
    this.notify();
  }

  // Register handler for a service
  registerHandler(serviceId: string, handler: (task: ServiceTask) => Promise<unknown>) {
    this.handlers.set(serviceId, handler);
  }

  // Start a service
  async start(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service || service.status === "running") return false;

    service.status = "starting";
    this.notify();

    try {
      service.status = "running";
      service.startedAt = Date.now();

      // Start interval if configured
      if (service.interval > 0) {
        const intervalId = setInterval(() => {
          this.runService(serviceId);
        }, service.interval);
        this.intervals.set(serviceId, intervalId);
      }

      this.notify();
      return true;
    } catch (err) {
      service.status = "error";
      service.lastError = err instanceof Error ? err.message : String(err);
      this.notify();
      return false;
    }
  }

  // Stop a service
  async stop(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service || service.status === "stopped") return false;

    service.status = "stopping";
    this.notify();

    const intervalId = this.intervals.get(serviceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(serviceId);
    }

    service.status = "stopped";
    service.startedAt = null;
    this.notify();
    return true;
  }

  // Run a service manually
  async runService(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service || service.status !== "running") return false;

    const handler = this.handlers.get(serviceId);
    if (!handler) return false;

    try {
      const task: ServiceTask = {
        id: `task-${this._nextTaskId++}`,
        serviceId,
        type: "scheduled",
        payload: {},
        timestamp: Date.now(),
        status: "processing",
      };
      this.taskQueue.push(task);

      await handler(task);

      task.status = "completed";
      service.lastRun = Date.now();
      service.runCount++;
      this.notify();
      return true;
    } catch (err) {
      service.lastError = err instanceof Error ? err.message : String(err);
      service.lastRun = Date.now();
      this.notify();
      return false;
    }
  }

  // Emit a task to a service
  async emitTask(serviceId: string, type: string, payload: unknown): Promise<ServiceTask | null> {
    const service = this.services.get(serviceId);
    if (!service || service.status !== "running") return null;

    const task: ServiceTask = {
      id: `task-${this._nextTaskId++}`,
      serviceId,
      type,
      payload,
      timestamp: Date.now(),
      status: "pending",
    };
    this.taskQueue.push(task);

    const handler = this.handlers.get(serviceId);
    if (handler) {
      task.status = "processing";
      try {
        await handler(task);
        task.status = "completed";
      } catch (err) {
        task.status = "failed";
      }
    }

    this.notify();
    return task;
  }

  // Get service
  getService(serviceId: string): BackgroundService | undefined {
    return this.services.get(serviceId);
  }

  // Get all services
  getAllServices(): BackgroundService[] {
    return Array.from(this.services.values());
  }

  // Get running services
  getRunningServices(): BackgroundService[] {
    return Array.from(this.services.values()).filter((s) => s.status === "running");
  }

  // Start all services
  async startAll(): Promise<void> {
    const services = Array.from(this.services.values());
    for (const s of services) {
      await this.start(s.id);
    }
  }

  // Stop all services
  async stopAll(): Promise<void> {
    for (const [id] of this.intervals) {
      clearInterval(this.intervals.get(id)!);
    }
    this.intervals.clear();
    for (const s of this.services.values()) {
      s.status = "stopped";
      s.startedAt = null;
    }
    this.notify();
  }

  // Get tasks
  getTasks(serviceId?: string): ServiceTask[] {
    if (serviceId) return this.taskQueue.filter((t) => t.serviceId === serviceId);
    return [...this.taskQueue];
  }
}

export const backgroundServices = new BackgroundServiceManager();

/* ─── Default Services ─── */

const DEFAULT_SERVICES: Omit<BackgroundService, "status" | "lastRun" | "lastError" | "runCount" | "startedAt">[] = [
  {
    id: "mission-service",
    name: "Mission Service",
    description: "Monitors and manages AI missions",
    interval: 5000,
    config: {},
  },
  {
    id: "notification-service",
    name: "Notification Service",
    description: "Processes and delivers notifications",
    interval: 2000,
    config: {},
  },
  {
    id: "heartbeat-service",
    name: "Heartbeat Service",
    description: "Monitors system health and responsiveness",
    interval: 10000,
    config: {},
  },
  {
    id: "executive-service",
    name: "Executive Service",
    description: "Manages AI executive states and communications",
    interval: 3000,
    config: {},
  },
  {
    id: "sync-service",
    name: "Sync Service",
    description: "Synchronizes data across services",
    interval: 15000,
    config: {},
  },
  {
    id: "finance-sync",
    name: "Finance Sync",
    description: "Synchronizes financial data",
    interval: 30000,
    config: {},
  },
  {
    id: "inventory-sync",
    name: "Inventory Sync",
    description: "Synchronizes inventory data",
    interval: 10000,
    config: {},
  },
  {
    id: "knowledge-sync",
    name: "Knowledge Sync",
    description: "Synchronizes knowledge base data",
    interval: 60000,
    config: {},
  },
  {
    id: "marketplace-sync",
    name: "Marketplace Sync",
    description: "Synchronizes marketplace data",
    interval: 60000,
    config: {},
  },
];

DEFAULT_SERVICES.forEach((s) => backgroundServices.register(s));

/* ─── React Hook ─── */

import { useCallback, useEffect, useReducer, useRef } from "react";

export function useBackgroundServices() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const managerRef = useRef(backgroundServices);

  useEffect(() => {
    return managerRef.current.subscribe(forceUpdate);
  }, []);

  const startAll = useCallback(() => managerRef.current.startAll(), []);
  const stopAll = useCallback(() => managerRef.current.stopAll(), []);
  const start = useCallback((id: string) => managerRef.current.start(id), []);
  const stop = useCallback((id: string) => managerRef.current.stop(id), []);

  return {
    services: managerRef.current.getAllServices(),
    runningServices: managerRef.current.getRunningServices(),
    start,
    stop,
    startAll,
    stopAll,
    runService: managerRef.current.runService.bind(managerRef.current),
    emitTask: managerRef.current.emitTask.bind(managerRef.current),
    getTasks: managerRef.current.getTasks.bind(managerRef.current),
  };
}
