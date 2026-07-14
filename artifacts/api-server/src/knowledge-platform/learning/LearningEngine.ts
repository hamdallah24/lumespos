import { knowledgeBase } from "../core";
import type { KnowledgeBlock, OutcomeStatus } from "../core/types";
import { ConfidenceAdjuster } from "./ConfidenceAdjuster";
import { PatternPromoter } from "./PatternPromoter";
import { DeprecationEngine } from "./DeprecationEngine";

export interface LearningEvent {
  type: "confidence_adjusted" | "promoted" | "deprecated" | "archived";
  blockId: string;
  outcome?: OutcomeStatus;
  timestamp: string;
}

export class LearningEngine {
  private listeners: Array<(event: LearningEvent) => void> = [];
  private cycleCount = 0;

  onEvent(fn: (event: LearningEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(event: LearningEvent): void {
    for (const fn of this.listeners) fn(event);
  }

  processOutcome(blockId: string, outcome: OutcomeStatus): void {
    const block = knowledgeBase.get(blockId);
    if (!block) return;

    const newConfidence = ConfidenceAdjuster.adjust(block, outcome);
    knowledgeBase.update(blockId, {
      confidence: newConfidence,
      lastObserved: new Date().toISOString(),
      lastOutcome: outcome,
      recurrence: block.recurrence + 1,
    });

    this.emit({ type: "confidence_adjusted", blockId, outcome, timestamp: new Date().toISOString() });

    const promoted = PatternPromoter.evaluate(block);
    if (promoted) this.emit({ type: "promoted", blockId, timestamp: new Date().toISOString() });

    const deprecated = DeprecationEngine.evaluate(block);
    if (deprecated) this.emit({ type: "deprecated", blockId, timestamp: new Date().toISOString() });
  }

  runMaintenance(): { promoted: string[]; deprecated: string[]; archived: string[] } {
    const promoted = PatternPromoter.evaluateAll();
    for (const id of promoted) this.emit({ type: "promoted", blockId: id, timestamp: new Date().toISOString() });

    const deprecated = DeprecationEngine.evaluateAll();
    for (const id of deprecated) this.emit({ type: "deprecated", blockId: id, timestamp: new Date().toISOString() });

    const archived = DeprecationEngine.archiveUnused();
    for (const id of archived) this.emit({ type: "archived", blockId: id, timestamp: new Date().toISOString() });

    this.cycleCount++;
    return { promoted, deprecated, archived };
  }

  getStats() {
    const all = knowledgeBase.getAll();
    return {
      total: all.length,
      semantic: all.filter(b => b.type === "semantic").length,
      episode: all.filter(b => b.type === "episode").length,
      procedural: all.filter(b => b.type === "procedural").length,
      confirmed: all.filter(b => b.status === "confirmed").length,
      deprecated: all.filter(b => b.status === "deprecated").length,
      archived: all.filter(b => b.status === "archived").length,
      cycleCount: this.cycleCount,
    };
  }
}

export const learningEngine = new LearningEngine();
