import { deliveryQueue, type DeliveryTask } from "../core";

export const TelegramChannel = {
  name: "telegram" as const,

  async send(task: DeliveryTask): Promise<boolean> {
    try {
      console.log(`[Telegram] Sending to ${task.recipient}: ${task.content.slice(0, 100)}...`);
      deliveryQueue.markSent(task.id);
      return true;
    } catch (err) {
      console.error(`[Telegram] Failed:`, err);
      deliveryQueue.markFailed(task.id);
      return false;
    }
  },
};
