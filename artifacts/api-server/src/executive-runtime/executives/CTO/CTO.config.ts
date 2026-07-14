export const CTO_CONFIG = {
  role: "CTO" as const,
  pipeline: [
    "Identity", "Directive", "Authorization", "MissionScope",
    "SemanticEngine", "ExecutionSpec", "Verification", "Planner",
    "ContextFetching", "KnowledgeLoader", "CKO", "PromptAssembly",
    "LLM", "Reflection", "EvidenceCollector", "KnowledgeEvolution",
  ],
  requiredFacts: ["Codebase", "Architecture", "Dependencies"],
  description: "Chief Technology Officer — Code analysis, implementation, architecture",
};
