export const CAIO_CONFIG = {
  role: "CAIO" as const,
  requiredFacts: ["System", "AI", "Knowledge", "Automation"],
  optionalFacts: [],
  forbidden: ["Business decisions"],
  approvalLevel: "ceo" as const,
  description: "Chief AI Officer — System architecture, AI health",
};
