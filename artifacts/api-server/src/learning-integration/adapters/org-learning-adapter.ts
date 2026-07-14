import type { LearningEngine, RetrieveInput, IngestInput, FeedbackInput, UnifiedLearningResult, HealthStatus, LearningCapability } from "../types";
import { learningEngine } from "../../learning/learning-engine";
import { knowledgeGraph } from "../../learning/knowledge-graph";
import { knowledgeQueue } from "../../learning/knowledge-queue";

let idCounter = 0;
function uid(): string { idCounter++; return `ol-${Date.now().toString(36)}-${idCounter}`; }
const caps: LearningCapability[] = ["retrieval", "ingestion", "maintenance", "pattern_detection"];

export const orgLearningAdapter: LearningEngine = {
  info: { id: "org-learning", name: "Organization Learning Engine", version: "1.0.0", capabilities: caps },

  retrieve(input: RetrieveInput): UnifiedLearningResult[] {
    const results: UnifiedLearningResult[] = [];
    try {
      const domain = input.domain ?? "general";
      const nodes = knowledgeGraph.findByDomain(domain);
      for (const n of nodes.slice(0, input.maxResults ?? 10)) {
        results.push({
          id: uid(), content: n.content, source: "org_learning", originEngine: "org-learning",
          confidence: n.confidence, timestamp: n.learnedAt, executive: n.source.executive,
          domain: n.domain, importance: (n.reinforced ?? 1) * 10,
        });
      }
    } catch { /* skip */ }
    return results;
  },

  ingest(input: IngestInput): void {
    try {
      knowledgeQueue.enqueue(input.content, (input.executive ?? "CEO") as any);
    } catch { /* skip */ }
  },

  feedback(_input: FeedbackInput): void {
    // NOT_SUPPORTED — Org Learning requires full mission context
  },

  maintenance(): { actions: number; details: string[] } {
    const details: string[] = [];
    try {
      const result = learningEngine.autoCycle();
      details.push(`Processed ${result.decisionsAnalyzed} queue items`);
    } catch { /* skip */ }
    return { actions: details.length, details };
  },

  health(): HealthStatus {
    try {
      const stats = learningEngine.stats();
      return { status: "healthy", message: `${stats.organization.executives} executives tracked`, lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 0 };
    } catch {
      return { status: "unavailable", lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: caps, errors: 1 };
    }
  },
};
