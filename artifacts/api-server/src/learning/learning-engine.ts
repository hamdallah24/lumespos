// ECP-044 Sprint 6: Learning Engine
// Orchestrates the entire organizational learning cycle.
// Single owner of learning process. All modules feed through here.

import type { ExecutiveRole, Experience, Reflection, KnowledgeNode, LearningEvent } from "./learning-types";
import { experienceEngine } from "./experience-engine";
import { reflectionEngine } from "./reflection-engine";
import { knowledgeEngine } from "./knowledge-engine";
import { knowledgeGraph } from "./knowledge-graph";
import { memoryIndex } from "./memory-index";
import { executiveMemoryStore } from "./executive-memory";
import { knowledgeQueue } from "./knowledge-queue";
import type { ExperienceInput } from "./experience-engine";

export class LearningEngine {
  private listeners: Array<(event: LearningEvent) => void> = [];

  onEvent(fn: (event: LearningEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(event: LearningEvent): void {
    for (const fn of this.listeners) fn(event);
  }

  /**
   * Full learning cycle after mission completion.
   * Experience → Reflection → Knowledge → Graph → Index → Memory
   */
  cycle(
    missionId: string,
    objective: string,
    executive: ExecutiveRole,
    executiveId: string,
    outcome: { success: boolean; duration: number; tokenUsage: number; toolUsage: number; confidence: number; lessons: string[] },
  ): { experience: Experience; reflection: Reflection; knowledgeNodes: KnowledgeNode[] } {
    // Enqueue for async processing
    knowledgeQueue.enqueue(missionId, executive);

    // Stage 1: Create Experience
    const input: ExperienceInput = {
      missionId,
      executive,
      outcome: outcome.success ? "SUCCESS" : outcome.confidence > 50 ? "PARTIAL" : "FAILURE",
      duration: outcome.duration,
      tokenUsage: outcome.tokenUsage,
      toolUsage: outcome.toolUsage,
      confidence: outcome.confidence,
      lessons: outcome.lessons,
    };
    const experience = experienceEngine.record(input);
    this.emit({ type: "EXPERIENCE_CREATED", missionId, executive, timestamp: new Date().toISOString() });

    // Stage 2: Reflect
    const reflection = reflectionEngine.reflect(experience, objective);
    this.emit({ type: "REFLECTION_COMPLETE", missionId, executive, timestamp: new Date().toISOString() });

    // Stage 3: Synthesize Knowledge
    const newNodes = knowledgeEngine.synthesize(reflection, executive, missionId, experience.id);

    // Stage 4: Merge into graph (reinforce existing or add new)
    const existing = knowledgeGraph.findByExecutive(executive);
    const merged = knowledgeEngine.merge(existing, newNodes);

    for (const node of merged) {
      knowledgeGraph.addNode(node);
      memoryIndex.add(node);
    }
    this.emit({ type: "KNOWLEDGE_ADDED", missionId, executive, timestamp: new Date().toISOString(), metadata: { count: merged.length } });

    // Stage 5: Auto-link domain nodes
    const linked = knowledgeGraph.autoLink(
      newNodes.length > 0 ? newNodes[0].domain : "general"
    );
    this.emit({ type: "GRAPH_UPDATED", missionId, executive, timestamp: new Date().toISOString(), metadata: { linked } });

    // Stage 6: Update Executive Memory
    const memory = executiveMemoryStore.get(executiveId, executive);
    for (const node of merged) {
      executiveMemoryStore.addKnowledge(executiveId, node.id);
    }
    executiveMemoryStore.addExperience(executiveId, experience.id);
    executiveMemoryStore.recordOutcome(executiveId, outcome.success, outcome.confidence);
    this.emit({ type: "MEMORY_UPDATED", missionId, executive, timestamp: new Date().toISOString() });

    // Stage 7: Complete queue item
    const queueItem = knowledgeQueue.dequeue();
    if (queueItem) knowledgeQueue.complete(queueItem.id);

    this.emit({ type: "CYCLE_COMPLETE", missionId, executive, timestamp: new Date().toISOString() });

    return { experience, reflection, knowledgeNodes: merged };
  }

  /** Get organization learning stats */
  stats() {
    const memories = executiveMemoryStore.list();
    const graphStats = knowledgeGraph.stats();
    const indexStats = memoryIndex.stats();

    const totalMissions = memories.reduce((s, m) => s + m.statistics.missions, 0);
    const totalSuccess = memories.reduce((s, m) => s + m.statistics.success, 0);
    const totalFailures = memories.reduce((s, m) => s + m.statistics.failures, 0);

    return {
      organization: {
        totalMissions,
        successRate: totalMissions > 0 ? Math.round((totalSuccess / totalMissions) * 100) : 0,
        failureRate: totalMissions > 0 ? Math.round((totalFailures / totalMissions) * 100) : 0,
        executives: memories.length,
      },
      graph: graphStats,
      index: indexStats,
      queue: {
        pending: knowledgeQueue.pendingCount(),
        processing: knowledgeQueue.processingCount(),
      },
    };
  }
}

export const learningEngine = new LearningEngine();
