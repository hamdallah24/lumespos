import { deliveryQueue, type DeliveryTask } from "../core";

export const EmailChannel = {
  name: "email" as const,

  async send(task: DeliveryTask): Promise<boolean> {
    try {
      console.log(`[Email] Sending to ${task.recipient}: ${task.content.slice(0, 100)}...`);
      deliveryQueue.markSent(task.id);
      return true;
    } catch (err) {
      console.error(`[Email] Failed:`, err);
      deliveryQueue.markFailed(task.id);
      return false;
    }
  },
};
