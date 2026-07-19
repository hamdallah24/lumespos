/**
 * Lumé OS AI Native Runtime
 * T13X Phase 7
 *
 * AI is not an application. AI is a Service.
 * Every app automatically gets: Mission, Executive, Awareness, RuntimeContext, Notification.
 * AI becomes part of the OS.
 */

import type { AIExecutive } from "./types";
import { useExecutiveStore } from "./executive-store";
import { desktopEventBus, emit } from "./event-bus";
import { useCallback, useEffect, useReducer, useRef } from "react";

/* ─── AI Runtime Types ─── */

export interface AIRuntimeState {
  // System status
  isInitialized: boolean;
  isOnline: boolean;
  
  // Executive assignments
  executiveAssignments: Record<string, string>;  // appId → executiveId
  
  // Active missions
  missions: AIMission[];
  
  // AI context per app
  appContexts: Record<string, AIAppContext>;
  
  // System health
  health: {
    overall: number;          // 0-100
    executives: number;       // average executive health
    services: number;         // service health
    uptime: number;           // ms since init
  };
  
  // Background awareness
  awareness: {
    lastScan: number;
    anomalies: AIAnomaly[];
    suggestions: AISuggestion[];
  };
}

export interface AIMission {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "failed" | "cancelled";
  assignedExecutive: string;   // executive ID
  assignedApp: string | null;  // app ID (null = system-wide)
  priority: "low" | "medium" | "high" | "critical";
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  progress: number;            // 0-100
  result: unknown;
  tools: string[];
}

export interface AIAppContext {
  appId: string;
  executiveId: string | null;
  awareness: string[];         // contextual insights
  lastSync: number;
  pendingNotifications: number;
  activeMissions: string[];    // mission IDs
}

export interface AIAnomaly {
  id: string;
  type: "performance" | "security" | "data" | "behavior";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  source: string;              // app or service ID
  timestamp: number;
  resolved: boolean;
}

export interface AISuggestion {
  id: string;
  type: "optimization" | "action" | "insight" | "warning";
  title: string;
  description: string;
  targetApp: string | null;
  confidence: number;          // 0-1
  timestamp: number;
  dismissed: boolean;
}

/* ─── AI Runtime Manager ─── */

class AIRuntimeManager {
  private state: AIRuntimeState = {
    isInitialized: false,
    isOnline: true,
    executiveAssignments: {},
    missions: [],
    appContexts: {},
    health: { overall: 100, executives: 100, services: 100, uptime: 0 },
    awareness: { lastScan: 0, anomalies: [], suggestions: [] },
  };

  private _listeners: Array<() => void> = [];
  private _startTime = Date.now();
  private _missionNextId = 1;
  private _anomalyNextId = 1;
  private _suggestionNextId = 1;

  subscribe(listener: () => void) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this._listeners.forEach((l) => l());
  }

  getState(): AIRuntimeState {
    this.state.health.uptime = Date.now() - this._startTime;
    return { ...this.state };
  }

  // Initialize the AI runtime
  initialize() {
    if (this.state.isInitialized) return;
    this.state.isInitialized = true;
    this.state.health.uptime = 0;
    
    // Assign default executives to apps
    this.state.executiveAssignments = {
      "pos": "coo",
      "finance": "cfo",
      "inventory": "coo",
      "crm": "cmo",
      "hr": "chro",
      "ai-chat": "caio",
      "marketplace": "cto",
      "settings": "cto",
    };
    
    this.notify();
    emit.shellReady();
  }

  // Register an app with AI
  registerApp(appId: string, executiveId?: string) {
    const execId = executiveId || this.state.executiveAssignments[appId] || "caio";
    this.state.executiveAssignments[appId] = execId;
    this.state.appContexts[appId] = {
      appId,
      executiveId: execId,
      awareness: [],
      lastSync: Date.now(),
      pendingNotifications: 0,
      activeMissions: [],
    };
    this.notify();
  }

  // Unregister app
  unregisterApp(appId: string) {
    delete this.state.executiveAssignments[appId];
    delete this.state.appContexts[appId];
    this.notify();
  }

  // Create a mission
  createMission(params: {
    title: string;
    description: string;
    assignedExecutive: string;
    assignedApp?: string;
    priority?: AIMission["priority"];
    tools?: string[];
  }): AIMission {
    const mission: AIMission = {
      id: `mission-${this._missionNextId++}`,
      title: params.title,
      description: params.description,
      status: "pending",
      assignedExecutive: params.assignedExecutive,
      assignedApp: params.assignedApp || null,
      priority: params.priority || "medium",
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      result: null,
      tools: params.tools || [],
    };
    this.state.missions.push(mission);
    this.notify();
    return mission;
  }

  // Update mission
  updateMission(missionId: string, updates: Partial<AIMission>) {
    const mission = this.state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    Object.assign(mission, updates);
    if (updates.status === "active" && !mission.startedAt) mission.startedAt = Date.now();
    if (updates.status === "completed" || updates.status === "failed") mission.completedAt = Date.now();
    this.notify();
  }

  // Get missions
  getMissions(appId?: string): AIMission[] {
    if (appId) return this.state.missions.filter((m) => m.assignedApp === appId);
    return [...this.state.missions];
  }

  // Get active missions for an app
  getActiveMissions(appId: string): AIMission[] {
    return this.state.missions.filter(
      (m) => m.assignedApp === appId && (m.status === "active" || m.status === "pending")
    );
  }

  // Add anomaly
  addAnomaly(params: Omit<AIAnomaly, "id" | "timestamp" | "resolved">): AIAnomaly {
    const anomaly: AIAnomaly = {
      ...params,
      id: `anomaly-${this._anomalyNextId++}`,
      timestamp: Date.now(),
      resolved: false,
    };
    this.state.awareness.anomalies.push(anomaly);
    this.notify();
    return anomaly;
  }

  // Add suggestion
  addSuggestion(params: Omit<AISuggestion, "id" | "timestamp" | "dismissed">): AISuggestion {
    const suggestion: AISuggestion = {
      ...params,
      id: `suggestion-${this._suggestionNextId++}`,
      timestamp: Date.now(),
      dismissed: false,
    };
    this.state.awareness.suggestions.push(suggestion);
    this.notify();
    return suggestion;
  }

  // Update app context
  updateAppContext(appId: string, updates: Partial<AIAppContext>) {
    const ctx = this.state.appContexts[appId];
    if (!ctx) return;
    Object.assign(ctx, updates);
    ctx.lastSync = Date.now();
    this.notify();
  }

  // Get app context
  getAppContext(appId: string): AIAppContext | undefined {
    return this.state.appContexts[appId];
  }

  // Dismiss suggestion
  dismissSuggestion(suggestionId: string) {
    const s = this.state.awareness.suggestions.find((sg) => sg.id === suggestionId);
    if (s) {
      s.dismissed = true;
      this.notify();
    }
  }

  // Resolve anomaly
  resolveAnomaly(anomalyId: string) {
    const a = this.state.awareness.anomalies.find((an) => an.id === anomalyId);
    if (a) {
      a.resolved = true;
      this.notify();
    }
  }

  // Get health
  getHealth() {
    this.state.health.uptime = Date.now() - this._startTime;
    return { ...this.state.health };
  }
}

export const aiRuntime = new AIRuntimeManager();

/* ─── React Hook ─── */

export function useAIRuntime() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const runtimeRef = useRef(aiRuntime);

  useEffect(() => {
    return runtimeRef.current.subscribe(forceUpdate);
  }, []);

  const state = runtimeRef.current.getState();

  const createMission = useCallback((params: Parameters<AIRuntimeManager["createMission"]>[0]) => {
    return runtimeRef.current.createMission(params);
  }, []);

  const updateMission = useCallback((missionId: string, updates: Partial<AIMission>) => {
    runtimeRef.current.updateMission(missionId, updates);
  }, []);

  const registerApp = useCallback((appId: string, executiveId?: string) => {
    runtimeRef.current.registerApp(appId, executiveId);
  }, []);

  const getMissions = useCallback((appId?: string) => {
    return runtimeRef.current.getMissions(appId);
  }, []);

  const getActiveMissions = useCallback((appId: string) => {
    return runtimeRef.current.getActiveMissions(appId);
  }, []);

  const getAppContext = useCallback((appId: string) => {
    return runtimeRef.current.getAppContext(appId);
  }, []);

  return {
    state,
    isInitialized: state.isInitialized,
    health: state.health,
    missions: state.missions,
    anomalies: state.awareness.anomalies,
    suggestions: state.awareness.suggestions,
    registerApp,
    createMission,
    updateMission,
    getMissions,
    getActiveMissions,
    getAppContext,
    updateAppContext: runtimeRef.current.updateAppContext.bind(runtimeRef.current),
    addAnomaly: runtimeRef.current.addAnomaly.bind(runtimeRef.current),
    addSuggestion: runtimeRef.current.addSuggestion.bind(runtimeRef.current),
    dismissSuggestion: runtimeRef.current.dismissSuggestion.bind(runtimeRef.current),
    resolveAnomaly: runtimeRef.current.resolveAnomaly.bind(runtimeRef.current),
  };
}
