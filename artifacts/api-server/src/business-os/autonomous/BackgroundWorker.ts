import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { eventBus } from "../../event-bus/EventBus";
import { RuntimeProfiler } from "../validation/RuntimeProfiler";
import type { BaseEvent } from "../../event-bus/types";

export interface WorkerConfig {
  executive: string;
  intervalMs: number;
  enabled: boolean;
  checkInbox: boolean;
  checkWorkspace: boolean;
  checkObjectives: boolean;
  reason: boolean;
  makeDecisions: boolean;
}

const DEFAULT_CONFIGS: WorkerConfig[] = [
  { executive: "CEO",  intervalMs: 5 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "COO",  intervalMs: 2 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "CFO",  intervalMs: 3 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "CMO",  intervalMs: 3 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "CHRO", intervalMs: 5 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "CTO",  intervalMs: 5 * 60 * 1000, enabled: true,  checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: true  },
  { executive: "CAIO", intervalMs: 10 * 60 * 1000, enabled: false, checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: false },
  { executive: "CKO",  intervalMs: 15 * 60 * 1000, enabled: false, checkInbox: true,  checkWorkspace: true,  checkObjectives: true,  reason: true,  makeDecisions: false },
];

export class BackgroundWorker {
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private configs: Map<string, WorkerConfig> = new Map();
  private running = false;
  public onDecision: ((executive: string, decision: { action: string; reasoning: string; confidence: number }) => void) | null = null;

  constructor() {
    for (const cfg of DEFAULT_CONFIGS) {
      this.configs.set(cfg.executive, { ...cfg });
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const [executive, cfg] of this.configs) {
      if (!cfg.enabled) continue;
      const timer = setInterval(() => this.executeCycle(executive), cfg.intervalMs);
      this.timers.set(executive, timer);
      console.log(`[BackgroundWorker] ${executive} started (interval: ${cfg.intervalMs}ms)`);
    }

    console.log(`[BackgroundWorker] ${this.timers.size} executives activated`);
  }

  stop(): void {
    for (const [exec, timer] of this.timers) {
      clearInterval(timer);
      console.log(`[BackgroundWorker] ${exec} stopped`);
    }
    this.timers.clear();
    this.running = false;
  }

  updateConfig(executive: string, updates: Partial<WorkerConfig>): void {
    const existing = this.configs.get(executive);
    if (!existing) return;
    const wasEnabled = existing.enabled;
    Object.assign(existing, updates);
    if (wasEnabled && !existing.enabled) {
      this.stopWorker(executive);
    } else if (!wasEnabled && existing.enabled) {
      this.startWorker(executive, existing);
    }
  }

  getConfig(executive: string): WorkerConfig | undefined {
    return this.configs.get(executive);
  }

  isRunning(): boolean { return this.running; }
  getActiveCount(): number { return this.timers.size; }

  private startWorker(executive: string, cfg: WorkerConfig): void {
    const timer = setInterval(() => this.executeCycle(executive), cfg.intervalMs);
    this.timers.set(executive, timer);
  }

  private stopWorker(executive: string): void {
    const timer = this.timers.get(executive);
    if (timer) { clearInterval(timer); this.timers.delete(executive); }
  }

  private executeCycle(executive: string): void {
    const cfg = this.configs.get(executive);
    if (!cfg) return;

    try {
      const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
      const decisions: { action: string; reasoning: string; confidence: number }[] = [];

      if (cfg.checkInbox) {
        const pendingTasks = ws.tasks.filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high"));
        if (pendingTasks.length > 0) {
          eventBus.publish({
            id: `worker-${executive}-${Date.now()}`,
            type: `autonomous.${executive.toLowerCase()}.inbox_check`,
            version: 1, timestamp: new Date(),
            aggregateId: executive, aggregateType: "executive",
            data: { executive, pendingCount: pendingTasks.length, tasks: pendingTasks.map((t: any) => ({ id: t.id, title: t.title })) },
          } as BaseEvent);
        }
      }

      if (cfg.checkObjectives) {
        const activeObjectives = ws.objectives.filter(o => o.status === "active");
        for (const obj of activeObjectives) {
          if (obj.targetValue && obj.currentValue !== undefined) {
            const progress = obj.currentValue / obj.targetValue;
            if (progress < 0.5) {
              decisions.push({
                action: "AccelerateObjective",
                reasoning: `Objective "${obj.title}" only at ${Math.round(progress * 100)}% of target (${obj.currentValue}/${obj.targetValue})`,
                confidence: 0.75 + (progress * 0.15),
              });
            }
          }
        }
      }

      if (cfg.reason && ws.decisions.length > 0) {
        const recentDecisions = ws.decisions.slice(-5);
        const failedDecisions = recentDecisions.filter(d => d.action === "failed" || d.confidence < 0.3);
        if (failedDecisions.length >= 2) {
          decisions.push({
            action: "EscalateIssues",
            reasoning: `${failedDecisions.length} recent decisions had low confidence or failed`,
            confidence: 0.85,
          });
        }
      }

      if (cfg.makeDecisions && decisions.length > 0 && this.onDecision) {
        for (const d of decisions) {
          this.onDecision(executive, d);
        }
      }

      const kpiStatus = this.evaluateKPIs(executive, ws);
      if (kpiStatus.length > 0 && this.onDecision) {
        for (const k of kpiStatus) this.onDecision(executive, k);
      }

    } catch (err) {
      console.error(`[BackgroundWorker] ${executive} error:`, err instanceof Error ? err.message : String(err));
    }
  }

  private evaluateKPIs(executive: string, ws: any): { action: string; reasoning: string; confidence: number }[] {
    const decisions: { action: string; reasoning: string; confidence: number }[] = [];
    for (const kpi of ws.kpis || []) {
      if (kpi.targetValue && kpi.currentValue < kpi.targetValue * 0.5) {
        decisions.push({
          action: `Improve${kpi.name.replace(/\s+/g, "")}`,
          reasoning: `KPI "${kpi.name}" at ${kpi.currentValue}/${kpi.targetValue} ${kpi.unit} — below 50% threshold`,
          confidence: 0.8,
        });
      }
    }
    return decisions;
  }
}


