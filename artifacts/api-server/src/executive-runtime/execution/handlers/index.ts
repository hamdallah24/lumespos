import type { ActionRegistry } from "../ActionRegistry";
import { registerStockHandlers } from "./StockHandlers";
import { registerProductHandlers } from "./ProductHandlers";
import { registerExpenseHandlers } from "./ExpenseHandlers";
import { registerProductionHandlers } from "./ProductionHandlers";
import { registerPurchaseHandlers } from "./PurchaseHandlers";
import { registerShiftHandlers } from "./ShiftHandlers";

export function registerAllHandlers(registry: ActionRegistry): void {
  registerStockHandlers(registry);
  registerProductHandlers(registry);
  registerExpenseHandlers(registry);
  registerProductionHandlers(registry);
  registerPurchaseHandlers(registry);
  registerShiftHandlers(registry);
}
