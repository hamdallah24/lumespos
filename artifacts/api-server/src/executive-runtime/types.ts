import type { COOContext, CFOContext, MarketingContext, PeopleContext, IntelligenceContext, CompanyContext, KnowledgeContext, EngineeringContext } from '../executive-context/types';

export interface BusinessEvidence {
  healthScore?: number;
  forecast?: { metric: string; value: number }[];
  benchmarks?: { entity: string; score: number; rank: number }[];
  alerts?: { kpi: string; severity: string; message: string }[];
  trends?: { metric: string; direction: string; changePct: number }[];
}

export interface DecisionObject {
  decisionId: string;
  executive: string;
  confidence: number;
  reasoning: string;
  action: string | null;
  parameters: Record<string, any>;
  risks: { type: string; severity: string; description: string }[];
  recommendation: string;
  requiresApproval: boolean;
  priority: "low" | "normal" | "high" | "critical";
  businessEvidence?: BusinessEvidence;
}

export interface ExecutiveTask<TContext = any> {
  message: string;
  userId: number;
  branchId?: number;
  context: TContext;
  confidence: number;
  intent: string;
  domain: string;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: string; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: unknown) => void;
}

export interface ExecutiveResult {
  success: boolean;
  text: string;
  decision: DecisionObject | null;
  pipeline: string[];
}

export type CEOContext = CompanyContext;
export type COOTask = ExecutiveTask<COOContext>;
export type CFOTask = ExecutiveTask<CFOContext>;
export type CMOTask = ExecutiveTask<MarketingContext>;
export type CHROTask = ExecutiveTask<PeopleContext>;
export type CAIOTask = ExecutiveTask<IntelligenceContext>;
export type CEOTask = ExecutiveTask<CompanyContext>;
export type CKOTask = ExecutiveTask<KnowledgeContext>;
export type CTOTask = ExecutiveTask<EngineeringContext>;
