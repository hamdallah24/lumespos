import { EventSubscriber } from "../../event-bus";
import { processStockAdjusted, processPurchaseReceived } from "../calculators";

export function registerInventoryConsumers(): void {
  EventSubscriber.on("stock.adjusted", async (event) => {
    const data = event.data as {
      branchId: number;
      itemType: string;
      itemId: number;
      delta: number;
      newStock: number;
      previousStock: number;
    };
    processStockAdjusted({
      branchId: data.branchId,
      itemType: data.itemType,
      itemId: data.itemId,
      newStock: data.newStock,
    });
  });

  EventSubscriber.on("purchase.received", async (event) => {
    const data = event.data as {
      branchId: number;
      ingredientId: number;
      quantity: number;
      purchaseTotal: number;
      newAverageCost: number;
    };
    processPurchaseReceived({
      branchId: data.branchId,
      ingredientId: data.ingredientId,
      quantity: data.quantity,
      newAverageCost: data.newAverageCost,
    });
  });
}
