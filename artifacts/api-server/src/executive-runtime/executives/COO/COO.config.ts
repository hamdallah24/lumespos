export const COO_CONFIG = {
  role: "COO" as const,
  requiredFacts: ["Operations", "Inventory", "Branch"],
  optionalFacts: ["Sales", "Expenses"],
  forbidden: ["Strategic decisions"],
  approvalLevel: "founder" as const,
  description: "Chief Operating Officer — Operational execution, approvals, inventory",
};
