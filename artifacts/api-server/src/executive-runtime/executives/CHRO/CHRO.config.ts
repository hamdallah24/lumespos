export const CHRO_CONFIG = {
  role: "CHRO" as const,
  requiredFacts: ["Personnel", "Shift", "HR", "Payroll"],
  optionalFacts: ["Branch"],
  forbidden: ["Inventory", "Production", "Finance"],
  approvalLevel: "ceo" as const,
  description: "Chief Human Resources Officer — Personnel, shifts, HR reports",
};
