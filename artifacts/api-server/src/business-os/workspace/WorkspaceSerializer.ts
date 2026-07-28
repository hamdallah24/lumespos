import type { ExecutiveWorkspaceState } from "./WorkspaceTypes";

export function serializeWorkspace(state: ExecutiveWorkspaceState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeWorkspace(json: string): ExecutiveWorkspaceState {
  return JSON.parse(json) as ExecutiveWorkspaceState;
}

export function serializeWorkspaceCompact(state: ExecutiveWorkspaceState): string {
  return JSON.stringify(state);
}

export function toMemoryContext(state: ExecutiveWorkspaceState, maxEntries: number = 20): string {
  const lines: string[] = [];
  lines.push(`## ${state.executive} Workspace Summary`);
  lines.push(`Last updated: ${state.updatedAt}`);
  lines.push("");

  const activeObjectives = state.objectives.filter(o => o.status === "active");
  if (activeObjectives.length > 0) {
    lines.push("### Active Objectives");
    for (const o of activeObjectives) {
      const progress = o.targetValue ? `${Math.round(((o.currentValue || 0) / o.targetValue) * 100)}%` : "-";
      lines.push(`- ${o.title} (${progress}) [${o.priority}]`);
    }
    lines.push("");
  }

  const pendingTasks = state.tasks.filter(t => t.status === "pending" || t.status === "in_progress").slice(0, maxEntries);
  if (pendingTasks.length > 0) {
    lines.push("### Pending Tasks");
    for (const t of pendingTasks) {
      lines.push(`- [${t.priority}] ${t.title}`);
    }
    lines.push("");
  }

  const pendingApprovals = state.approvals.filter(a => a.status === "pending");
  if (pendingApprovals.length > 0) {
    lines.push("### Pending Approvals");
    for (const a of pendingApprovals) {
      lines.push(`- ${a.action} (${a.level} approval) — ${a.reasoning.slice(0, 100)}`);
    }
    lines.push("");
  }

  const recentDecisions = state.decisions.slice(-5).reverse();
  if (recentDecisions.length > 0) {
    lines.push("### Recent Decisions");
    for (const d of recentDecisions) {
      lines.push(`- ${d.action} (confidence: ${Math.round(d.confidence * 100)}%)`);
    }
    lines.push("");
  }

  if (state.kpis.length > 0) {
    lines.push("### KPIs");
    for (const k of state.kpis) {
      const pct = k.targetValue > 0 ? `${Math.round((k.currentValue / k.targetValue) * 100)}%` : "-";
      lines.push(`- ${k.name}: ${k.currentValue}/${k.targetValue} ${k.unit} (${pct}) [${k.trend}]`);
    }
    lines.push("");
  }

  const metrics = state.metrics;
  lines.push("### Metrics");
  lines.push(`- Tasks Completed: ${metrics.tasksCompleted}`);
  lines.push(`- Avg Confidence: ${(metrics.averageConfidence * 100).toFixed(0)}%`);
  lines.push(`- Execution Success: ${metrics.executionSuccessRate}%`);
  lines.push(`- Objective Completion: ${metrics.objectiveCompletionRate}%`);

  return lines.join("\n");
}
