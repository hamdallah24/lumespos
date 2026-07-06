// RFC-012 Phase 10C: Knowledge Backbone — Executive Knowledge
// Unified Knowledge Access Layer — wraps Executive Memory + Decision History + Mission History.
// Does NOT own storage. Does NOT move files.

import { missionContextRegistry } from "./MissionContextRegistry";
import { artifactRepository } from "../metrics/ArtifactRepository";
import { contextManager } from "../memory/ContextManager";
import { decisionHistoryStore } from "../intelligence/decision-history";
import { missionHistory } from "../mission/MissionHistory";
import { organizationalMemory } from "../intelligence/organizational-memory";
import type { ExecutiveRole } from "../mission/Mission";
import type { KnowledgeBundle, ScopedKnowledge } from "./KnowledgeBundle";
import type { ExecutiveMemoryEntry } from "../memory/ContextManager";

export class KnowledgeBackbone {

  // ── Sub-registries (wrap existing domain modules) ──
  readonly context = missionContextRegistry;
  readonly artifacts = artifactRepository;
  readonly _memory = contextManager;
  readonly _decisions = decisionHistoryStore;
  readonly _history = missionHistory;
  readonly organization = organizationalMemory;

  // ── Executive Memory API ──
  getMemory(executive: string): ExecutiveMemoryEntry {
    return this._memory.getMemory(executive);
  }

  updateMemory(executive: string, updates: Partial<ExecutiveMemoryEntry>): void {
    this._memory.updateMemory(executive, updates);
  }

  summarizeMemory(executive: string): string {
    return this._memory.buildMemoryPrompt(executive);
  }

  allMemories(): Record<string, ExecutiveMemoryEntry> {
    const execs: ExecutiveRole[] = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    const result: Record<string, ExecutiveMemoryEntry> = {};
    for (const e of execs) {
      result[e] = this._memory.getMemory(e);
    }
    return result;
  }

  // ── Decision History API ──
  recordDecision(missionId: string, question: string, participants: string[], alternatives: string[], selected: string) {
    return this._decisions.record(missionId, question, participants as any[], alternatives, selected);
  }

  evaluateDecision(decisionId: string, outcome: "SUCCESS" | "FAILURE", lessons: string[]) {
    this._decisions.evaluate(decisionId, outcome, lessons);
  }

  getDecisionsByMission(missionId: string) {
    return this._decisions.getByMission(missionId);
  }

  // ── Mission History API ──
  explainMission(missionId: string, objectiveId: string): string[] {
    return this._history.explain(missionId, objectiveId);
  }

  getMissionHistory(missionId: string) {
    return this._history.getByMission(missionId);
  }

  /** Strategic Query — CEO receives full mission bundle with real data */
  async query(missionId: string): Promise<KnowledgeBundle> {
    const [contextFiles, artifacts, decisions, histEntries, orgKnowledge, memories] = await Promise.all([
      Promise.resolve(this.context.search("")),
      Promise.resolve(this.artifacts.all()),
      Promise.resolve(this.getDecisionsByMission(missionId)),
      Promise.resolve(this.getMissionHistory(missionId)),
      Promise.resolve(this.organization.all()),
      Promise.resolve(this.allMemories()),
    ]);

    return {
      missionId,
      context: contextFiles,
      artifacts,
      executiveMemory: memories,
      decisions,
      architecture: [],
      capabilities: {},
    };
  }

  /** Operational Query — individual executive retrieves scoped knowledge */
  async getScoped(executive: ExecutiveRole, domain: string, message: string): Promise<ScopedKnowledge> {
    const [contextFiles, memory, decisions] = await Promise.all([
      this.context.getRelevant(domain, message),
      Promise.resolve(this.getMemory(executive)),
      Promise.resolve(this._decisions.getByParticipant(executive)),
    ]);

    return {
      context: contextFiles,
      memory,
      decisions,
      capabilities: [],
    };
  }
}

export const knowledgeBackbone = new KnowledgeBackbone();
