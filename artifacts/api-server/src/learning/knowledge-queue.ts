// ECP-044 Sprint 4c: Knowledge Queue
// Async queue for processing learning tasks.
// Decouples mission execution from knowledge processing.

import type { KnowledgeQueueItem, ExecutiveRole } from "./learning-types";
import { createQueueId } from "./learning-types";

export class KnowledgeQueue {
  private queue: KnowledgeQueueItem[] = [];

  /** Enqueue a learning task */
  enqueue(missionId: string, executive: ExecutiveRole): KnowledgeQueueItem {
    const item: KnowledgeQueueItem = {
      id: createQueueId(),
      missionId,
      executive,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.queue.push(item);
    return item;
  }

  /** Get next pending item */
  dequeue(): KnowledgeQueueItem | null {
    const item = this.queue.find(q => q.status === "PENDING");
    if (item) {
      item.status = "PROCESSING";
    }
    return item || null;
  }

  /** Mark item as completed */
  complete(id: string): void {
    const item = this.queue.find(q => q.id === id);
    if (item) {
      item.status = "COMPLETED";
      item.completedAt = new Date().toISOString();
    }
  }

  /** Mark item as failed */
  fail(id: string): void {
    const item = this.queue.find(q => q.id === id);
    if (item) {
      item.status = "FAILED";
      item.completedAt = new Date().toISOString();
    }
  }

  /** Get pending count */
  pendingCount(): number {
    return this.queue.filter(q => q.status === "PENDING").length;
  }

  /** Get processing count */
  processingCount(): number {
    return this.queue.filter(q => q.status === "PROCESSING").length;
  }

  /** List all items */
  list(): KnowledgeQueueItem[] {
    return [...this.queue];
  }

  /** Clear completed/failed items older than retentionMs */
  prune(retentionMs: number = 3600000): number {
    const cutoff = Date.now() - retentionMs;
    const before = this.queue.length;
    this.queue = this.queue.filter(q => {
      if (q.status === "PENDING" || q.status === "PROCESSING") return true;
      const completed = q.completedAt ? new Date(q.completedAt).getTime() : 0;
      return completed > cutoff;
    });
    return before - this.queue.length;
  }
}

export const knowledgeQueue = new KnowledgeQueue();
