import type { DeliveryTask } from "./DeliveryQueue";
import { deliveryQueue } from "./DeliveryQueue";

export interface ScheduleRule {
  hour: number;
  minute: number;
  channels: string[];
  recipients: string[];
}

export const DeliveryScheduler = {
  scheduleBrief(briefId: string, channel: string, recipient: string, scheduledAt: Date): DeliveryTask {
    return deliveryQueue.enqueue({
      channel,
      recipient,
      content: `brief:${briefId}`,
      priority: "normal",
      maxRetries: 3,
      scheduledAt: scheduledAt.toISOString(),
    });
  },

  scheduleUrgent(content: string, channel: string, recipient: string): DeliveryTask {
    return deliveryQueue.enqueue({
      channel,
      recipient,
      content,
      priority: "critical",
      maxRetries: 5,
    });
  },

  processSchedule(rules: ScheduleRule[]): DeliveryTask[] {
    const now = new Date();
    const tasks: DeliveryTask[] = [];

    for (const rule of rules) {
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rule.hour, rule.minute, 0);
      if (scheduled <= now) continue;

      for (const channel of rule.channels) {
        for (const recipient of rule.recipients) {
          const task = this.scheduleBrief(`brief-daily`, channel, recipient, scheduled);
          tasks.push(task);
        }
      }
    }

    return tasks;
  },
};
