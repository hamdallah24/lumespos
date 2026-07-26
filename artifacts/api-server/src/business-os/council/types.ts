export type CouncilStatus = "CREATED" | "WAITING" | "DISCUSSING" | "CONSENSUS" | "VOTING" | "EXECUTING" | "FINISHED" | "CANCELLED";
export type AgendaStatus = "pending" | "discussing" | "resolved" | "skipped";
export type VoteType = "simple_majority" | "weighted" | "unanimous" | "founder_override";
export type MeetingType = "daily_brief" | "weekly_meeting" | "monthly_review" | "quarter_review" | "year_planning" | "emergency" | "manual";
export type MemoryCategory = "strategic" | "risk" | "failure" | "success" | "expansion" | "finance" | "people";

export interface CouncilAgendaItem {
  id: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "critical";
  status: AgendaStatus;
  requiredExecutives: string[];
  discussion: CouncilOpinion[];
  resolvedAt?: string;
  resolution?: string;
}

export interface CouncilMember {
  executive: string;
  present: boolean;
  votingWeight: number;
  required: boolean;
  responsibility: string;
  joinedAt?: string;
}

export interface CouncilOpinion {
  id: string;
  executive: string;
  agendaItemId: string;
  opinion: string;
  reasoning: string;
  evidence: string;
  confidence: number;
  recommendation: string;
  risks: string[];
  alternatives: string[];
  submittedAt: string;
}

export interface CouncilVote {
  id: string;
  agendaItemId: string;
  voteType: VoteType;
  votes: { executive: string; choice: "approve" | "reject" | "abstain"; weight: number; reason?: string }[];
  result: "approved" | "rejected" | "tie";
  tally: { approve: number; reject: number; abstain: number; weightedApprove: number; weightedReject: number };
  finishedAt: string;
}

export interface CorporateDecision {
  decisionId: string;
  sessionId: string;
  agendaItemId: string;
  title: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  risks: string[];
  executives: string[];
  confidence: number;
  priority: "low" | "normal" | "high" | "critical";
  requiresApproval: boolean;
  approvalLevel?: string;
  dissenting: string[];
  executionPlan?: { action: string; responsible: string; dueDate?: string; parameters: Record<string, unknown> }[];
  createdAt: string;
}

export interface CouncilSession {
  sessionId: string;
  title: string;
  reason: string;
  trigger: string;
  meetingType: MeetingType;
  status: CouncilStatus;
  executives: CouncilMember[];
  agenda: CouncilAgendaItem[];
  decisions: CorporateDecision[];
  votes: CouncilVote[];
  summary?: CouncilSummaryData;
  confidence: number;
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface CouncilSummaryData {
  sessionId: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  agendaCount: number;
  resolvedCount: number;
  decisions: { title: string; decision: string; confidence: number }[];
  keyRisks: string[];
  actionItems: { action: string; responsible: string; dueDate?: string }[];
  nextMeeting?: string;
  generatedAt: string;
}

export interface CouncilMetricsData {
  totalSessions: number;
  totalDecisions: number;
  avgConfidence: number;
  avgDurationMs: number;
  consensusRate: number;
  votingRate: number;
  dissentRate: number;
  decisionsExecuted: number;
  decisionsPending: number;
  topAgendaTopics: { topic: string; count: number }[];
  updatedAt: string;
}

export interface CouncilHistoryEntry {
  sessionId: string;
  title: string;
  date: string;
  status: CouncilStatus;
  participants: string[];
  agendaCount: number;
  decisionCount: number;
  summary?: string;
}
