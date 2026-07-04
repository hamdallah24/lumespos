// ADR-009: Metrics Types — All shared types for the metrics domain

export interface EvidenceScore {
  quality: number;
  uniqueFiles: number;
  toolDiversity: number;
  toolsSucceeded: number;
  toolsFailed: number;
  confidence: number;
  strength: "strong" | "moderate" | "weak";
}

export interface MissionProgress {
  objectivesTotal: number;
  objectivesCompleted: number;
  objectivesRunning: number;
  objectivesBlocked: number;
  objectivesFailed: number;
  objectivesWaiting: number;
  progress: number;
  currentObjective: string;
}

export interface Artifact {
  id: string;
  type: "file" | "search_result" | "command_output" | "reflection" | "verification" | "tool_output";
  source: string;
  producer: string;
  payload: string;
  verified: boolean;
  checksum: string;
  createdAt: string;
  metadata: {
    lines?: number;
    files?: number;
    symbols?: number;
    durationMs?: number;
  };
}

export interface ConfidenceConfig {
  version: string;
  createdAt: string;
  createdBy: string;
  description: string;
  weights: {
    evidence: number;
    verification: number;
    reflection: number;
    consistency: number;
  };
}

export interface MetricSSEEvent {
  type: "execution_update" | "mission_update" | "evidence_update";
  schemaVersion: number;
  timestamp: string;
  missionId: string;
  payload: any;
}

let _artifactCounter = 0;

export function createArtifactId(): string { _artifactCounter++; return `ART-${Date.now().toString(36)}-${_artifactCounter}`; }
