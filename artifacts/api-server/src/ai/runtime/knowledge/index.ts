// ECP-028/029/029.5: Knowledge Pipeline — public API
// Mission Engine → Knowledge Queue → Knowledge Office → Knowledge Governance → Consultant

// Core knowledge management
export { knowledgeManager } from "./knowledge-manager";
export { knowledgeQueue, KnowledgeQueue } from "./knowledge-queue";
export { knowledgeGovernor } from "./knowledge-governor";

// Summarization
export { generateSummary } from "./knowledge-summarizer";
export { generateIndex } from "./knowledge-index";

// Knowledge Governance sub-systems
export { lifecycleManager } from "./knowledge-lifecycle";
export { confidenceEngine } from "./knowledge-confidence";
export { deduplicator } from "./knowledge-deduplicator";
export { contradictionDetector } from "./knowledge-contradiction";
export { ranker } from "./knowledge-ranker";
export { promoter } from "./knowledge-promoter";
export { archiveManager } from "./knowledge-archive";
export { knowledgeGraph } from "./knowledge-graph";

// Consultant infrastructure
export { consultantCache } from "./consultant-cache";
export { proposalGenerator } from "./foundation-proposal";

// Cards
export { createCard, promoteCard, touchCard } from "./knowledge-card";
export type { KnowledgeCard, KnowledgeLifecycle } from "./knowledge-card";

// Types
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
