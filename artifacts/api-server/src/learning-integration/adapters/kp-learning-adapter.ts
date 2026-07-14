import type { LearningEngine, RetrieveInput, IngestInput, FeedbackInput, UnifiedLearningResult, HealthStatus, LearningCapability } from "../types";
import { KnowledgeProvider } from "../../knowledge-platform/providers/KnowledgeProvider";

let idCounter = 0;
function uid(): string { idCounter++; return `kp-${Date.now().toString(36)}-${idCounter}`; }
const caps: LearningCapability[] = ["retrieval", "ingestion", "maintenance", "confidence_adjustment", "outcome_tracking", "feedback"];

export const kpLearningAdapter: LearningEngine = {
  info: { id: "kp-learning", name: "Knowledge Platform Learning Engine", version: "1.0.0", capabilities: caps },

  retrieve(input: RetrieveInput): UnifiedLearningResult[] {
    const results: UnifiedLearningResult[] = [];
    try {
      const blocks = input.query
        ? KnowledgeProvider.searchAll(input.query)
        : KnowledgeProvider.getByDomain(input.domain ?? "general");
      for (const b of blocks.slice(0, input.maxResults ?? 10)) {
        results.push({
          id: uid(), content: b.summary, source: b.type === "semantic" ? "semantic" : b.type === "episode" ? "episode" : "procedural",
          originEngine: "kp-learning", confidence: b.confidence, timestamp: b.lastObserved,
          domain: b.domain, importance: b.importance,
        });
      }
    } catch { /* skip */ }
    return results;
  },

  ingest(input: IngestInput): void {
    try {
      KnowledgeProvider.ingestEpisode({
        eventType: "learning_ingest", eventId: `li-${Date.now()}`,
        context: input.content.slice(0, 500), outcome: (input.outcome as any) ?? "success",
        domain: input.domain ?? "general", topic: input.content.slice(0, 100),
        summary: input.content.slice(0, 200),
      });
    } catch { /* skip */ }
  },

  feedback(input: FeedbackInput): void {
    try {
      const matching = KnowledgeProvider.getByDomain(input.domain ?? "general");
      const outcome = input.outcome === "success" ? "success" as const : input.outcome === "failure" ? "failure" as const : "partial" as const;
      for (const block of matching.slice(0, 5)) {
        KnowledgeProvider.recordOutcome(block.id, outcome);
      }
    } catch { /* skip */ }
  },

  maintenance(): { actions: number; details: string[] } {
    const details: string[] = [];
    try {
      const outcomes = KnowledgeProvider.processEpisodeOutcomes();
      details.push(`Processed ${outcomes} episode outcomes`);
    } catch { /* skip */ }
    try {
      const result = KnowledgeProvider.runMaintenance();
      details.push(`Promoted: ${result.promoted.length}, Deprecated: ${result.deprecated.length}, Archived: ${result.archived.length}`);
    } catch { /* skip */ }
    return { actions: details.length, details };
  },

  health(): HealthStatus {
    try {
      const stats = KnowledgeProvider.getStats();
      return { status: "healthy", message: `${stats.total} blocks`, lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 0 };
    } catch {
      return { status: "unavailable", lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 1 };
    }
  },
};
