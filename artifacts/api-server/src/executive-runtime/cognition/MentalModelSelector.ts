import type { ExecutiveRole, MentalModelRef, ProblemType } from "./CognitiveContracts";

export interface MentalModelDef {
  id: string;
  name: string;
  category: string;
  description: string;
  applicableRoles: readonly ExecutiveRole[];
  applicableProblemTypes: readonly ProblemType[];
  keywords: readonly string[];
  complexity: number;
}

const MENTAL_MODELS: readonly MentalModelDef[] = [
  {
    id: "5-whys",
    name: "5 Whys",
    category: "root-cause",
    description: "Iterative questioning to find root cause",
    applicableRoles: ["CEO", "CTO", "COO"],
    applicableProblemTypes: ["diagnosis", "troubleshooting", "analysis"],
    keywords: ["root cause", "why", "cause", "problem"],
    complexity: 1,
  },
  {
    id: "first-principles",
    name: "First Principles",
    category: "reasoning",
    description: "Break down to fundamental truths and rebuild",
    applicableRoles: ["CEO", "CTO", "CAIO"],
    applicableProblemTypes: ["design", "strategy", "decision"],
    keywords: ["fundamental", "principle", "break down", "basic"],
    complexity: 3,
  },
  {
    id: "occams-razor",
    name: "Occam's Razor",
    category: "reasoning",
    description: "Simplest explanation is most likely",
    applicableRoles: ["CEO", "CTO", "CFO", "COO", "CMO", "CAIO", "CKO"],
    applicableProblemTypes: ["analysis", "diagnosis", "decision"],
    keywords: ["simple", "complexity", "simplest", "explanation"],
    complexity: 1,
  },
  {
    id: "inversion",
    name: "Inversion",
    category: "reasoning",
    description: "Think backwards to identify hidden risks",
    applicableRoles: ["CEO", "CTO", "CFO", "COO"],
    applicableProblemTypes: ["strategy", "planning", "evaluation"],
    keywords: ["inverse", "opposite", "reverse", "backwards"],
    complexity: 2,
  },
  {
    id: "second-order",
    name: "Second-Order Thinking",
    category: "reasoning",
    description: "Consider consequences of consequences",
    applicableRoles: ["CEO", "CTO", "CFO", "CAIO"],
    applicableProblemTypes: ["strategy", "planning", "decision"],
    keywords: ["consequence", "second-order", "ripple", "indirect"],
    complexity: 3,
  },
  {
    id: "circle-of-competence",
    name: "Circle of Competence",
    category: "meta",
    description: "Know what you know and don't know",
    applicableRoles: ["CEO", "CTO", "CFO", "CMO", "CAIO", "CKO"],
    applicableProblemTypes: ["decision", "evaluation", "planning"],
    keywords: ["competence", "expertise", "know", "boundary"],
    complexity: 1,
  },
  {
    id: "probabilistic",
    name: "Probabilistic Thinking",
    category: "reasoning",
    description: "Estimate outcomes with probabilities",
    applicableRoles: ["CEO", "CFO", "CAIO"],
    applicableProblemTypes: ["forecast", "evaluation", "decision"],
    keywords: ["probability", "chance", "likelihood", "odds"],
    complexity: 3,
  },
  {
    id: "pareto",
    name: "Pareto Principle (80/20)",
    category: "optimization",
    description: "Focus on the vital few that drive most results",
    applicableRoles: ["CEO", "CTO", "COO", "CMO", "CKO"],
    applicableProblemTypes: ["optimization", "analysis", "planning"],
    keywords: ["pareto", "80/20", "vital few", "priority"],
    complexity: 1,
  },
  {
    id: "thought-experiment",
    name: "Thought Experiment",
    category: "reasoning",
    description: "Simulate scenarios mentally",
    applicableRoles: ["CEO", "CTO", "CAIO", "CKO"],
    applicableProblemTypes: ["design", "strategy", "analysis"],
    keywords: ["what if", "imagine", "simulate", "scenario", "experiment"],
    complexity: 2,
  },
  {
    id: "lateral-thinking",
    name: "Lateral Thinking",
    category: "creativity",
    description: "Solve problems through indirect creative approach",
    applicableRoles: ["CEO", "CMO", "CAIO", "CKO"],
    applicableProblemTypes: ["design", "strategy", "optimization"],
    keywords: ["creative", "lateral", "indirect", "novel", "innovation"],
    complexity: 2,
  },
  {
    id: "premortem",
    name: "Pre-Mortem",
    category: "risk",
    description: "Imagine failure to prevent it",
    applicableRoles: ["CEO", "CTO", "COO", "CFO"],
    applicableProblemTypes: ["planning", "evaluation", "decision"],
    keywords: ["fail", "prevent", "risk", "worst case"],
    complexity: 2,
  },
  {
    id: "decision-tree",
    name: "Decision Tree",
    category: "decision",
    description: "Map decisions and possible outcomes",
    applicableRoles: ["CEO", "CTO", "CFO", "COO", "CMO", "CAIO", "CKO"],
    applicableProblemTypes: ["decision", "evaluation", "planning"],
    keywords: ["branch", "decision", "outcome", "path", "tree"],
    complexity: 2,
  },
  {
    id: "dependency-graph",
    name: "Dependency Graph",
    category: "systems",
    description: "Map dependencies between components",
    applicableRoles: ["CTO", "COO", "CAIO"],
    applicableProblemTypes: ["analysis", "design", "troubleshooting"],
    keywords: ["dependency", "graph", "map", "relationship", "interconnect"],
    complexity: 2,
  },
  {
    id: "constraint-theory",
    name: "Theory of Constraints",
    category: "optimization",
    description: "Identify and eliminate bottlenecks",
    applicableRoles: ["CTO", "COO", "CAIO"],
    applicableProblemTypes: ["optimization", "analysis", "troubleshooting"],
    keywords: ["bottleneck", "constraint", "limit", "throughput"],
    complexity: 2,
  },
  {
    id: "cynefin",
    name: "Cynefin Framework",
    category: "decision",
    description: "Classify problems into domains for appropriate action",
    applicableRoles: ["CEO", "CTO", "COO", "CAIO"],
    applicableProblemTypes: ["decision", "analysis", "strategy"],
    keywords: ["complex", "complicated", "chaotic", "obvious", "domain"],
    complexity: 2,
  },
  {
    id: "systems-thinking",
    name: "Systems Thinking",
    category: "systems",
    description: "Understand whole system behavior and feedback loops",
    applicableRoles: ["CEO", "CTO", "CAIO", "CKO"],
    applicableProblemTypes: ["analysis", "design", "strategy"],
    keywords: ["system", "feedback loop", "emergent", "holistic"],
    complexity: 3,
  },
  {
    id: "confirmation-bias",
    name: "Confirmation Bias Awareness",
    category: "meta",
    description: "Identify when seeking confirmatory evidence",
    applicableRoles: ["CEO", "CTO", "CFO", "CMO", "CAIO", "CKO", "COO"],
    applicableProblemTypes: ["analysis", "evaluation", "decision"],
    keywords: ["bias", "confirm", "challenge", "assumption"],
    complexity: 1,
  },
  {
    id: "hindsight",
    name: "Hindsight Bias Check",
    category: "meta",
    description: "Avoid overestimating predictability after event",
    applicableRoles: ["CEO", "CTO", "CFO"],
    applicableProblemTypes: ["evaluation", "analysis"],
    keywords: ["hindsight", "predict", "after", "bias"],
    complexity: 1,
  },
  {
    id: "sunk-cost",
    name: "Sunk Cost Awareness",
    category: "meta",
    description: "Ignore irrecoverable costs in forward decisions",
    applicableRoles: ["CEO", "CFO", "CTO"],
    applicableProblemTypes: ["decision", "evaluation"],
    keywords: ["sunk cost", "irrecoverable", "past investment"],
    complexity: 1,
  },
  {
    id: "scenario-analysis",
    name: "Scenario Analysis",
    category: "forecast",
    description: "Evaluate multiple plausible futures",
    applicableRoles: ["CEO", "CFO", "CMO", "CAIO"],
    applicableProblemTypes: ["forecast", "planning", "strategy"],
    keywords: ["scenario", "future", "plausible", "uncertainty"],
    complexity: 3,
  },
];

export function getAllMentalModels(): readonly MentalModelDef[] {
  return MENTAL_MODELS;
}

export function getMentalModelById(id: string): MentalModelDef | undefined {
  return MENTAL_MODELS.find((m) => m.id === id);
}

export function selectMentalModels(
  role: ExecutiveRole,
  problemType: ProblemType,
  query: string,
  maxResults: number = 5,
): readonly MentalModelRef[] {
  const lowerQuery = query.toLowerCase();
  const scored = MENTAL_MODELS
    .filter((m) => m.applicableRoles.includes(role))
    .map((m) => {
      let score = 0;
      if (m.applicableProblemTypes.includes(problemType)) {
        score += 0.5;
      }
      const matchedKeywords = m.keywords.filter((kw) => lowerQuery.includes(kw));
      score += (matchedKeywords.length / Math.max(m.keywords.length, 1)) * 0.3;
      score += (1 - m.complexity / 5) * 0.2;
      return { model: m, score: Math.min(score, 1) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, maxResults);
  const minResult = Math.max(3, Math.min(selected.length, maxResults));
  const result = selected.length < minResult
    ? scored.concat(
        MENTAL_MODELS
          .filter((m) => m.applicableRoles.includes(role) && !scored.some((s) => s.model.id === m.id))
          .slice(0, minResult - selected.length)
          .map((m) => ({ model: m, score: 0.1 })),
      )
    : selected;

  return result.map((s) => ({
    id: s.model.id,
    name: s.model.name,
    category: s.model.category,
    reason: `Relevance: ${Math.round(s.score * 100)}% — ${s.model.description}`,
  }));
}
