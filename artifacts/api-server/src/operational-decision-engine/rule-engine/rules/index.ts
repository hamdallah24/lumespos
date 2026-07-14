export { registerStockCriticalRule } from "./StockCriticalRule";
export { registerStockLowRule } from "./StockLowRule";
export { registerCashDiscrepancyRule } from "./CashDiscrepancyRule";
export { registerYieldAnomalyRule } from "./YieldAnomalyRule";
export { registerExpenseSpikeRule } from "./ExpenseSpikeRule";
export { registerRevenueDropRule } from "./RevenueDropRule";

import { registerStockCriticalRule } from "./StockCriticalRule";
import { registerStockLowRule } from "./StockLowRule";
import { registerCashDiscrepancyRule } from "./CashDiscrepancyRule";
import { registerYieldAnomalyRule } from "./YieldAnomalyRule";
import { registerExpenseSpikeRule } from "./ExpenseSpikeRule";
import { registerRevenueDropRule } from "./RevenueDropRule";

export function registerAllRules(): void {
  registerStockCriticalRule();
  registerStockLowRule();
  registerCashDiscrepancyRule();
  registerYieldAnomalyRule();
  registerExpenseSpikeRule();
  registerRevenueDropRule();
}
