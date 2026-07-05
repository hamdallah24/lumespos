// RFC-012 Phase 10: Knowledge Backbone
// Unified Knowledge Access Layer — single entry point for all executives.
// Wraps existing registries. Does NOT own storage. Does NOT move files.

import { missionContextRegistry } from "./MissionContextRegistry";
import { artifactRepository } from "../metrics/ArtifactRepository";
import { contextManager } from "../memory/ContextManager";
import { decisionHistoryStore } from "../intelligence/decision-history";
import { missionHistory } from "../mission/MissionHistory";
import { organizationalMemory } from "../intelligence/organizational-memory";
import type { ExecutiveRole } from "../mission/Mission";
import type { KnowledgeBundle, ScopedKnowledge } from "./KnowledgeBundle";

export class KnowledgeBackbone {

  // ── Sub-registries (wrap existing domain modules) ──
  readonly context = missionContextRegistry;
  readonly artifacts = artifactRepository;
  readonly memory = contextManager;
  readonly decisions = decisionHistoryStore;
  readonly history = missionHistory;
  readonly organization = organizationalMemory;

  /** Strategic Query — CEO receives full mission bundle */
  async query(missionId: string): Promise<KnowledgeBundle> {
    const [contextFiles, artifacts, decisions, histEntries, orgKnowledge] = await Promise.all([
      Promise.resolve(this.context.search("")),
      Promise.resolve(this.artifacts.all()),
      Promise.resolve(this.decisions.search("")),
      Promise.resolve(this.history.getByMission(missionId)),
      Promise.resolve(this.organization.all()),
    ]);

    return {
      missionId,
      context: contextFiles,
      artifacts,
      executiveMemory: {},
      decisions,
      architecture: [],
      capabilities: {},
    };
  }

  /** Operational Query — individual executive retrieves scoped knowledge */
  async getScoped(executive: ExecutiveRole, domain: string, message: string): Promise<ScopedKnowledge> {
    const [contextFiles, memory] = await Promise.all([
      this.context.getRelevant(domain, message),
      Promise.resolve(this.memory.getMemory(executive)),
    ]);

    return {
      context: contextFiles,
      memory,
      decisions: [],
      capabilities: [],
    };
  }
}

export const knowledgeBackbone = new KnowledgeBackbone();
