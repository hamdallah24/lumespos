import { registerSchema } from "./EventSchemaRegistry";
import type {
  OrderCreatedData, OrderCompletedData, PaymentReceivedData,
} from "../events/OrderEvents";
import type {
  StockAdjustedData, PurchaseReceivedData, StockCorrectedData,
} from "../events/InventoryEvents";
import type {
  ProductCreatedData, PriceChangedData, RecipeChangedData,
} from "../events/ProductEvents";
import type {
  IngredientConsumedData, BatchProducedData,
} from "../events/ProductionEvents";
import type { ExpenseRecordedData } from "../events/FinanceEvents";
import type {
  ShiftOpenedData, ShiftClosedData,
} from "../events/ShiftEvents";

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v);
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function registerAllEventSchemas(): void {
  registerSchema("order.created", 1, (d) => {
    const data = d as OrderCreatedData;
    return isNumber(data.branchId) && isNumber(data.orderId)
      && isNumber(data.total) && isString(data.paymentMethod)
      && Array.isArray(data.items);
  });

  registerSchema("order.completed", 1, (d) => {
    const data = d as OrderCompletedData;
    return isNumber(data.branchId) && isNumber(data.orderId)
      && isNumber(data.total) && isString(data.paymentMethod);
  });

  registerSchema("payment.received", 1, (d) => {
    const data = d as PaymentReceivedData;
    return isNumber(data.branchId) && isNumber(data.orderId)
      && isNumber(data.amount) && isString(data.paymentMethod);
  });

  registerSchema("stock.adjusted", 1, (d) => {
    const data = d as StockAdjustedData;
    return isNumber(data.branchId) && isNumber(data.itemId)
      && isNumber(data.delta) && isNumber(data.newStock)
      && isNumber(data.previousStock)
      && (data.itemType === "ingredient" || data.itemType === "semi_finished");
  });

  registerSchema("purchase.received", 1, (d) => {
    const data = d as PurchaseReceivedData;
    return isNumber(data.branchId) && isNumber(data.ingredientId)
      && isNumber(data.quantity) && isNumber(data.purchaseTotal)
      && isNumber(data.newAverageCost);
  });

  registerSchema("stock.corrected", 1, (d) => {
    const data = d as StockCorrectedData;
    return isNumber(data.branchId) && isNumber(data.itemId)
      && isNumber(data.previousStock) && isNumber(data.correctedStock)
      && isNumber(data.delta)
      && (data.itemType === "ingredient" || data.itemType === "semi_finished");
  });

  registerSchema("product.created", 1, (d) => {
    const data = d as ProductCreatedData;
    return isNumber(data.branchId) && isNumber(data.productId)
      && isString(data.name) && isNumber(data.price);
  });

  registerSchema("price.changed", 1, (d) => {
    const data = d as PriceChangedData;
    return isNumber(data.productVariantId) && isNumber(data.productId)
      && isString(data.variantName)
      && isNumber(data.oldPrice) && isNumber(data.newPrice);
  });

  registerSchema("recipe.changed", 1, (d) => {
    const data = d as RecipeChangedData;
    return isNumber(data.productId) && isString(data.productName)
      && isNumber(data.branchId)
      && (data.action === "created" || data.action === "updated");
  });

  registerSchema("ingredient.consumed", 1, (d) => {
    const data = d as IngredientConsumedData;
    return isNumber(data.branchId) && isNumber(data.semiFinishedId)
      && isNumber(data.componentId) && isNumber(data.quantity)
      && (data.componentType === "ingredient" || data.componentType === "semi_finished");
  });

  registerSchema("batch.produced", 1, (d) => {
    const data = d as BatchProducedData;
    return isNumber(data.branchId) && isNumber(data.semiFinishedId)
      && isString(data.semiFinishedName)
      && isNumber(data.producedWeight) && isNumber(data.totalCost)
      && isNumber(data.newHpp);
  });

  registerSchema("expense.recorded", 1, (d) => {
    const data = d as ExpenseRecordedData;
    return isNumber(data.branchId) && isNumber(data.expenseId)
      && isNumber(data.amount) && isString(data.description);
  });

  registerSchema("shift.opened", 1, (d) => {
    const data = d as ShiftOpenedData;
    return isNumber(data.shiftId) && isNumber(data.branchId)
      && isNumber(data.cashierId) && isNumber(data.openingBalance);
  });

  registerSchema("shift.closed", 1, (d) => {
    const data = d as ShiftClosedData;
    return isNumber(data.shiftId) && isNumber(data.branchId)
      && isString(data.status) && isNumber(data.expectedBalance)
      && isNumber(data.closingBalance) && isNumber(data.difference);
  });
}
