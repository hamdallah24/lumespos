import type { EventEnvelope } from "./EventEnvelope";
import { EventPriority, PRIORITY_ORDER } from "./EventPriority";
import { createEnvelope } from "./EventEnvelope";
import { ExecutiveEventRegistry } from "./ExecutiveEventRegistry";
import { EventRouter } from "./EventRouter";
import * as EventAggregator from "./EventAggregator";
import * as CooldownManager from "./CooldownManager";
import * as ExecutiveInbox from "./ExecutiveInbox";
import { feedEvent } from "./EventMemory";
import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";

interface BridgeConfig {
  autoTrigger: boolean;
  maxInboxProcessPerCycle: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  autoTrigger: true,
  maxInboxProcessPerCycle: 5,
};

let config: BridgeConfig = { ...DEFAULT_CONFIG };
let subscribed = false;
let processingCycle: ReturnType<typeof setInterval> | null = null;
const CYCLE_INTERVAL_MS = 15000;

function fromBaseEvent(base: BaseEvent): EventEnvelope | null {
  const schema = ExecutiveEventRegistry.get(base.type);
  if (!schema) return null;

  const validation = ExecutiveEventRegistry.validate(base.type, base.version, base.data);
  if (!validation.valid) {
    console.error(`[EventBridge] Validation failed: ${validation.error}`);
    return null;
  }

  const data = base.data as Record<string, unknown>;
  const branchId = Number(data.branchId) || 0;

  return createEnvelope(
    base.type,
    schema.priority,
    data,
    `eventbus:${base.aggregateType}`,
    branchId,
    base.aggregateId,
    base.aggregateType,
    (data.userId as number) || undefined,
  );
}

async function processEnvelope(envelope: EventEnvelope): Promise<void> {
  const targets = EventRouter.getTargets(envelope);

  if (targets.length === 0) return;

  feedEvent(envelope);

  if (!config.autoTrigger) return;

  for (const executive of targets) {
    if (CooldownManager.isOnCooldown(envelope.type, envelope.branchId)) {
      continue;
    }

    // Route CRITICAL and HIGH events immediately
    if (PRIORITY_ORDER[envelope.priority] >= PRIORITY_ORDER[EventPriority.HIGH]) {
      CooldownManager.startCooldown(envelope.type, envelope.branchId, envelope.priority);
      try {
        await getRuntimeGateway().assemble({
          message: `[Auto:${envelope.type}] ${JSON.stringify(envelope.data)}`,
          userId: envelope.userId || 0,
          branchId: envelope.branchId,
          target: executive,
          onState: (state) => console.log(`[EventBridge] ${executive}: ${state}`),
        });
      } catch (err: any) {
        console.error(`[EventBridge] Auto-trigger ${executive} failed: ${err.message}`);
      }
      continue;
    }

    // Queue lower-priority events to inbox
    ExecutiveInbox.push(executive, envelope);
  }
}

async function processInboxes(): Promise<void> {
  const executives = ExecutiveInbox.getInboxExecutives();
  for (const exec of executives) {
    const events = ExecutiveInbox.pop(exec, config.maxInboxProcessPerCycle);
    if (events.length === 0) continue;

    const summary = events.map(e => `[${e.priority}] ${e.type}: ${JSON.stringify(e.data).slice(0, 100)}`).join("\n");

    try {
      await getRuntimeGateway().assemble({
        message: `[Inbox:${exec}] ${events.length} events:\n${summary}`,
        userId: 0,
        branchId: events[0].branchId,
        target: exec,
        onState: (state) => console.log(`[EventBridge:Inbox] ${exec}: ${state}`),
      });
    } catch (err: any) {
      console.error(`[EventBridge:Inbox] Process ${exec} failed: ${err.message}`);
    }
  }
}

export const ExecutiveEventBridge = {
  initialize(): void {
    if (subscribed) return;

    // Set up EventAggregator flush handler
    EventAggregator.setFlushHandler(async (aggregated) => {
      await processEnvelope(aggregated);
    });

    // Subscribe to EventBus for all events
    eventBus.subscribe("*", async (baseEvent: BaseEvent) => {
      const envelope = fromBaseEvent(baseEvent);
      if (!envelope) return;

      if (CooldownManager.isOnCooldown(envelope.type, envelope.branchId)) return;

      EventAggregator.push(envelope);
    });

    // Periodic inbox processing
    processingCycle = setInterval(() => {
      processInboxes().catch((err) => {
        console.error(`[EventBridge] Inbox cycle error: ${err.message}`);
      });
    }, CYCLE_INTERVAL_MS);

    subscribed = true;
    console.log(`[EventBridge] Initialized — subscribed to EventBus, cycle=${CYCLE_INTERVAL_MS}ms`);
  },

  async submitDirect(type: string, data: Record<string, unknown>, branchId: number, userId?: number): Promise<void> {
    const schema = ExecutiveEventRegistry.get(type);
    if (!schema) {
      console.error(`[EventBridge] Unknown event type: ${type}`);
      return;
    }

    const validation = ExecutiveEventRegistry.validate(type, schema.version, data);
    if (!validation.valid) {
      console.error(`[EventBridge] Validation failed: ${validation.error}`);
      return;
    }

    const envelope = createEnvelope(type, schema.priority, data, "direct", branchId, `${type}:${Date.now()}`, schema.aggregateType, userId);
    await processEnvelope(envelope);
  },

  async submitEnvelope(envelope: EventEnvelope): Promise<void> {
    const validation = ExecutiveEventRegistry.validate(envelope.type, envelope.version, envelope.data);
    if (!validation.valid) {
      console.error(`[EventBridge] Envelope validation failed: ${validation.error}`);
      return;
    }
    await processEnvelope(envelope);
  },

  configure(newConfig: Partial<BridgeConfig>): void {
    config = { ...config, ...newConfig };
  },

  shutdown(): void {
    if (processingCycle) {
      clearInterval(processingCycle);
      processingCycle = null;
    }
    subscribed = false;
    console.log(`[EventBridge] Shutdown`);
  },

  isActive(): boolean {
    return subscribed;
  },
};
