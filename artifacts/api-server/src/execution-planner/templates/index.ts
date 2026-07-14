export { createStockTransferGraph } from "./StockTransferGraph";
export { createEmergencyPurchaseGraph } from "./EmergencyPurchaseGraph";
export { createRevenueRecoveryGraph } from "./RevenueRecoveryGraph";
export { createExpenseAuditGraph } from "./ExpenseAuditGraph";
export { createYieldCorrectionGraph } from "./YieldCorrectionGraph";
export { createPriceReviewGraph } from "./PriceReviewGraph";
export { createShiftInvestigationGraph } from "./ShiftInvestigationGraph";
export { createCashDiscrepancyGraph } from "./CashDiscrepancyGraph";

import type { ExecutionGraph } from "../core/types";
import { createStockTransferGraph } from "./StockTransferGraph";
import { createEmergencyPurchaseGraph } from "./EmergencyPurchaseGraph";
import { createRevenueRecoveryGraph } from "./RevenueRecoveryGraph";
import { createExpenseAuditGraph } from "./ExpenseAuditGraph";
import { createYieldCorrectionGraph } from "./YieldCorrectionGraph";
import { createPriceReviewGraph } from "./PriceReviewGraph";
import { createShiftInvestigationGraph } from "./ShiftInvestigationGraph";
import { createCashDiscrepancyGraph } from "./CashDiscrepancyGraph";

export function createGraphByTemplate(template: string, branchId?: number): ExecutionGraph {
  const map: Record<string, (b?: number) => ExecutionGraph> = {
    stock_transfer: createStockTransferGraph,
    emergency_purchase: createEmergencyPurchaseGraph,
    revenue_recovery: createRevenueRecoveryGraph,
    expense_audit: createExpenseAuditGraph,
    yield_correction: createYieldCorrectionGraph,
    price_review: createPriceReviewGraph,
    shift_investigation: createShiftInvestigationGraph,
    cash_discrepancy: createCashDiscrepancyGraph,
  };
  const fn = map[template];
  if (!fn) throw new Error(`Unknown template: ${template}`);
  return fn(branchId);
}
