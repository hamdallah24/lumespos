/**
 * Lumé OS Native Application Runtime
 * T13X Phase 1
 *
 * Every application goes through a lifecycle.
 * No application renders React directly — the runtime manages it.
 */

import type { AppManifest } from "./app-manifest";
import { getManifest } from "./app-manifest";
import { desktopEventBus, emit } from "./event-bus";

/* ─── Application Lifecycle ─── */

export type AppLifecycle =
  | "created"
  | "initializing"
  | "loading"
  | "syncing"
  | "ready"
  | "active"
  | "background"
  | "sleeping"
  | "restoring"
  | "updating"
  | "crashed"
  | "destroyed";

export interface AppInstance {
  id: string;                    // unique instance ID (e.g., "pos-1")
  manifestId: string;            // app manifest ID
  lifecycle: AppLifecycle;
  windowId: string | null;       // associated window ID
  workspaceId: string;
  createdAt: number;
  lastActiveAt: number;
  sessionData: Record<string, unknown>;  // per-instance session
  permissions: string[];         // resolved permissions
  error: string | null;          // crash error message
  retryCount: number;
}

/* ─── Runtime Contract ─── */

export interface AppRuntimeModule {
  initialize(instance: AppInstance): Promise<void>;
  mount(instance: AppInstance): Promise<void>;
  activate(instance: AppInstance): Promise<void>;
  background(instance: AppInstance): Promise<void>;
  sleep(instance: AppInstance): Promise<void>;
  restore(instance: AppInstance): Promise<void>;
  destroy(instance: AppInstance): Promise<void>;
  receiveNotification?(instance: AppInstance, notification: unknown): Promise<void>;
  receiveMission?(instance: AppInstance, mission: unknown): Promise<void>;
  receiveAIContext?(instance: AppInstance, context: unknown): Promise<void>;
  getData?(instance: AppInstance): Record<string, unknown>;
}

/* ─── Lifecycle Transitions ─── */

const VALID_TRANSITIONS: Record<AppLifecycle, AppLifecycle[]> = {
  created: ["initializing", "destroyed"],
  initializing: ["loading", "crashed", "destroyed"],
  loading: ["syncing", "ready", "crashed", "destroyed"],
  syncing: ["ready", "crashed", "destroyed"],
  ready: ["active", "background", "sleeping", "destroyed"],
  active: ["background", "sleeping", "destroyed"],
  background: ["active", "sleeping", "restoring", "destroyed"],
  sleeping: ["restoring", "background", "destroyed"],
  restoring: ["active", "background", "crashed", "destroyed"],
  updating: ["active", "background", "crashed", "destroyed"],
  crashed: ["restoring", "destroyed"],
  destroyed: [],
};

function canTransition(from: AppLifecycle, to: AppLifecycle): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ─── Application Runtime Manager ─── */

class ApplicationRuntimeManager {
  private instances = new Map<string, AppInstance>();
  private modules = new Map<string, AppRuntimeModule>();
  private lifecycleHooks = new Map<string, Array<(instance: AppInstance, from: AppLifecycle, to: AppLifecycle) => void>>();
  private nextInstanceId = 1;
  private _listeners: Array<() => void> = [];

  // Subscribe to changes
  subscribe(listener: () => void) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this._listeners.forEach((l) => l());
  }

  // Register a runtime module for an app
  registerModule(manifestId: string, module: AppRuntimeModule) {
    this.modules.set(manifestId, module);
  }

  // Add lifecycle hook
  onLifecycleChange(manifestId: string, hook: (instance: AppInstance, from: AppLifecycle, to: AppLifecycle) => void) {
    if (!this.lifecycleHooks.has(manifestId)) {
      this.lifecycleHooks.set(manifestId, []);
    }
    this.lifecycleHooks.get(manifestId)!.push(hook);
  }

  // Create a new app instance
  createInstance(manifestId: string, workspaceId: string, permissions: string[]): AppInstance {
    const instance: AppInstance = {
      id: `${manifestId}-${this.nextInstanceId++}`,
      manifestId,
      lifecycle: "created",
      windowId: null,
      workspaceId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      sessionData: {},
      permissions,
      error: null,
      retryCount: 0,
    };
    this.instances.set(instance.id, instance);
    this.notify();
    return instance;
  }

  // Transition lifecycle
  async transition(instanceId: string, to: AppLifecycle): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    if (!canTransition(instance.lifecycle, to)) {
      console.warn(`[AppRuntime] Invalid transition: ${instance.lifecycle} → ${to} for ${instanceId}`);
      return false;
    }

    const from = instance.lifecycle;
    const module = this.modules.get(instance.manifestId);

    // Execute lifecycle hooks
    try {
      switch (to) {
        case "initializing":
          instance.lifecycle = "initializing";
          this.notify();
          emit.applicationInstalled(instance.manifestId);
          break;

        case "loading":
          instance.lifecycle = "loading";
          this.notify();
          break;

        case "syncing":
          instance.lifecycle = "syncing";
          this.notify();
          break;

        case "ready":
          instance.lifecycle = "ready";
          this.notify();
          break;

        case "active":
          instance.lifecycle = "active";
          instance.lastActiveAt = Date.now();
          this.notify();
          emit.windowFocused(instance.windowId || instanceId);
          break;

        case "background":
          instance.lifecycle = "background";
          this.notify();
          if (module?.background) await module.background(instance);
          break;

        case "sleeping":
          instance.lifecycle = "sleeping";
          this.notify();
          if (module?.sleep) await module.sleep(instance);
          break;

        case "restoring":
          instance.lifecycle = "restoring";
          this.notify();
          if (module?.restore) await module.restore(instance);
          break;

        case "destroyed":
          instance.lifecycle = "destroyed";
          this.instances.delete(instanceId);
          this.notify();
          emit.windowClosed(instanceId, instance.manifestId);
          break;
      }
    } catch (err) {
      instance.lifecycle = "crashed";
      instance.error = err instanceof Error ? err.message : String(err);
      this.notify();
      console.error(`[AppRuntime] Lifecycle error in ${instanceId}:`, err);
    }

    // Fire lifecycle hooks
    const hooks = this.lifecycleHooks.get(instance.manifestId) || [];
    hooks.forEach((hook) => {
      try { hook(instance, from, to); } catch {}
    });

    this.notify();
    return true;
  }

  // Get instance
  getInstance(instanceId: string): AppInstance | undefined {
    return this.instances.get(instanceId);
  }

  // Get all instances
  getAllInstances(): AppInstance[] {
    return Array.from(this.instances.values());
  }

  // Get instances by app
  getInstancesByApp(manifestId: string): AppInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.manifestId === manifestId);
  }

  // Get active instances
  getActiveInstances(): AppInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.lifecycle === "active");
  }

  // Get instance count
  getInstanceCount(): number {
    return this.instances.size;
  }

  // Set session data
  setSessionData(instanceId: string, key: string, value: unknown) {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.sessionData[key] = value;
      this.notify();
    }
  }

  // Get session data
  getSessionData<T = unknown>(instanceId: string, key: string): T | undefined {
    const instance = this.instances.get(instanceId);
    return instance?.sessionData[key] as T | undefined;
  }

  // Retry crashed instance
  async retryInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.lifecycle !== "crashed") return false;
    if (instance.retryCount >= 3) return false;
    instance.retryCount++;
    instance.error = null;
    return this.transition(instanceId, "restoring");
  }

  // Snapshot for session persistence
  snapshot(): AppInstance[] {
    return Array.from(this.instances.values());
  }

  // Restore from snapshot
  restore(instances: AppInstance[]) {
    this.instances.clear();
    instances.forEach((i) => this.instances.set(i.id, i));
    this.notify();
  }
}

export const appRuntime = new ApplicationRuntimeManager();

/* ─── React Hook ─── */

import { useCallback, useEffect, useReducer, useRef } from "react";

export function useAppRuntime() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const managerRef = useRef(appRuntime);

  useEffect(() => {
    return managerRef.current.subscribe(forceUpdate);
  }, []);

  const launchApp = useCallback(async (manifestId: string, workspaceId: string, permissions: string[]) => {
    const manifest = getManifest(manifestId);
    if (!manifest) throw new Error(`App not found: ${manifestId}`);

    const instance = managerRef.current.createInstance(manifestId, workspaceId, permissions);
    await managerRef.current.transition(instance.id, "initializing");
    await managerRef.current.transition(instance.id, "loading");
    
    // Load component if needed
    if (manifest.component) {
      try {
        await manifest.component();
      } catch (err) {
        console.error(`[AppRuntime] Failed to load ${manifestId}:`, err);
      }
    }
    
    await managerRef.current.transition(instance.id, "syncing");
    await managerRef.current.transition(instance.id, "ready");
    await managerRef.current.transition(instance.id, "active");
    
    return instance;
  }, []);

  const closeApp = useCallback(async (instanceId: string) => {
    await managerRef.current.transition(instanceId, "destroyed");
  }, []);

  const backgroundApp = useCallback(async (instanceId: string) => {
    await managerRef.current.transition(instanceId, "background");
  }, []);

  const restoreApp = useCallback(async (instanceId: string) => {
    await managerRef.current.transition(instanceId, "restoring");
  }, []);

  return {
    instances: managerRef.current.getAllInstances(),
    activeInstances: managerRef.current.getActiveInstances(),
    getInstance: managerRef.current.getInstance.bind(managerRef.current),
    launchApp,
    closeApp,
    backgroundApp,
    restoreApp,
    retryInstance: managerRef.current.retryInstance.bind(managerRef.current),
    setSessionData: managerRef.current.setSessionData.bind(managerRef.current),
    getSessionData: managerRef.current.getSessionData.bind(managerRef.current),
  };
}
