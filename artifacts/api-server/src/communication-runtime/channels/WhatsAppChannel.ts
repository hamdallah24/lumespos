import { deliveryQueue, type DeliveryTask } from "../core";

export const WhatsAppChannel = {
  name: "whatsapp" as const,

  async send(task: DeliveryTask): Promise<boolean> {
    try {
      console.log(`[WhatsApp] Sending to ${task.recipient}: ${task.content.slice(0, 100)}...`);
      deliveryQueue.markSent(task.id);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Failed:`, err);
      deliveryQueue.markFailed(task.id);
      return false;
    }
  },
};
