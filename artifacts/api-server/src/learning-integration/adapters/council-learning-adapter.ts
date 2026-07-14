import type { LearningEngine, RetrieveInput, IngestInput, FeedbackInput, UnifiedLearningResult, HealthStatus, LearningCapability } from "../types";
import { CouncilLearningProvider } from "../../executive-council/learning/CouncilLearningProvider";

let idCounter = 0;
function uid(): string { idCounter++; return `cl-${Date.now().toString(36)}-${idCounter}`; }
const caps: LearningCapability[] = ["retrieval", "ingestion", "maintenance", "pattern_detection", "outcome_tracking", "feedback"];

export const councilLearningAdapter: LearningEngine = {
  info: { id: "council-learning", name: "Council Learning Engine", version: "1.0.0", capabilities: caps },

  retrieve(input: RetrieveInput): UnifiedLearningResult[] {
    const results: UnifiedLearningResult[] = [];
    try {
      const outcomes = CouncilLearningProvider.getOutcomes();
      for (const o of outcomes.slice(0, input.maxResults ?? 10)) {
        results.push({
          id: uid(), content: `${o.sessionTitle}: ${o.resolution}`,
          source: "council_learning", originEngine: "council-learning",
          confidence: o.outcome === "success" ? 80 : o.outcome === "failure" ? 40 : 60,
          timestamp: o.recordedAt, importance: 50,
        });
      }
    } catch { /* skip */ }
    return results;
  },

  ingest(_input: IngestInput): void {
    // Council learning via events only
  },

  feedback(input: FeedbackInput): void {
    try {
      const stats = CouncilLearningProvider.getStats();
      // Track feedback as observational metric
    } catch { /* skip */ }
  },

  maintenance(): { actions: number; details: string[] } {
    const details: string[] = [];
    try {
      const stats = CouncilLearningProvider.getStats();
      if (stats.patternsDetected > 0) {
        details.push(`${stats.patternsDetected} patterns detected across ${stats.totalSessions} sessions`);
      }
      details.push(`${stats.trackedOutcomes} outcomes tracked`);
    } catch { /* skip */ }
    return { actions: details.length, details };
  },

  health(): HealthStatus {
    try {
      const stats = CouncilLearningProvider.getStats();
      return {
        status: "healthy", message: `${stats.totalSessions} sessions, ${stats.resolutionRate}% resolution`,
        lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 0,
      };
    } catch {
      return { status: "unavailable", lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 1 };
    }
  },
};
