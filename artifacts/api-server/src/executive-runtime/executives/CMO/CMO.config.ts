export const CMO_CONFIG = {
  role: "CMO" as const,
  requiredFacts: ["Customer", "Sales", "Product"],
  optionalFacts: ["Branch"],
  forbidden: ["Inventory", "Production"],
  approvalLevel: "ceo" as const,
  description: "Chief Marketing Officer — Marketing, customer, campaigns",
};
