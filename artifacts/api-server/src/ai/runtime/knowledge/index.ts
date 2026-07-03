// ECP-029: Knowledge Office — public API
// Single entry point for Knowledge Management.

export { knowledgeManager } from "./knowledge-manager";
export { generateSummary } from "./knowledge-summarizer";
export { generateIndex } from "./knowledge-index";
export type {
  KnowledgeArtifact, DetectedPattern, ArchitectureDrift,
  PolicyConflict, KnowledgeSummary, ContextIndex, KnowledgeKPI,
} from "./knowledge-types";
