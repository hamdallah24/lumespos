import { deliveryQueue, type DeliveryTask } from "../core";

type NotificationListener = (notification: { title: string; body: string; taskId: string }) => void;

export class NotificationChannel {
  name = "notification" as const;
  private listeners: NotificationListener[] = [];

  subscribe(fn: NotificationListener): void {
    this.listeners.push(fn);
  }

  unsubscribe(fn: NotificationListener): void {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  async send(task: DeliveryTask): Promise<boolean> {
    try {
      const notification = {
        title: "New Notification",
        body: task.content.slice(0, 200),
        taskId: task.id,
      };
      for (const fn of this.listeners) fn(notification);
      deliveryQueue.markSent(task.id);
      return true;
    } catch (err) {
      console.error(`[Notification] Failed:`, err);
      deliveryQueue.markFailed(task.id);
      return false;
    }
  }
}

export const notificationChannel = new NotificationChannel();
