export interface DecisionEntry {
  id: string;
  traceId: string;
  runtime: string;
  timestamp: string;
  type: "delegation" | "strategy" | "completion" | "error" | "approval";
  description: string;
  confidence: number;
  evidence: string[];
  missionId?: string;
  knowledgeCardIds: string[];
  consultedCKO: boolean;
}

export interface RuntimeKPISnapshot {
  runtime: string;
  avgLatencyMs: number;
  delegationRate: number;
  verificationPassRate: number;
  avgConfidence: number;
  avgTokens: number;
  missionCount: number;
  lastActive: string;
  status: "healthy" | "degraded" | "idle" | "offline";
}

export interface MissionTimeline {
  missionId: string;
  title: string;
  runtime: string;
  events: { timestamp: string; event: string; detail: string }[];
  status: string;
  durationMs: number;
  decisions: string[];
}

export interface OrganizationDashboard {
  generatedAt: string;
  healthScore: number;
  missions: { running: number; completed: number; failed: number };
  runtimes: RuntimeKPISnapshot[];
  knowledge: { totalCards: number; bestPractices: number; foundationCandidates: number };
  tokens: { todayTotal: number; avgPerRequest: number; compressionRate: number };
  recentTraces: string[];
}
