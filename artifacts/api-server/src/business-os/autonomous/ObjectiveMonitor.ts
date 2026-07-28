import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";

interface ObjectiveAlert {
  executive: string;
  objectiveId: string;
  objectiveTitle: string;
  currentValue: number;
  targetValue: number;
  gapPct: number;
  severity: "warning" | "critical";
  suggestedAction: string;
}

export class ObjectiveMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private thresholds = {
    warning: 0.5,
    critical: 0.25,
    checkIntervalMs: 60000,
  };
  public onAlert: ((alert: ObjectiveAlert) => void) | null = null;

  start(): void {
    if (this.active) return;
    this.active = true;
    this.checkAllObjectives();
    this.timer = setInterval(() => this.checkAllObjectives(), this.thresholds.checkIntervalMs);
    console.log(`[ObjectiveMonitor] Started (check every ${this.thresholds.checkIntervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.active = false;
  }

  updateThresholds(warning: number, critical: number, checkIntervalMs?: number): void {
    this.thresholds.warning = warning;
    this.thresholds.critical = critical;
    if (checkIntervalMs) this.thresholds.checkIntervalMs = checkIntervalMs;
  }

  isActive(): boolean { return this.active; }

  private checkAllObjectives(): void {
    const executives = ExecutiveWorkspaceManager.getExecutives();

    for (const exec of executives) {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      for (const obj of ws.objectives) {
        if (obj.status !== "active") continue;
        if (obj.targetValue === undefined || obj.currentValue === undefined) continue;

        const progress = obj.targetValue > 0 ? obj.currentValue / obj.targetValue : 1;
        if (progress >= this.thresholds.warning) continue;

        const severity = progress < this.thresholds.critical ? "critical" : "warning";
        const gapPct = Math.round((1 - progress) * 100);

        const alert: ObjectiveAlert = {
          executive: exec,
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          currentValue: obj.currentValue,
          targetValue: obj.targetValue,
          gapPct,
          severity,
          suggestedAction: this.suggestAction(exec, obj),
        };

        ExecutiveWorkspaceManager.addTask(
          exec,
          `Objective Alert: ${obj.title} at ${Math.round(progress * 100)}%`,
          `Objective "${obj.title}" is ${gapPct}% below target. Current: ${obj.currentValue}, Target: ${obj.targetValue}${obj.unit ? ` ${obj.unit}` : ""}. Suggested: ${alert.suggestedAction}`,
          severity === "critical" ? "critical" : "high",
          undefined, obj.id, true,
        );

        eventBus.publish({
          id: `objmon-${obj.id}-${Date.now()}`,
          type: `objective.alert.${severity}`,
          version: 1, timestamp: new Date(),
          aggregateId: exec, aggregateType: "executive",
          data: { alert } as any,
        } as BaseEvent);

        if (this.onAlert) this.onAlert(alert);
      }
    }

    this.checkKPIs();
  }

  private checkKPIs(): void {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    for (const exec of executives) {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      for (const kpi of ws.kpis) {
        if (!kpi.targetValue || kpi.targetValue <= 0) continue;
        const ratio = kpi.currentValue / kpi.targetValue;
        if (ratio >= this.thresholds.warning) continue;

        const severity = ratio < this.thresholds.critical ? "critical" : "warning";

        ExecutiveWorkspaceManager.addTask(
          exec,
          `KPI Alert: ${kpi.name} at ${Math.round(ratio * 100)}%`,
          `KPI "${kpi.name}" is below threshold. Current: ${kpi.currentValue}${kpi.unit}, Target: ${kpi.targetValue}${kpi.unit}`,
          severity === "critical" ? "critical" : "high",
          undefined, undefined, true,
        );

        ExecutiveWorkspaceManager.addRecommendation(
          exec,
          `Improve ${kpi.name}`,
          `KPI "${kpi.name}" needs attention: ${kpi.currentValue}/${kpi.targetValue} ${kpi.unit} (${Math.round(ratio * 100)}%)`,
          0.75 + (ratio * 0.15),
        );
      }
    }
  }

  private suggestAction(executive: string, objective: any): string {
    const suggestions: Record<string, Record<string, string>> = {
      COO: { default: "Review inventory levels and optimize supply chain" },
      CFO: { default: "Review costs and optimize cash flow management" },
      CMO: { default: "Launch targeted campaign and review sales channels" },
      CHRO: { default: "Review workforce allocation and training programs" },
      CEO: { default: "Evaluate strategic direction and resource allocation" },
      CTO: { default: "Review technical debt and infrastructure priorities" },
      CAIO: { default: "Assess AI automation opportunities" },
      CKO: { default: "Review knowledge gaps and learning programs" },
    };
    return suggestions[executive]?.default ?? "Review and adjust strategy";
  }
}
