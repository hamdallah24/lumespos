import type { ExecutiveRole, FrameworkRef, ProblemType } from "./CognitiveContracts";

export interface FrameworkDef {
  id: string;
  name: string;
  category: string;
  description: string;
  applicableRoles: readonly ExecutiveRole[];
  applicableProblemTypes: readonly ProblemType[];
  keywords: readonly string[];
}

const FRAMEWORKS: readonly FrameworkDef[] = [
  {
    id: "swot",
    name: "SWOT Analysis",
    category: "strategic",
    description: "Strengths, Weaknesses, Opportunities, Threats assessment",
    applicableRoles: ["CEO", "CMO"],
    applicableProblemTypes: ["strategy", "analysis", "evaluation"],
    keywords: ["strength", "weakness", "opportunity", "threat"],
  },
  {
    id: "rice",
    name: "RICE Prioritization",
    category: "prioritization",
    description: "Reach, Impact, Confidence, Effort scoring",
    applicableRoles: ["CEO", "CTO", "COO", "CMO"],
    applicableProblemTypes: ["decision", "planning", "optimization"],
    keywords: ["reach", "impact", "confidence", "effort", "priority"],
  },
  {
    id: "ice",
    name: "ICE Score",
    category: "prioritization",
    description: "Impact, Confidence, Ease scoring",
    applicableRoles: ["CEO", "CTO", "CMO"],
    applicableProblemTypes: ["decision", "evaluation"],
    keywords: ["impact", "confidence", "ease", "score"],
  },
  {
    id: "ddd",
    name: "Domain-Driven Design",
    category: "architecture",
    description: "Model complex business domains through bounded contexts",
    applicableRoles: ["CTO", "CAIO"],
    applicableProblemTypes: ["design", "analysis", "planning"],
    keywords: ["domain", "bounded context", "ubiquitous language", "entity"],
  },
  {
    id: "solid",
    name: "SOLID Principles",
    category: "architecture",
    description: "Single responsibility, Open-closed, Liskov, Interface seg, Dependency inversion",
    applicableRoles: ["CTO"],
    applicableProblemTypes: ["design", "evaluation"],
    keywords: ["solid", "single responsibility", "interface", "dependency"],
  },
  {
    id: "cap",
    name: "CAP Theorem",
    category: "architecture",
    description: "Consistency, Availability, Partition tolerance trade-off",
    applicableRoles: ["CTO", "CAIO"],
    applicableProblemTypes: ["design", "decision", "evaluation"],
    keywords: ["consistency", "availability", "partition", "tradeoff"],
  },
  {
    id: "flywheel",
    name: "Flywheel Effect",
    category: "strategic",
    description: "Cumulative growth through reinforcing loops",
    applicableRoles: ["CEO", "CMO"],
    applicableProblemTypes: ["strategy", "planning"],
    keywords: ["flywheel", "momentum", "compound", "loop", "growth"],
  },
  {
    id: "jtbd",
    name: "Jobs to Be Done",
    category: "strategic",
    description: "Understand customer jobs and desired outcomes",
    applicableRoles: ["CMO", "CEO"],
    applicableProblemTypes: ["strategy", "analysis", "design"],
    keywords: ["job", "customer", "outcome", "need", "hiring"],
  },
  {
    id: "mckinsey-m7s",
    name: "McKinsey 7S",
    category: "strategic",
    description: "Strategy, Structure, Systems, Shared values, Style, Staff, Skills",
    applicableRoles: ["CEO", "COO"],
    applicableProblemTypes: ["strategy", "analysis", "planning"],
    keywords: ["7S", "strategy", "structure", "system", "shared values"],
  },
  {
    id: "ooda",
    name: "OODA Loop",
    category: "decision",
    description: "Observe, Orient, Decide, Act",
    applicableRoles: ["CEO", "CTO", "COO"],
    applicableProblemTypes: ["decision", "troubleshooting", "planning"],
    keywords: ["observe", "orient", "decide", "act", "loop"],
  },
  {
    id: "cynefin",
    name: "Cynefin Framework",
    category: "decision",
    description: "Classify problems into Simple, Complicated, Complex, Chaotic",
    applicableRoles: ["CEO", "CTO", "COO", "CAIO"],
    applicableProblemTypes: ["decision", "analysis"],
    keywords: ["cynefin", "complex", "complicated", "chaotic", "simple"],
  },
  {
    id: "first-principles",
    name: "First Principles Thinking",
    category: "reasoning",
    description: "Break down to fundamental truths and reason up",
    applicableRoles: ["CEO", "CTO", "CAIO"],
    applicableProblemTypes: ["design", "strategy", "troubleshooting"],
    keywords: ["first principle", "fundamental", "break down", "truth"],
  },
  {
    id: "cost-benefit",
    name: "Cost-Benefit Analysis",
    category: "financial",
    description: "Compare costs against benefits for decision making",
    applicableRoles: ["CEO", "CFO", "CTO"],
    applicableProblemTypes: ["evaluation", "decision", "planning"],
    keywords: ["cost", "benefit", "ROI", "value", "payback"],
  },
  {
    id: "pirate-metrics",
    name: "Pirate Metrics (AARRR)",
    category: "growth",
    description: "Acquisition, Activation, Retention, Revenue, Referral",
    applicableRoles: ["CMO", "CEO"],
    applicableProblemTypes: ["analysis", "strategy", "optimization"],
    keywords: ["acquisition", "activation", "retention", "revenue", "referral"],
  },
  {
    id: "okr",
    name: "OKR Framework",
    category: "execution",
    description: "Objectives and Key Results for goal alignment",
    applicableRoles: ["CEO", "COO", "CTO"],
    applicableProblemTypes: ["planning", "evaluation", "strategy"],
    keywords: ["objective", "key result", "goal", "alignment", "measure"],
  },
  {
    id: "balanced-scorecard",
    name: "Balanced Scorecard",
    category: "strategic",
    description: "Financial, Customer, Internal Process, Learning & Growth",
    applicableRoles: ["CEO", "CFO", "COO"],
    applicableProblemTypes: ["strategy", "evaluation", "planning"],
    keywords: ["scorecard", "financial", "customer", "process", "learning"],
  },
  {
    id: "pestel",
    name: "PESTEL Analysis",
    category: "strategic",
    description: "Political, Economic, Social, Technological, Environmental, Legal",
    applicableRoles: ["CEO", "CMO"],
    applicableProblemTypes: ["strategy", "analysis", "forecast"],
    keywords: ["political", "economic", "social", "technological", "environmental", "legal"],
  },
  {
    id: "moat",
    name: "Economic Moat Analysis",
    category: "strategic",
    description: "Evaluate sustainable competitive advantages",
    applicableRoles: ["CEO", "CFO"],
    applicableProblemTypes: ["strategy", "evaluation", "analysis"],
    keywords: ["moat", "competitive advantage", "barrier", "defensibility"],
  },
  {
    id: "event-storming",
    name: "Event Storming",
    category: "architecture",
    description: "Collaborative domain modeling through events",
    applicableRoles: ["CTO", "CAIO"],
    applicableProblemTypes: ["design", "analysis", "planning"],
    keywords: ["event", "domain", "model", "collaborative", "workshop"],
  },
  {
    id: "c4-model",
    name: "C4 Model",
    category: "architecture",
    description: "Context, Container, Component, Code architecture visualization",
    applicableRoles: ["CTO"],
    applicableProblemTypes: ["design", "analysis", "planning"],
    keywords: ["C4", "context", "container", "component", "architecture"],
  },
  {
    id: "risk-matrix",
    name: "Risk Matrix",
    category: "risk",
    description: "Assess probability vs impact for risks",
    applicableRoles: ["CEO", "CFO", "CTO", "COO"],
    applicableProblemTypes: ["evaluation", "planning", "decision"],
    keywords: ["risk", "probability", "impact", "matrix", "severity"],
  },
  {
    id: "bcg-matrix",
    name: "BCG Growth-Share Matrix",
    category: "strategic",
    description: "Stars, Cash Cows, Question Marks, Dogs portfolio analysis",
    applicableRoles: ["CEO", "CMO"],
    applicableProblemTypes: ["strategy", "analysis", "evaluation"],
    keywords: ["BCG", "stars", "cash cow", "question mark", "dog", "portfolio"],
  },
  {
    id: "5-forces",
    name: "Porter's 5 Forces",
    category: "strategic",
    description: "Industry competitive analysis: rivalry, entrants, substitutes, buyers, suppliers",
    applicableRoles: ["CEO", "CMO"],
    applicableProblemTypes: ["strategy", "analysis", "evaluation"],
    keywords: ["porter", "forces", "competitive", "industry", "rivalry"],
  },
  {
    id: "value-chain",
    name: "Value Chain Analysis",
    category: "strategic",
    description: "Analyze primary and support activities for value creation",
    applicableRoles: ["CEO", "COO"],
    applicableProblemTypes: ["analysis", "optimization", "strategy"],
    keywords: ["value chain", "activity", "margin", "primary", "support"],
  },
  {
    id: "gap-analysis",
    name: "Gap Analysis",
    category: "strategic",
    description: "Compare current state vs desired future state",
    applicableRoles: ["CEO", "CTO", "COO", "CMO", "CAIO"],
    applicableProblemTypes: ["analysis", "planning", "evaluation"],
    keywords: ["gap", "current", "desired", "future", "discrepancy"],
  },
  {
    id: "kpis",
    name: "KPI Framework",
    category: "measurement",
    description: "Define and track key performance indicators",
    applicableRoles: ["CEO", "CFO", "COO", "CMO", "CAIO", "CKO"],
    applicableProblemTypes: ["evaluation", "analysis", "planning"],
    keywords: ["KPI", "metric", "measure", "indicator", "dashboard"],
  },
  {
    id: "backlog-prioritization",
    name: "WSJF Prioritization",
    category: "prioritization",
    description: "Weighted Shortest Job First for prioritization",
    applicableRoles: ["CTO", "COO"],
    applicableProblemTypes: ["decision", "optimization", "planning"],
    keywords: ["WSJF", "weight", "shortest", "job", "first", "priority"],
  },
];

export function getAllFrameworks(): readonly FrameworkDef[] {
  return FRAMEWORKS;
}

export function getFrameworkById(id: string): FrameworkDef | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}

export function selectFrameworks(
  role: ExecutiveRole,
  problemType: ProblemType,
  query: string,
  mentalModelCount: number = 0,
  maxResults: number = 4,
): readonly FrameworkRef[] {
  const lowerQuery = query.toLowerCase();
  const scored = FRAMEWORKS
    .filter((f) => f.applicableRoles.includes(role))
    .map((f) => {
      let score = 0;
      if (f.applicableProblemTypes.includes(problemType)) {
        score += 0.5;
      }
      const matchedKeywords = f.keywords.filter((kw) => lowerQuery.includes(kw));
      score += (matchedKeywords.length / Math.max(f.keywords.length, 1)) * 0.3;

      if (mentalModelCount > 2) score += 0.1;

      return { framework: f, score: Math.min(score, 1) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, maxResults);

  return selected.map((s) => ({
    id: s.framework.id,
    name: s.framework.name,
    category: s.framework.category,
    reason: `Relevance: ${Math.round(s.score * 100)}% — ${s.framework.description}`,
    weight: Math.round(s.score * 100),
  }));
}
