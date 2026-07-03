// ECP-028: Mission Events — produced by Mission Engine, consumed by Knowledge Office
// Frozen. Mission Engine emits these events. Knowledge Office processes them.
// Mission Engine does NOT know about Knowledge Office. Loose coupling.

export interface MissionArtifact {
  id: string;
  missionId: string;
  title: string;
  type: "report" | "timeline" | "decision" | "delegation" | "verification" | "kpi" | "failure";
  content: string;
  timestamp: string;
  runtime: string;
  tags: string[];
  confidence: number;
}

export interface MissionMetrics {
  missionId: string;
  title: string;
  runtime: string;
  status: "completed" | "failed" | "timeout" | "aborted";
  durationMs: number;
  tokensUsed: number;
  toolsCalled: number;
  cyclesExecuted: number;
  delegationCount: number;
  verificationPassed: boolean;
  completionProgress: number;
  stopReason: string;
}

export interface MissionCompletedEvent {
  type: "MISSION_COMPLETED";
  missionId: string;
  title: string;
  runtime: string;
  timestamp: string;
  metrics: MissionMetrics;
  artifacts: MissionArtifact[];
  lessonsLearned: string[];
  decisions: string[];
}

export interface MissionFailedEvent {
  type: "MISSION_FAILED";
  missionId: string;
  title: string;
  runtime: string;
  timestamp: string;
  reason: string;
  metrics: MissionMetrics;
  failureAnalysis: string;
}

export interface MissionTimeoutEvent {
  type: "MISSION_TIMEOUT";
  missionId: string;
  title: string;
  runtime: string;
  timestamp: string;
  elapsedMs: number;
  budgetLimit: number;
  metrics: MissionMetrics;
}

export interface MissionAbortedEvent {
  type: "MISSION_ABORTED";
  missionId: string;
  title: string;
  runtime: string;
  timestamp: string;
  abortedBy: string;
  reason: string;
  metrics: MissionMetrics;
}

export interface MissionDelegatedEvent {
  type: "MISSION_DELEGATED";
  missionId: string;
  title: string;
  from: string;
  to: string;
  timestamp: string;
  capability: string;
  priority: string;
}

export interface MissionRetriedEvent {
  type: "MISSION_RETRIED";
  missionId: string;
  title: string;
  runtime: string;
  timestamp: string;
  attempt: number;
  previousReason: string;
}

export type MissionEvent =
  | MissionCompletedEvent
  | MissionFailedEvent
  | MissionTimeoutEvent
  | MissionAbortedEvent
  | MissionDelegatedEvent
  | MissionRetriedEvent;

export function isCompletedEvent(e: MissionEvent): e is MissionCompletedEvent { return e.type === "MISSION_COMPLETED"; }
export function isFailedEvent(e: MissionEvent): e is MissionFailedEvent { return e.type === "MISSION_FAILED"; }
export function isTerminalEvent(e: MissionEvent): boolean {
  return ["MISSION_COMPLETED", "MISSION_FAILED", "MISSION_TIMEOUT", "MISSION_ABORTED"].includes(e.type);
}
