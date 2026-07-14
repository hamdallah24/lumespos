import type { ExecutiveRole, ThinkingModeId, ThinkingModeSelection, ProblemType } from "./CognitiveContracts";

export interface ThinkingModeDef {
  id: ThinkingModeId;
  role: ExecutiveRole;
  label: string;
  description: string;
  applicableProblemTypes: readonly ProblemType[];
  keywords: readonly string[];
}

const CEO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "ceo-vision",
    role: "CEO",
    label: "Vision",
    description: "Long-term direction and future state envisioning",
    applicableProblemTypes: ["strategy", "planning", "decision"],
    keywords: ["vision", "future", "long-term", "direction", "mission"],
  },
  {
    id: "ceo-strategy",
    role: "CEO",
    label: "Strategy",
    description: "Competitive positioning and strategic moves",
    applicableProblemTypes: ["strategy", "decision", "evaluation"],
    keywords: ["strategy", "competitive", "positioning", "advantage"],
  },
  {
    id: "ceo-investment",
    role: "CEO",
    label: "Investment",
    description: "Capital allocation and resource commitment",
    applicableProblemTypes: ["decision", "evaluation", "optimization"],
    keywords: ["investment", "capital", "allocate", "ROI", "funding"],
  },
  {
    id: "ceo-negotiation",
    role: "CEO",
    label: "Negotiation",
    description: "Stakeholder alignment and deal structuring",
    applicableProblemTypes: ["decision", "evaluation"],
    keywords: ["negotiation", "deal", "stakeholder", "alignment", "partnership"],
  },
  {
    id: "ceo-growth",
    role: "CEO",
    label: "Growth",
    description: "Scalability and expansion planning",
    applicableProblemTypes: ["strategy", "planning", "forecast"],
    keywords: ["growth", "scale", "expansion", "revenue", "market"],
  },
  {
    id: "ceo-risk",
    role: "CEO",
    label: "Risk",
    description: "Threat assessment and mitigation planning",
    applicableProblemTypes: ["analysis", "evaluation", "troubleshooting"],
    keywords: ["risk", "threat", "mitigation", "crisis", "uncertainty"],
  },
  {
    id: "ceo-organization",
    role: "CEO",
    label: "Organization",
    description: "Organizational structure and culture design",
    applicableProblemTypes: ["design", "planning", "decision"],
    keywords: ["organization", "culture", "structure", "team", "talent"],
  },
];

const CTO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "cto-architecture",
    role: "CTO",
    label: "Architecture",
    description: "System structure and component design",
    applicableProblemTypes: ["design", "analysis", "decision"],
    keywords: ["architecture", "system", "component", "structure", "design"],
  },
  {
    id: "cto-debugging",
    role: "CTO",
    label: "Debugging",
    description: "Root cause analysis and defect resolution",
    applicableProblemTypes: ["diagnosis", "troubleshooting", "analysis"],
    keywords: ["debug", "bug", "error", "failure", "root cause"],
  },
  {
    id: "cto-tradeoff",
    role: "CTO",
    label: "Tradeoff",
    description: "Technical compromise evaluation",
    applicableProblemTypes: ["evaluation", "decision", "optimization"],
    keywords: ["tradeoff", "compromise", "pros", "cons", "compare"],
  },
  {
    id: "cto-refactoring",
    role: "CTO",
    label: "Refactoring",
    description: "Code and system improvement planning",
    applicableProblemTypes: ["planning", "design", "optimization"],
    keywords: ["refactor", "improve", "technical debt", "modernize"],
  },
  {
    id: "cto-system-design",
    role: "CTO",
    label: "System Design",
    description: "End-to-end system architecture creation",
    applicableProblemTypes: ["design", "planning", "strategy"],
    keywords: ["system design", "architecture", "scalability", "reliability"],
  },
  {
    id: "cto-technology-selection",
    role: "CTO",
    label: "Technology Selection",
    description: "Technology and tool evaluation and choice",
    applicableProblemTypes: ["evaluation", "decision", "analysis"],
    keywords: ["technology", "tool", "framework", "library", "platform"],
  },
  {
    id: "cto-execution-planning",
    role: "CTO",
    label: "Execution Planning",
    description: "Implementation roadmap and milestone planning",
    applicableProblemTypes: ["planning", "strategy", "optimization"],
    keywords: ["plan", "roadmap", "milestone", "iteration", "sprint"],
  },
];

const CFO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "cfo-capital-allocation",
    role: "CFO",
    label: "Capital Allocation",
    description: "Financial resource distribution and investment planning",
    applicableProblemTypes: ["decision", "optimization", "planning"],
    keywords: ["capital", "allocation", "budget", "funding", "resource"],
  },
  {
    id: "cfo-forecasting",
    role: "CFO",
    label: "Forecasting",
    description: "Financial prediction and trend analysis",
    applicableProblemTypes: ["forecast", "analysis", "planning"],
    keywords: ["forecast", "predict", "trend", "projection", "estimate"],
  },
  {
    id: "cfo-budget",
    role: "CFO",
    label: "Budget",
    description: "Budget planning and expense management",
    applicableProblemTypes: ["planning", "optimization", "evaluation"],
    keywords: ["budget", "expense", "cost", "spending", "financial plan"],
  },
  {
    id: "cfo-cash-flow",
    role: "CFO",
    label: "Cash Flow",
    description: "Liquidity management and cash optimization",
    applicableProblemTypes: ["analysis", "optimization", "troubleshooting"],
    keywords: ["cash flow", "liquidity", "working capital", "cash"],
  },
  {
    id: "cfo-investment",
    role: "CFO",
    label: "Investment",
    description: "Investment analysis and portfolio management",
    applicableProblemTypes: ["evaluation", "decision", "analysis"],
    keywords: ["investment", "portfolio", "return", "asset", "valuation"],
  },
  {
    id: "cfo-risk",
    role: "CFO",
    label: "Risk",
    description: "Financial risk assessment and mitigation",
    applicableProblemTypes: ["analysis", "evaluation", "troubleshooting"],
    keywords: ["risk", "exposure", "volatility", "hedge", "insurance"],
  },
  {
    id: "cfo-scenario-analysis",
    role: "CFO",
    label: "Scenario Analysis",
    description: "What-if modeling and sensitivity analysis",
    applicableProblemTypes: ["analysis", "forecast", "evaluation"],
    keywords: ["scenario", "what-if", "sensitivity", "simulation", "model"],
  },
];

const CMO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "cmo-brand",
    role: "CMO",
    label: "Brand",
    description: "Brand strategy, identity, and positioning",
    applicableProblemTypes: ["strategy", "design", "evaluation"],
    keywords: ["brand", "identity", "positioning", "awareness", "perception"],
  },
  {
    id: "cmo-campaign",
    role: "CMO",
    label: "Campaign",
    description: "Marketing campaign planning and optimization",
    applicableProblemTypes: ["planning", "optimization", "evaluation"],
    keywords: ["campaign", "marketing", "promotion", "advertising", "launch"],
  },
  {
    id: "cmo-growth",
    role: "CMO",
    label: "Growth",
    description: "Customer acquisition and growth strategies",
    applicableProblemTypes: ["strategy", "planning", "analysis"],
    keywords: ["growth", "acquisition", "conversion", "funnel", "retention"],
  },
  {
    id: "cmo-customer",
    role: "CMO",
    label: "Customer",
    description: "Customer experience and relationship management",
    applicableProblemTypes: ["analysis", "design", "evaluation"],
    keywords: ["customer", "experience", "satisfaction", "loyalty", "persona"],
  },
  {
    id: "cmo-positioning",
    role: "CMO",
    label: "Positioning",
    description: "Market positioning and differentiation",
    applicableProblemTypes: ["strategy", "evaluation", "decision"],
    keywords: ["positioning", "differentiation", "market", "segment", "value prop"],
  },
  {
    id: "cmo-market",
    role: "CMO",
    label: "Market",
    description: "Market research and competitive analysis",
    applicableProblemTypes: ["analysis", "forecast", "strategy"],
    keywords: ["market", "competitive", "research", "segment", "share"],
  },
  {
    id: "cmo-pricing",
    role: "CMO",
    label: "Pricing",
    description: "Pricing strategy and revenue optimization",
    applicableProblemTypes: ["strategy", "optimization", "decision"],
    keywords: ["pricing", "price", "revenue", "monetization", "value"],
  },
];

const CAIO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "caio-ai-strategy",
    role: "CAIO",
    label: "AI Strategy",
    description: "High-level AI vision and roadmap",
    applicableProblemTypes: ["strategy", "planning", "decision"],
    keywords: ["AI strategy", "roadmap", "vision", "AI initiative"],
  },
  {
    id: "caio-automation",
    role: "CAIO",
    label: "Automation",
    description: "Process automation and efficiency analysis",
    applicableProblemTypes: ["analysis", "design", "optimization"],
    keywords: ["automation", "efficiency", "workflow", "pipeline"],
  },
  {
    id: "caio-model-selection",
    role: "CAIO",
    label: "Model Selection",
    description: "Model evaluation and selection for tasks",
    applicableProblemTypes: ["evaluation", "decision", "analysis"],
    keywords: ["model", "selection", "LLM", "neural network", "algorithm"],
  },
  {
    id: "caio-agent-design",
    role: "CAIO",
    label: "Agent Design",
    description: "Multi-agent system architecture and coordination",
    applicableProblemTypes: ["design", "planning", "optimization"],
    keywords: ["agent", "multi-agent", "coordination", "autonomous"],
  },
  {
    id: "caio-inference",
    role: "CAIO",
    label: "Inference",
    description: "Model inference optimization and management",
    applicableProblemTypes: ["optimization", "analysis", "troubleshooting"],
    keywords: ["inference", "latency", "throughput", "deployment"],
  },
  {
    id: "caio-knowledge",
    role: "CAIO",
    label: "Knowledge",
    description: "Knowledge representation and reasoning",
    applicableProblemTypes: ["design", "analysis", "optimization"],
    keywords: ["knowledge", "representation", "graph", "embedding"],
  },
  {
    id: "caio-optimization",
    role: "CAIO",
    label: "Optimization",
    description: "AI system performance and resource optimization",
    applicableProblemTypes: ["optimization", "analysis", "evaluation"],
    keywords: ["optimization", "performance", "efficiency", "resource"],
  },
];

const CKO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "cko-knowledge",
    role: "CKO",
    label: "Knowledge",
    description: "Knowledge management and capture strategy",
    applicableProblemTypes: ["strategy", "design", "planning"],
    keywords: ["knowledge", "capture", "management", "information"],
  },
  {
    id: "cko-learning",
    role: "CKO",
    label: "Learning",
    description: "Learning systems and continuous improvement",
    applicableProblemTypes: ["strategy", "design", "evaluation"],
    keywords: ["learning", "improvement", "training", "education"],
  },
  {
    id: "cko-research",
    role: "CKO",
    label: "Research",
    description: "Research methodology and investigation",
    applicableProblemTypes: ["analysis", "diagnosis", "evaluation"],
    keywords: ["research", "investigation", "study", "analysis"],
  },
  {
    id: "cko-documentation",
    role: "CKO",
    label: "Documentation",
    description: "Documentation strategy and information architecture",
    applicableProblemTypes: ["design", "planning", "optimization"],
    keywords: ["documentation", "docs", "information", "knowledge base"],
  },
  {
    id: "cko-ontology",
    role: "CKO",
    label: "Ontology",
    description: "Ontology and taxonomy design",
    applicableProblemTypes: ["design", "analysis", "planning"],
    keywords: ["ontology", "taxonomy", "classification", "schema"],
  },
  {
    id: "cko-taxonomy",
    role: "CKO",
    label: "Taxonomy",
    description: "Knowledge categorization and structure",
    applicableProblemTypes: ["design", "analysis", "optimization"],
    keywords: ["taxonomy", "category", "hierarchy", "structure"],
  },
  {
    id: "cko-knowledge-quality",
    role: "CKO",
    label: "Knowledge Quality",
    description: "Quality assurance for knowledge assets",
    applicableProblemTypes: ["evaluation", "analysis", "optimization"],
    keywords: ["quality", "accuracy", "freshness", "validity"],
  },
];

const COO_MODES: readonly ThinkingModeDef[] = [
  {
    id: "coo-operation",
    role: "COO",
    label: "Operation",
    description: "Day-to-day operational management",
    applicableProblemTypes: ["planning", "optimization", "troubleshooting"],
    keywords: ["operation", "daily", "run", "manage", "execute"],
  },
  {
    id: "coo-process",
    role: "COO",
    label: "Process",
    description: "Process design and improvement",
    applicableProblemTypes: ["design", "optimization", "analysis"],
    keywords: ["process", "workflow", "procedure", "sop"],
  },
  {
    id: "coo-workflow",
    role: "COO",
    label: "Workflow",
    description: "Workflow orchestration and coordination",
    applicableProblemTypes: ["design", "planning", "optimization"],
    keywords: ["workflow", "orchestration", "coordination", "pipeline"],
  },
  {
    id: "coo-execution",
    role: "COO",
    label: "Execution",
    description: "Execution monitoring and delivery management",
    applicableProblemTypes: ["analysis", "troubleshooting", "evaluation"],
    keywords: ["execution", "delivery", "monitoring", "tracking"],
  },
  {
    id: "coo-scaling",
    role: "COO",
    label: "Scaling",
    description: "Operational scaling and capacity planning",
    applicableProblemTypes: ["planning", "optimization", "forecast"],
    keywords: ["scale", "capacity", "growth", "resource planning"],
  },
  {
    id: "coo-resource-allocation",
    role: "COO",
    label: "Resource Allocation",
    description: "Resource distribution and utilization optimization",
    applicableProblemTypes: ["optimization", "planning", "decision"],
    keywords: ["resource", "allocation", "utilization", "capacity"],
  },
  {
    id: "coo-monitoring",
    role: "COO",
    label: "Monitoring",
    description: "Performance monitoring and alerting",
    applicableProblemTypes: ["analysis", "troubleshooting", "evaluation"],
    keywords: ["monitor", "alert", "dashboard", "observability", "metric"],
  },
];

const ALL_MODES: Record<ExecutiveRole, readonly ThinkingModeDef[]> = {
  CEO: CEO_MODES,
  CTO: CTO_MODES,
  CFO: CFO_MODES,
  CMO: CMO_MODES,
  CAIO: CAIO_MODES,
  CKO: CKO_MODES,
  COO: COO_MODES,
};

export function getThinkingModes(role: ExecutiveRole): readonly ThinkingModeDef[] {
  return ALL_MODES[role] ?? [];
}

export function getThinkingModeById(id: ThinkingModeId): ThinkingModeDef | undefined {
  for (const modes of Object.values(ALL_MODES)) {
    const found = modes.find((m) => m.id === id);
    if (found) return found;
  }
  return undefined;
}

export function selectThinkingModes(
  role: ExecutiveRole,
  query: string,
  problemType?: ProblemType,
  maxResults: number = 3,
): readonly ThinkingModeSelection[] {
  const modes = getThinkingModes(role);
  const lowerQuery = query.toLowerCase();

  const scored = modes.map((mode) => {
    let score = 0;
    if (problemType && mode.applicableProblemTypes.includes(problemType)) {
      score += 0.4;
    }
    const matchedKeywords = mode.keywords.filter((kw) => lowerQuery.includes(kw));
    score += (matchedKeywords.length / mode.keywords.length) * 0.6;

    return { mode, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => ({
      modeId: s.mode.id,
      role: s.mode.role,
      label: s.mode.label,
      description: s.mode.description,
      confidence: Math.round(s.score * 100),
    }));
}
