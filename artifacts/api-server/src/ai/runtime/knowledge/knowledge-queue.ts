// ECP-028: Knowledge Queue — bridge between Mission Engine and Knowledge Office
// Frozen. Mission Engine pushes events here. Knowledge Office processes them.
// Asynchronous. Non-blocking. Mission Engine does NOT wait for processing.

import type { MissionEvent, MissionCompletedEvent, MissionFailedEvent } from "./mission-event";
import type { KnowledgeArtifact } from "./knowledge-types";

type EventHandler = (event: MissionEvent) => void;

class KnowledgeQueue {
  private _queue: MissionEvent[] = [];
  private _handlers: EventHandler[] = [];
  private _processing = false;

  /** Mission Engine pushes events here */
  push(event: MissionEvent): void {
    this._queue.push(event);
    if (this._queue.length > 100) this._queue.shift();
    this.flush();
  }

  /** Register handler — Knowledge Office subscribes */
  subscribe(handler: EventHandler): void {
    this._handlers.push(handler);
  }

  /** Process all queued events */
  private flush(): void {
    if (this._processing) return;
    this._processing = true;

    while (this._queue.length > 0) {
      const event = this._queue.shift()!;
      for (const handler of this._handlers) {
        try { handler(event); } catch (e) { /* Skip failed handler */ }
      }
    }

    this._processing = false;
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
  pending(): number {
    return this._queue.length;
  }
}

export const knowledgeQueue = new KnowledgeQueue();
export { KnowledgeQueue };
