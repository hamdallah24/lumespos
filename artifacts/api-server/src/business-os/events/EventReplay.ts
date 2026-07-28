import { eventBus } from "../../event-bus/EventBus";
import { ExecutiveEventRegistry } from "./ExecutiveEventRegistry";
import { EventRouter } from "./EventRouter";
import { createEnvelope } from "./EventEnvelope";
import { feedEvent } from "./EventMemory";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";

interface ReplayOptions {
  eventType?: string;
  fromSequence?: number;
  toSequence?: number;
  limit?: number;
  branchId?: number;
  autoTrigger?: boolean;
  batchSize?: number;
}

const DEFAULT_OPTIONS: ReplayOptions = {
  limit: 1000,
  autoTrigger: false,
  batchSize: 10,
};

export async function replayEvents(rawOptions?: ReplayOptions): Promise<{
  replayed: number;
  triggered: number;
  errors: string[];
}> {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const errors: string[] = [];
  let replayed = 0;
  let triggered = 0;

  let events = await eventBus.getEventStore().replay(options.fromSequence ?? 0, options.limit ?? 1000);

  if (options.eventType) {
    events = events.filter(e => e.type === options.eventType);
  }

  if (options.branchId) {
    events = events.filter(e => {
      const data = e.data as Record<string, unknown>;
      return Number(data.branchId) === options.branchId;
    });
  }

  if (options.toSequence) {
    events = events.filter(e => {
      const seqMatch = e.id.match(/(\d+)$/);
      if (!seqMatch) return true;
      return Number(seqMatch[1]) <= options.toSequence!;
    });
  }

  for (let i = 0; i < events.length; i += options.batchSize!) {
    const batch = events.slice(i, i + options.batchSize!);
    const batchPromises = batch.map(async (baseEvent) => {
      try {
        const schema = ExecutiveEventRegistry.get(baseEvent.type);
        if (!schema) return;

        const data = baseEvent.data as Record<string, unknown>;
        const branchId = Number(data.branchId) || 0;

        const envelope = createEnvelope(
          baseEvent.type,
          schema.priority,
          data,
          `replay:eventbus`,
          branchId,
          baseEvent.aggregateId,
          baseEvent.aggregateType,
          (data.userId as number) || undefined,
        );
        envelope.originalEventId = baseEvent.id;

        feedEvent(envelope);
        replayed++;

        if (options.autoTrigger) {
          const targets = EventRouter.getTargets(envelope);
          for (const executive of targets) {
            try {
              await getRuntimeGateway().assemble({
                message: `[Replay:${envelope.type}] ${JSON.stringify(envelope.data).slice(0, 500)}`,
                userId: envelope.userId || 0,
                branchId: envelope.branchId,
                target: executive,
              });
              triggered++;
            } catch (err: any) {
              errors.push(`Trigger ${executive} failed for ${envelope.id}: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        errors.push(`Replay failed for ${baseEvent.id}: ${err.message}`);
      }
    });

    await Promise.allSettled(batchPromises);

    if (i + options.batchSize! < events.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[EventReplay] Complete: ${replayed} replayed, ${triggered} auto-triggered, ${errors.length} errors`);
  return { replayed, triggered, errors };
}

export async function rebuildKnowledge(options?: { eventType?: string; limit?: number }): Promise<number> {
  const op = { ...DEFAULT_OPTIONS, ...options, autoTrigger: false };
  const result = await replayEvents(op);
  console.log(`[EventReplay] Knowledge rebuilt from ${result.replayed} events`);
  return result.replayed;
}
