// ECP-028: Knowledge Queue — bridge between Mission Engine and Knowledge Office
// Uses Redis list as backing store. Falls back to in-memory when Redis unavailable.
// Frozen. Mission Engine pushes events here. Knowledge Office processes them.

import type { MissionEvent, MissionCompletedEvent, MissionFailedEvent } from "./mission-event";
import type { KnowledgeArtifact } from "./knowledge-types";
import { redisService } from "../../../lib/redis";

type EventHandler = (event: MissionEvent) => void;

const QUEUE_NAME = "knowledge";
const IN_MEMORY_MAX = 100;

class KnowledgeQueue {
  private _inMemory: MissionEvent[] = [];
  private _handlers: EventHandler[] = [];
  private _processing = false;

  /** Mission Engine pushes events here */
  async push(event: MissionEvent): Promise<void> {
    // Push to Redis if available
    if (redisService.initialized) {
      await redisService.queue.push(QUEUE_NAME, event);
      return;
    }

    // Fallback to in-memory
    this._inMemory.push(event);
    if (this._inMemory.length > IN_MEMORY_MAX) this._inMemory.shift();
    this.flush();
  }

  /** Register handler — Knowledge Office subscribes */
  subscribe(handler: EventHandler): void {
    this._handlers.push(handler);

    // If Redis is available, start Redis queue consumer
    if (redisService.initialized) {
      redisService.queue.subscribe<MissionEvent>(QUEUE_NAME, async (item) => {
        for (const h of this._handlers) {
          try { h(item); } catch { /* Skip failed handler */ }
        }
      });
    }
  }

  /** Process all queued in-memory events */
  private flush(): void {
    if (this._processing) return;
    this._processing = true;

    while (this._inMemory.length > 0) {
      const event = this._inMemory.shift()!;
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* Skip failed handler */ }
      }
    }

    this._processing = false;
  }

  /** Process pending Redis events — called on boot */
  async processPending(): Promise<void> {
    if (!redisService.initialized) return;

    while (true) {
      const result = await redisService.queue.pop<MissionEvent>(QUEUE_NAME);
      if (!result) break;
      for (const handler of this._handlers) {
        try { handler(result.item); } catch { /* Skip */ }
      }
    }
  }

  /** Convert a completed mission event to knowledge artifacts */
  static toArtifacts(event: MissionCompletedEvent): KnowledgeArtifact[] {
    const artifacts: KnowledgeArtifact[] = [];

    for (const a of event.artifacts) {
      artifacts.push({
        id: a.id,
        type: a.type === "failure" ? "failure" : a.type === "kpi" ? "kpi" : "insight",
        source: `mission-${event.missionId}`,
        content: a.content,
        timestamp: a.timestamp,
        tags: a.tags,
        confidence: a.confidence,
        relatedTo: [event.missionId],
      });
    }

    for (const lesson of event.lessonsLearned) {
      artifacts.push({
        id: `lesson-${event.missionId}-${artifacts.length}`,
        type: "lesson",
        source: `mission-${event.missionId}`,
        content: lesson,
        timestamp: event.timestamp,
        tags: ["lesson", event.runtime],
        confidence: 85,
        relatedTo: [event.missionId],
      });
    }

    return artifacts;
  }

  /** Convert a failed mission event to knowledge artifacts */
  static toFailureArtifact(event: MissionFailedEvent): KnowledgeArtifact {
    return {
      id: `failure-${event.missionId}`,
      type: "failure",
      source: `mission-${event.missionId}`,
      content: event.failureAnalysis || event.reason,
      timestamp: event.timestamp,
      tags: ["failure", event.runtime],
      confidence: 90,
      relatedTo: [event.missionId],
    };
  }

  /** How many events are waiting */
  async pending(): Promise<number> {
    if (redisService.initialized) {
      return redisService.queue.length(QUEUE_NAME);
    }
    return this._inMemory.length;
  }
}

export const knowledgeQueue = new KnowledgeQueue();
export { KnowledgeQueue };
