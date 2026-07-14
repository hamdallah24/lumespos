export { registerInventoryConsumers } from "./InventoryEventConsumer";
export { registerSalesConsumers } from "./SalesEventConsumer";
export { registerFinanceConsumers } from "./FinanceEventConsumer";

import { registerInventoryConsumers } from "./InventoryEventConsumer";
import { registerSalesConsumers } from "./SalesEventConsumer";
import { registerFinanceConsumers } from "./FinanceEventConsumer";

export function registerAllConsumers(): void {
  registerInventoryConsumers();
  registerSalesConsumers();
  registerFinanceConsumers();
}
