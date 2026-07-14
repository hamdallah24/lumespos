import { deliveryQueue, type DeliveryTask } from "../core";

type DashboardListener = (content: string) => void;

export class DashboardChannel {
  name = "dashboard" as const;
  private listeners: DashboardListener[] = [];

  subscribe(fn: DashboardListener): void {
    this.listeners.push(fn);
  }

  unsubscribe(fn: DashboardListener): void {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  async send(task: DeliveryTask): Promise<boolean> {
    try {
      const parsed = JSON.parse(task.content);
      for (const fn of this.listeners) {
        fn(parsed);
      }
      deliveryQueue.markSent(task.id);
      return true;
    } catch (err) {
      console.error(`[Dashboard] Failed:`, err);
      deliveryQueue.markFailed(task.id);
      return false;
    }
  }
}

export const dashboardChannel = new DashboardChannel();
