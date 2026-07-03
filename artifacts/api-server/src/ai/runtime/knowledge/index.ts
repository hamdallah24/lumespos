// ECP-028/029: Knowledge Office + Mission Pipeline — public API
// Mission Engine produces events → Knowledge Queue → Knowledge Office → Consultant

export { knowledgeManager } from "./knowledge-manager";
export { knowledgeQueue } from "./knowledge-queue";
export { generateSummary } from "./knowledge-summarizer";
export { generateIndex } from "./knowledge-index";

export type {
  KnowledgeArtifact, DetectedPattern, ArchitectureDrift,
  PolicyConflict, KnowledgeSummary, ContextIndex, KnowledgeKPI,
} from "./knowledge-types";

export type {
  MissionEvent, MissionCompletedEvent, MissionFailedEvent,
  MissionTimeoutEvent, MissionAbortedEvent, MissionDelegatedEvent,
  MissionRetriedEvent, MissionMetrics, MissionArtifact,
} from "./mission-event";

export { isCompletedEvent, isFailedEvent, isTerminalEvent } from "./mission-event";
