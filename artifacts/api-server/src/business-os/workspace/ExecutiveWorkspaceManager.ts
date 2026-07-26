import type {
  ExecutiveWorkspaceState, Objective, Task, Recommendation, ApprovalItem,
  Reminder, DecisionEntry, ExecutionEntry, DiscussionEntry, TimelineEntry,
  KPIDefinition, Snapshot, WorkspaceMetricsData,
} from "./WorkspaceTypes";
import { createObjective, DEFAULT_OBJECTIVES } from "./WorkspaceObjective";
import { createTask, generateTasksFromEvent } from "./WorkspaceTask";
import { createRecommendation } from "./WorkspaceRecommendation";
import { createApprovalItem } from "./WorkspaceApproval";
import { createReminder, DEFAULT_REMINDERS, getDueReminders } from "./WorkspaceReminder";
import { createDecisionEntry, createExecutionEntry, createDiscussionEntry } from "./WorkspaceHistory";
import { createTimelineEntry, formatTimeline } from "./WorkspaceTimeline";
import { createKPI, updateKPI, computeMetrics, DEFAULT_KPIS } from "./WorkspaceMetrics";
import { generateSnapshot } from "./WorkspaceSnapshot";
import { generateSummary, type SummaryPeriod, type WorkspaceSummaryResult } from "./WorkspaceSummary";
import { toMemoryContext } from "./WorkspaceSerializer";
import * as Repository from "./WorkspaceRepository";
import { memoryProvider } from "../../executive-runtime/memory-provider";
import { KnowledgeProvider } from "../../knowledge-platform/providers";

const ALL_EXECUTIVES = ["COO", "CFO", "CMO", "CHRO", "CEO", "CAIO", "CKO", "CTO"];

function createFreshWorkspace(executive: string): ExecutiveWorkspaceState {
  const now = new Date().toISOString();
  return {
    executive,
    objectives: DEFAULT_OBJECTIVES[executive] || [],
    tasks: [],
    recommendations: [],
    approvals: [],
    reminders: DEFAULT_REMINDERS[executive] || [],
    decisions: [],
    executions: [],
    discussions: [],
    timeline: [],
    kpis: DEFAULT_KPIS[executive] || [],
    snapshots: [],
    metrics: {
      tasksCompleted: 0, recommendationsAccepted: 0, recommendationsRejected: 0,
      averageConfidence: 0, executionSuccessRate: 0, approvalDelayMs: 0,
      averageDecisionTimeMs: 0, averageExecutionTimeMs: 0, eventCount: 0,
      objectiveCompletionRate: 0, updatedAt: now,
    },
    lastEventTimestamp: now,
    lastChatTimestamp: now,
    createdAt: now,
    updatedAt: now,
  };
}

export const ExecutiveWorkspaceManager = {
  initialize(): void {
    for (const exec of ALL_EXECUTIVES) {
      if (!Repository.exists(exec)) {
        const ws = createFreshWorkspace(exec);
        Repository.save(ws);
      }
    }
  },

  getWorkspace(executive: string): ExecutiveWorkspaceState {
    let ws = Repository.get(executive);
    if (!ws) {
      ws = createFreshWorkspace(executive);
      Repository.save(ws);
    }
    return ws;
  },

  getAllWorkspaces(): ExecutiveWorkspaceState[] {
    return Repository.getAll();
  },

  getExecutives(): string[] {
    return Repository.getExecutives();
  },

  // === OBJECTIVES ===
  addObjective(executive: string, title: string, description: string, priority: Objective["priority"] = "normal", targetValue?: number, unit?: string): Objective {
    const ws = this.getWorkspace(executive);
    const obj = createObjective(executive, title, description, priority, targetValue, unit);
    ws.objectives.push(obj);
    ws.timeline.push(createTimelineEntry(executive, "objective", `New objective: ${title}`, description, obj.id));
    Repository.save(ws);
    return obj;
  },

  completeObjective(executive: string, objectiveId: string): Objective | null {
    const ws = this.getWorkspace(executive);
    const idx = ws.objectives.findIndex(o => o.id === objectiveId);
    if (idx === -1) return null;
    ws.objectives[idx] = { ...ws.objectives[idx], status: "completed", completedAt: new Date().toISOString() };
    ws.timeline.push(createTimelineEntry(executive, "objective", `Objective completed: ${ws.objectives[idx].title}`, "", objectiveId));
    Repository.save(ws);
    return ws.objectives[idx];
  },

  // === TASKS ===
  addTask(executive: string, title: string, description: string, priority: Task["priority"] = "normal", relatedEventId?: string, relatedObjectiveId?: string, autoCreated: boolean = false): Task {
    const ws = this.getWorkspace(executive);
    const task = createTask(executive, title, description, priority, relatedEventId, relatedObjectiveId, autoCreated);
    ws.tasks.push(task);
    ws.timeline.push(createTimelineEntry(executive, "task", `New task: ${title}`, description, task.id));
    Repository.save(ws);
    return task;
  },

  completeTask(executive: string, taskId: string): Task | null {
    const ws = this.getWorkspace(executive);
    const idx = ws.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    ws.tasks[idx] = { ...ws.tasks[idx], status: "completed", completedAt: new Date().toISOString() };
    ws.metrics.tasksCompleted++;
    ws.timeline.push(createTimelineEntry(executive, "task", `Task completed: ${ws.tasks[idx].title}`, "", taskId));
    Repository.save(ws);
    return ws.tasks[idx];
  },

  generateTasksFromEvent(eventType: string, data: Record<string, unknown>, branchId: number): Task[] {
    const generated = generateTasksFromEvent(eventType, data, branchId);
    const tasks: Task[] = [];
    for (const t of generated) {
      const task = this.addTask(t.executive, t.title, t.description, t.priority, eventType, undefined, true);
      tasks.push(task);
    }
    return tasks;
  },

  // === RECOMMENDATIONS ===
  addRecommendation(executive: string, title: string, description: string, confidence: number, relatedDecisionId?: string): Recommendation {
    const ws = this.getWorkspace(executive);
    const rec = createRecommendation(executive, title, description, confidence, relatedDecisionId);
    ws.recommendations.push(rec);
    Repository.save(ws);
    return rec;
  },

  acceptRecommendation(executive: string, recId: string): Recommendation | null {
    const ws = this.getWorkspace(executive);
    const idx = ws.recommendations.findIndex(r => r.id === recId);
    if (idx === -1) return null;
    ws.recommendations[idx] = { ...ws.recommendations[idx], status: "accepted", resolvedAt: new Date().toISOString() };
    ws.metrics.recommendationsAccepted++;
    Repository.save(ws);
    return ws.recommendations[idx];
  },

  // === APPROVALS ===
  addApproval(executive: string, action: string, parameters: Record<string, unknown>, reasoning: string, confidence: number, level: string = "ceo"): ApprovalItem {
    const ws = this.getWorkspace(executive);
    const item = createApprovalItem(executive, action, parameters, reasoning, confidence, level);
    ws.approvals.push(item);
    ws.timeline.push(createTimelineEntry(executive, "approval", `Approval needed: ${action}`, reasoning.slice(0, 100), item.id));
    Repository.save(ws);
    return item;
  },

  resolveApproval(executive: string, approvalId: string, status: "approved" | "rejected", by: string): ApprovalItem | null {
    const ws = this.getWorkspace(executive);
    const idx = ws.approvals.findIndex(a => a.id === approvalId);
    if (idx === -1) return null;
    ws.approvals[idx] = { ...ws.approvals[idx], status, resolvedAt: new Date().toISOString(), resolvedBy: by };
    ws.timeline.push(createTimelineEntry(executive, "approval", `Approval ${status}: ${ws.approvals[idx].action}`, `by ${by}`, approvalId));
    Repository.save(ws);
    return ws.approvals[idx];
  },

  // === REMINDERS ===
  addReminder(executive: string, title: string, dueAt: string, description?: string, repeat: Reminder["repeat"] = "none"): Reminder {
    const ws = this.getWorkspace(executive);
    const rem = createReminder(executive, title, dueAt, description, repeat);
    ws.reminders.push(rem);
    Repository.save(ws);
    return rem;
  },

  checkReminders(): Reminder[] {
    const triggered: Reminder[] = [];
    for (const exec of this.getExecutives()) {
      const ws = this.getWorkspace(exec);
      const due = getDueReminders(ws.reminders);
      for (const rem of due) {
        const idx = ws.reminders.findIndex(r => r.id === rem.id);
        if (idx === -1) continue;
        ws.reminders[idx] = { ...ws.reminders[idx], status: "triggered", lastTriggeredAt: new Date().toISOString() };
        ws.timeline.push(createTimelineEntry(exec, "reminder", `Reminder: ${rem.title}`, rem.description || "", rem.id));
        triggered.push(ws.reminders[idx]);

        if (rem.repeat !== "none") {
          const nextDue = calculateNextDue(rem.dueAt, rem.repeat);
          ws.reminders.push(createReminder(exec, rem.title, nextDue, rem.description, rem.repeat, rem.relatedObjectiveId, rem.relatedTaskId));
        }
      }
      Repository.save(ws);
    }
    return triggered;
  },

  // === DECISIONS ===
  recordDecision(executive: string, decisionId: string, action: string, reasoning: string, confidence: number, parameters: Record<string, unknown>, source: DecisionEntry["source"] = "chat"): void {
    const ws = this.getWorkspace(executive);
    const entry = createDecisionEntry(executive, decisionId, action, reasoning, confidence, parameters, source);
    ws.decisions.push(entry);
    ws.timeline.push(createTimelineEntry(executive, "decision", `Decision: ${action}`, reasoning.slice(0, 100), decisionId, { confidence }));
    ws.metrics = computeMetrics(ws);
    Repository.save(ws);
  },

  // === EXECUTIONS ===
  recordExecution(executive: string, executionId: string, decisionId: string, action: string, module: string, success: boolean, message: string, durationMs: number): void {
    const ws = this.getWorkspace(executive);
    const entry = createExecutionEntry(executionId, decisionId, executive, action, module, success, message, durationMs);
    ws.executions.push(entry);
    ws.timeline.push(createTimelineEntry(executive, "execution", `Execution: ${action}`, message, executionId, { success, durationMs }));
    ws.metrics = computeMetrics(ws);
    Repository.save(ws);
  },

  // === DISCUSSIONS ===
  recordDiscussion(executive: string, message: string, response: string, source: DiscussionEntry["source"] = "chat"): void {
    const ws = this.getWorkspace(executive);
    const entry = createDiscussionEntry(executive, message, response, source);
    ws.discussions.push(entry);
    ws.lastChatTimestamp = new Date().toISOString();
    Repository.save(ws);
  },

  // === EVENTS ===
  recordEvent(executive: string, eventType: string, data: Record<string, unknown>): void {
    const ws = this.getWorkspace(executive);
    ws.lastEventTimestamp = new Date().toISOString();
    ws.timeline.push(createTimelineEntry(executive, "event", `Event: ${eventType}`, JSON.stringify(data).slice(0, 100), undefined, { eventType, data }));
    Repository.save(ws);
  },

  // === KPIs ===
  updateKPI(executive: string, kpiName: string, newValue: number): KPIDefinition | null {
    const ws = this.getWorkspace(executive);
    const idx = ws.kpis.findIndex(k => k.name.toLowerCase() === kpiName.toLowerCase());
    if (idx === -1) return null;
    const updated = updateKPI(ws.kpis[idx], newValue);
    ws.kpis[idx] = updated;
    ws.metrics = computeMetrics(ws);
    Repository.save(ws);
    return updated;
  },

  // === SNAPSHOTS ===
  generateDailySnapshot(executive: string): Snapshot {
    const ws = this.getWorkspace(executive);
    const snapshot = generateSnapshot(ws);
    ws.snapshots.push(snapshot);
    ws.timeline.push(createTimelineEntry(executive, "summary", `Daily snapshot: ${snapshot.date}`, `${snapshot.achievements.length} achievements, ${snapshot.problems.length} problems`));
    Repository.save(ws);
    return snapshot;
  },

  generateAllDailySnapshots(): Snapshot[] {
    return this.getExecutives().map(exec => this.generateDailySnapshot(exec));
  },

  // === SUMMARIES ===
  generateSummary(executive: string, period: SummaryPeriod): WorkspaceSummaryResult {
    const ws = this.getWorkspace(executive);
    return generateSummary(ws, period);
  },

  // === TIMELINE ===
  getTimeline(executive: string, maxEntries: number = 50): string {
    const ws = this.getWorkspace(executive);
    return formatTimeline(ws.timeline, maxEntries);
  },

  // === METRICS ===
  getMetrics(executive: string): WorkspaceMetricsData {
    const ws = this.getWorkspace(executive);
    ws.metrics = computeMetrics(ws);
    return ws.metrics;
  },

  // === MEMORY INTEGRATION ===
  async feedToMemory(executive: string): Promise<void> {
    const ws = this.getWorkspace(executive);
    const ctx = toMemoryContext(ws);
    try {
      await memoryProvider.write({
        content: ctx,
        executive,
        category: "workspace",
        scope: "project",
        source: "workspace",
        tags: ["workspace", executive.toLowerCase(), "snapshot"],
        confidence: 0.9,
      });
    } catch { }
  },

  async feedAllToMemory(): Promise<void> {
    for (const exec of this.getExecutives()) {
      await this.feedToMemory(exec);
    }
  },

  feedToKnowledge(executive: string): void {
    const ws = this.getWorkspace(executive);
    const summary = toMemoryContext(ws).slice(0, 1000);
    KnowledgeProvider.ingestEpisode({
      eventType: "workspace_snapshot",
      eventId: `ws-${executive}-${Date.now()}`,
      context: summary,
      outcome: "neutral",
      domain: "operations",
      topic: `${executive.toLowerCase()}_workspace`,
      summary: `${executive} workspace state updated`,
      tags: ["workspace", executive.toLowerCase(), "snapshot"],
    });
  },

  // === STATE ===
  getFullState(executive: string): ExecutiveWorkspaceState {
    return this.getWorkspace(executive);
  },
};

function calculateNextDue(dueAt: string, repeat: string): string {
  const date = new Date(dueAt);
  switch (repeat) {
    case "daily": date.setDate(date.getDate() + 1); break;
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
  }
  return date.toISOString();
}
