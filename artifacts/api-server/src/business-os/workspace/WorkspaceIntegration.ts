import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";
import { ExecutiveWorkspaceManager } from "./ExecutiveWorkspaceManager";
import { ExecutiveEventRegistry } from "../events/ExecutiveEventRegistry";
import { EventRouter } from "../events/EventRouter";

const REMINDER_INTERVAL_MS = 60000;
const MEMORY_FEED_INTERVAL_MS = 300000;
const SNAPSHOT_INTERVAL_MS = 3600000;

let reminderTimer: ReturnType<typeof setInterval> | null = null;
let memoryTimer: ReturnType<typeof setInterval> | null = null;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
let subscribed = false;

const EXECUTION_EVENT_PREFIXES = [
  "stock.", "po.", "expense.", "production.", "product.",
  "price.", "recipe.", "ingredient.", "shift.", "purchase.",
];

function isExecutionEvent(type: string): boolean {
  return EXECUTION_EVENT_PREFIXES.some(p => type.startsWith(p));
}

function getExecutiveForEvent(eventType: string): string {
  const envelopeType = eventType;
  const targets = EventRouter.getTargets({ type: envelopeType, priority: "INFO" as any, branchId: 0 } as any);
  if (targets.length > 0) return targets[0];

  const domain = ExecutiveEventRegistry.get(eventType)?.aggregateType || "";
  const domainToExec: Record<string, string> = {
    inventory: "COO", purchase_order: "COO", supplier: "COO",
    shift: "COO", production: "COO", product: "COO",
    recipe: "COO", ingredient: "COO", branch: "COO",
    finance: "CFO", expense: "CFO",
    employee: "CHRO",
  };
  return domainToExec[domain] || "CEO";
}

function getActionForEvent(eventType: string): string {
  const parts = eventType.split(".");
  return parts.length >= 2 ? parts[1] : eventType;
}

export const WorkspaceIntegration = {
  initialize(): void {
    ExecutiveWorkspaceManager.initialize();

    if (subscribed) return;

    // Subscribe to ALL EventBus events
    eventBus.subscribe("*", async (baseEvent: BaseEvent) => {
      try {
        if (isExecutionEvent(baseEvent.type)) {
          const executive = getExecutiveForEvent(baseEvent.type);
          const data = baseEvent.data as Record<string, unknown>;
          const action = getActionForEvent(baseEvent.type);

          ExecutiveWorkspaceManager.recordEvent(executive, baseEvent.type, data);
          ExecutiveWorkspaceManager.generateTasksFromEvent(baseEvent.type, data, Number(data.branchId) || 0);
        }
      } catch (err) {
        console.error(`[WorkspaceIntegration] Event processing error: ${(err as Error).message}`);
      }
    });

    // Periodic reminder check
    reminderTimer = setInterval(() => {
      try {
        const triggered = ExecutiveWorkspaceManager.checkReminders();
        if (triggered.length > 0) {
          console.log(`[WorkspaceIntegration] ${triggered.length} reminders triggered`);
        }
      } catch { }
    }, REMINDER_INTERVAL_MS);

    // Periodic memory feed
    memoryTimer = setInterval(() => {
      try {
        ExecutiveWorkspaceManager.feedAllToMemory();
      } catch { }
    }, MEMORY_FEED_INTERVAL_MS);

    // Periodic daily snapshot (hourly check if new day)
    snapshotTimer = setInterval(() => {
      try {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() < 5) {
          ExecutiveWorkspaceManager.generateAllDailySnapshots();
          ExecutiveWorkspaceManager.feedAllToMemory();
        }
      } catch { }
    }, SNAPSHOT_INTERVAL_MS);

    subscribed = true;
    console.log(`[WorkspaceIntegration] Initialized — subscribed to EventBus, ${ExecutiveWorkspaceManager.getExecutives().length} executives`);
  },

  recordChat(executive: string, message: string, response: string): void {
    ExecutiveWorkspaceManager.recordDiscussion(executive, message, response, "chat");
  },

  recordDecision(executive: string, decisionId: string, action: string, reasoning: string, confidence: number, parameters: Record<string, unknown>): void {
    ExecutiveWorkspaceManager.recordDecision(executive, decisionId, action, reasoning, confidence, parameters);
  },

  recordExecution(executive: string, executionId: string, decisionId: string, action: string, module: string, success: boolean, message: string, durationMs: number): void {
    ExecutiveWorkspaceManager.recordExecution(executive, executionId, decisionId, action, module, success, message, durationMs);
  },

  handleEvent(eventType: string, data: Record<string, unknown>, branchId: number): void {
    const executive = getExecutiveForEvent(eventType);
    ExecutiveWorkspaceManager.recordEvent(executive, eventType, data);
    ExecutiveWorkspaceManager.generateTasksFromEvent(eventType, data, branchId);
  },

  shutdown(): void {
    if (reminderTimer) clearInterval(reminderTimer);
    if (memoryTimer) clearInterval(memoryTimer);
    if (snapshotTimer) clearInterval(snapshotTimer);
    subscribed = false;
  },

  isActive(): boolean {
    return subscribed;
  },
};
