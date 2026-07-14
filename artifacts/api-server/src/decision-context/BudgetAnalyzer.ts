export interface BudgetAnalysis {
  availableBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  utilizationRate: number;
}

let budgetOverrides: Partial<BudgetAnalysis> = {};

export function setBudgetOverrides(budget: Partial<BudgetAnalysis>): void {
  budgetOverrides = budget;
}

export function analyzeBudget(): BudgetAnalysis {
  const available = budgetOverrides.availableBudget ?? 0;
  const allocated = budgetOverrides.allocatedBudget ?? 0;
  return {
    availableBudget: available,
    allocatedBudget: allocated,
    remainingBudget: available - allocated,
    utilizationRate: available > 0 ? allocated / available : 0,
  };
}
