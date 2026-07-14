export const CFO_CONFIG = {
  role: "CFO" as const,
  requiredFacts: ["Finance", "Margin", "Expense", "Cashflow"],
  optionalFacts: ["Inventory (cost)"],
  forbidden: ["Operations", "Staff"],
  approvalLevel: "ceo" as const,
  description: "Chief Financial Officer — Margin, expenses, cash flow",
};
