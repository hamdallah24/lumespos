export type DeliveryPriority = "critical" | "high" | "normal" | "low";

export interface DeliveryTask {
  id: string;
  channel: string;
  recipient: string;
  content: string;
  priority: DeliveryPriority;
  status: "queued" | "processing" | "sent" | "failed";
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledAt?: string;
}

let taskCounter = 0;
function nextId(): string {
  taskCounter++;
  return `TASK-${Date.now().toString(36)}-${taskCounter}`;
}

const priorityOrder: Record<DeliveryPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

export class DeliveryQueue {
  private tasks: DeliveryTask[] = [];

  enqueue(params: Omit<DeliveryTask, "id" | "status" | "retryCount" | "createdAt">): DeliveryTask {
    const task: DeliveryTask = {
      ...params,
      id: nextId(),
      status: "queued",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return task;
  }

  dequeue(): DeliveryTask | undefined {
    const sorted = [...this.tasks]
      .filter(t => t.status === "queued" && (!t.scheduledAt || new Date(t.scheduledAt) <= new Date()))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (sorted.length === 0) return undefined;
    const task = sorted[0];
    task.status = "processing";
    return task;
  }

  markSent(id: string): boolean {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;
    task.status = "sent";
    return true;
  }

  markFailed(id: string): boolean {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;
    task.status = "failed";
    task.retryCount++;
    if (task.retryCount < task.maxRetries) {
      task.status = "queued";
    }
    return true;
  }

  getPending(): DeliveryTask[] {
    return this.tasks.filter(t => t.status === "queued");
  }

  getByChannel(channel: string): DeliveryTask[] {
    return this.tasks.filter(t => t.channel === channel);
  }

  getAll(): DeliveryTask[] {
    return [...this.tasks];
  }

  clear(): void {
    this.tasks.length = 0;
  }
}

export const deliveryQueue = new DeliveryQueue();
