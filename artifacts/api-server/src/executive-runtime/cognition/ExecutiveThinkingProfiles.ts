import type { ExecutiveRole, ProblemType } from "./CognitiveContracts";

export interface ThinkingProfile {
  readonly role: ExecutiveRole;
  readonly preferredThinkingModes: readonly string[];
  readonly preferredFrameworks: readonly string[];
  readonly preferredMentalModels: readonly string[];
  readonly decisionStyle: string;
  readonly riskAppetite: "low" | "moderate" | "high";
  readonly confidenceThreshold: number;
  readonly defaultProblemType: ProblemType;
}

const PROFILES: Record<ExecutiveRole, ThinkingProfile> = {
  CEO: {
    role: "CEO",
    preferredThinkingModes: ["ceo-vision", "ceo-strategy", "ceo-growth"],
    preferredFrameworks: ["swot", "pestel", "bcg-matrix", "5-forces"],
    preferredMentalModels: ["first-principles", "second-order", "inversion"],
    decisionStyle: "vision-driven",
    riskAppetite: "high",
    confidenceThreshold: 65,
    defaultProblemType: "strategy",
  },
  CTO: {
    role: "CTO",
    preferredThinkingModes: ["cto-architecture", "cto-tradeoff", "cto-system-design"],
    preferredFrameworks: ["ddd", "solid", "cap", "c4-model"],
    preferredMentalModels: ["dependency-graph", "systems-thinking", "pareto"],
    decisionStyle: "analytical",
    riskAppetite: "moderate",
    confidenceThreshold: 75,
    defaultProblemType: "design",
  },
  CFO: {
    role: "CFO",
    preferredThinkingModes: ["cfo-capital-allocation", "cfo-forecasting", "cfo-scenario-analysis"],
    preferredFrameworks: ["cost-benefit", "risk-matrix", "balanced-scorecard"],
    preferredMentalModels: ["probabilistic", "scenario-analysis", "sunk-cost"],
    decisionStyle: "conservative",
    riskAppetite: "low",
    confidenceThreshold: 80,
    defaultProblemType: "evaluation",
  },
  CMO: {
    role: "CMO",
    preferredThinkingModes: ["cmo-brand", "cmo-growth", "cmo-market"],
    preferredFrameworks: ["swot", "pirate-metrics", "jtbd", "bcg-matrix"],
    preferredMentalModels: ["lateral-thinking", "pareto", "confirmation-bias"],
    decisionStyle: "creative",
    riskAppetite: "moderate",
    confidenceThreshold: 70,
    defaultProblemType: "strategy",
  },
  CAIO: {
    role: "CAIO",
    preferredThinkingModes: ["caio-ai-strategy", "caio-agent-design", "caio-knowledge"],
    preferredFrameworks: ["ddd", "event-storming", "gap-analysis", "ooda"],
    preferredMentalModels: ["first-principles", "systems-thinking", "thought-experiment"],
    decisionStyle: "experimental",
    riskAppetite: "moderate",
    confidenceThreshold: 70,
    defaultProblemType: "design",
  },
  CKO: {
    role: "CKO",
    preferredThinkingModes: ["cko-knowledge", "cko-ontology", "cko-knowledge-quality"],
    preferredFrameworks: ["gap-analysis", "kpis", "cynefin"],
    preferredMentalModels: ["circle-of-competence", "pareto", "confirmation-bias"],
    decisionStyle: "structured",
    riskAppetite: "low",
    confidenceThreshold: 80,
    defaultProblemType: "analysis",
  },
  COO: {
    role: "COO",
    preferredThinkingModes: ["coo-operation", "coo-process", "coo-execution"],
    preferredFrameworks: ["okr", "rice", "mckinsey-m7s", "ooda"],
    preferredMentalModels: ["pareto", "constraint-theory", "premortem"],
    decisionStyle: "execution-focused",
    riskAppetite: "low",
    confidenceThreshold: 75,
    defaultProblemType: "planning",
  },
};

export function getThinkingProfile(role: ExecutiveRole): ThinkingProfile {
  return PROFILES[role];
}

export function getAllThinkingProfiles(): Record<ExecutiveRole, ThinkingProfile> {
  return { ...PROFILES };
}
