import { deliveryQueue, type DeliveryTask, type DeliveryPriority } from "../core";
import { WhatsAppChannel } from "../channels";
import { dashboardChannel } from "../channels";
import { TelegramChannel } from "../channels";
import { EmailChannel } from "../channels";
import { notificationChannel } from "../channels";

const channelMap: Record<string, { send: (task: DeliveryTask) => Promise<boolean> }> = {
  whatsapp: WhatsAppChannel,
  telegram: TelegramChannel,
  email: EmailChannel,
  dashboard: dashboardChannel,
  notification: notificationChannel,
};

export const CommunicationProvider = {
  dispatch(params: {
    channel: string;
    recipient: string;
    content: string;
    priority?: DeliveryPriority;
    maxRetries?: number;
  }): DeliveryTask {
    return deliveryQueue.enqueue({
      channel: params.channel,
      recipient: params.recipient,
      content: params.content,
      priority: params.priority ?? "normal",
      maxRetries: params.maxRetries ?? 3,
    });
  },

  async process(): Promise<number> {
    let processed = 0;
    let task = deliveryQueue.dequeue();

    while (task) {
      const channel = channelMap[task.channel];
      if (channel) {
        await channel.send(task);
        processed++;
      } else {
        deliveryQueue.markFailed(task.id);
      }
      task = deliveryQueue.dequeue();
    }

    return processed;
  },

  getPending(): DeliveryTask[] {
    return deliveryQueue.getPending();
  },

  getByChannel(channel: string): DeliveryTask[] {
    return deliveryQueue.getByChannel(channel);
  },

  getAll(): DeliveryTask[] {
    return deliveryQueue.getAll();
  },

  clear(): void {
    deliveryQueue.clear();
  },
};
