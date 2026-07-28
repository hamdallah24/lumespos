import type { Snapshot, ExecutiveWorkspaceState, KPIDefinition } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `snap-${Date.now()}-${counter}`;
}

export function generateSnapshot(state: ExecutiveWorkspaceState): Snapshot {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const pendingTasks = state.tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const pendingApprovals = state.approvals.filter(a => a.status === "pending").length;

  return {
    id: nextId(),
    executive: state.executive,
    date: dateStr,
    achievements: deriveAchievements(state),
    problems: deriveProblems(state),
    risks: deriveRisks(state),
    kpis: state.kpis.map(k => ({ name: k.name, value: k.currentValue, target: k.targetValue, unit: k.unit })),
    pendingTasks,
    pendingApprovals,
    tomorrowPriorities: derivePriorities(state),
    createdAt: now.toISOString(),
  };
}

function deriveAchievements(state: ExecutiveWorkspaceState): string[] {
  const achievements: string[] = [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayExecutions = state.executions.filter(e => new Date(e.timestamp).getTime() >= todayStart.getTime() && e.success);
  if (todayExecutions.length > 0) achievements.push(`${todayExecutions.length} executions completed successfully`);

  const completedTasks = state.tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() >= todayStart.getTime());
  if (completedTasks.length > 0) achievements.push(`${completedTasks.length} tasks completed`);

  const acceptedRecs = state.recommendations.filter(r => r.status === "accepted");
  if (acceptedRecs.length > 0) achievements.push(`${acceptedRecs.length} recommendations accepted`);

  const activeObjectives = state.objectives.filter(o => o.status === "active");
  const completedObjectives = state.objectives.filter(o => o.status === "completed");
  if (completedObjectives.length > 0) achievements.push(`${completedObjectives.length} objectives achieved`);
  if (activeObjectives.every(o => o.currentValue && o.targetValue && o.currentValue >= o.targetValue)) {
    achievements.push("All active objectives on track");
  }

  return achievements;
}

function deriveProblems(state: ExecutiveWorkspaceState): string[] {
  const problems: string[] = [];
  const failedExecutions = state.executions.filter(e => !e.success);
  if (failedExecutions.length > 0) problems.push(`${failedExecutions.length} executions failed`);

  const criticalTasks = state.tasks.filter(t => t.priority === "critical" && t.status !== "completed");
  if (criticalTasks.length > 0) problems.push(`${criticalTasks.length} critical tasks pending`);

  const lowKpis = state.kpis.filter(k => k.currentValue < k.targetValue * 0.5);
  for (const k of lowKpis) problems.push(`KPI "${k.name}" jauh dari target (${k.currentValue}/${k.targetValue})`);

  return problems;
}

function deriveRisks(state: ExecutiveWorkspaceState): string[] {
  const risks: string[] = [];
  const highPriorityTasks = state.tasks.filter(t => (t.priority === "high" || t.priority === "critical") && t.status === "pending");
  if (highPriorityTasks.length > 3) risks.push(`${highPriorityTasks.length} high-priority tasks not started`);

  const kpisDeclining = state.kpis.filter(k => k.trend === "down");
  for (const k of kpisDeclining) risks.push(`KPI "${k.name}" menurun (${k.currentValue}/${k.targetValue})`);

  const noRecentExecutions = state.executions.length === 0 || (Date.now() - new Date(state.lastEventTimestamp).getTime() > 86400000);
  if (noRecentExecutions) risks.push("No recent activity — possible system issue");

  return risks;
}

function derivePriorities(state: ExecutiveWorkspaceState): string[] {
  const priorities: string[] = [];
  const criticalTasks = state.tasks.filter(t => t.priority === "critical" && t.status !== "completed").slice(0, 3);
  for (const t of criticalTasks) priorities.push(t.title);

  const highTasks = state.tasks.filter(t => t.priority === "high" && t.status === "pending").slice(0, 3);
  for (const t of highTasks) priorities.push(t.title);

  const dueReminders = state.reminders.filter(r => r.status === "pending" && new Date(r.dueAt).getTime() <= Date.now() + 86400000).slice(0, 2);
  for (const r of dueReminders) priorities.push(`Reminder: ${r.title}`);

  if (priorities.length === 0) priorities.push("Continue monitoring — no urgent items");
  return priorities;
}
