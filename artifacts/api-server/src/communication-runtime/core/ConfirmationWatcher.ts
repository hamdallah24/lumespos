import { deliveryQueue, type DeliveryTask } from "./DeliveryQueue";

export type ConfirmationStatus = "pending" | "delivered" | "read" | "failed";

interface ConfirmationRecord {
  taskId: string;
  status: ConfirmationStatus;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
}

export class ConfirmationWatcher {
  private records = new Map<string, ConfirmationRecord>();

  create(task: DeliveryTask): ConfirmationRecord {
    const record: ConfirmationRecord = { taskId: task.id, status: "pending" };
    this.records.set(task.id, record);
    return record;
  }

  confirmDelivery(taskId: string): boolean {
    const record = this.records.get(taskId);
    if (!record) return false;
    record.status = "delivered";
    record.deliveredAt = new Date().toISOString();
    return true;
  }

  confirmRead(taskId: string): boolean {
    const record = this.records.get(taskId);
    if (!record) return false;
    record.status = "read";
    record.readAt = new Date().toISOString();
    return true;
  }

  confirmFailed(taskId: string, reason: string): boolean {
    const record = this.records.get(taskId);
    if (!record) return false;
    record.status = "failed";
    record.failureReason = reason;
    return true;
  }

  getStatus(taskId: string): ConfirmationStatus | undefined {
    return this.records.get(taskId)?.status;
  }

  getPending(): ConfirmationRecord[] {
    return Array.from(this.records.values()).filter(r => r.status === "pending");
  }

  getAll(): ConfirmationRecord[] {
    return Array.from(this.records.values());
  }

  clear(): void {
    this.records.clear();
  }
}

export const confirmationWatcher = new ConfirmationWatcher();
