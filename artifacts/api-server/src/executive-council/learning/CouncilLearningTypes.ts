export type LearningOutcome = "success" | "failure" | "partial" | "unknown";

export interface CouncilOutcomeRecord {
  sessionId: string;
  sessionTitle: string;
  outcome: LearningOutcome;
  resolution: string;
  executiveCount: number;
  approvalCount: number;
  rejectionCount: number;
  abstainCount: number;
  durationMs: number;
  notes?: string;
  recordedAt: string;
}

export interface CouncilPattern {
  id: string;
  type: "alignment" | "conflict" | "escalation_trend" | "resolution_style" | "effectiveness";
  label: string;
  description: string;
  sessionIds: string[];
  triggerCount: number;
  confidence: number;
  detectedAt: string;
}

export interface ExecutiveAlignment {
  executiveA: string;
  executiveB: string;
  alignmentRate: number;
  sessionCount: number;
  commonPositions: string[];
}

export interface CouncilLearningStats {
  totalSessions: number;
  trackedOutcomes: number;
  patternsDetected: number;
  averageDurationMs: number;
  resolutionRate: number;
  escalationRate: number;
  topAlignments: ExecutiveAlignment[];
}
