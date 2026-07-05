// RFC-012 Phase 10: Knowledge Bundle — contract for strategic CEO queries

import type { Artifact } from "../metrics/MetricTypes";
import type { ExecutiveMemoryEntry } from "../memory/ContextManager";
import type { MissionHistoryEntry } from "../mission/Mission";
import type { DecisionHistory } from "../intelligence/intelligence-types";

export interface FileIndex {
  path: string;
  name: string;
  ext: string;
  directory: string;
}

export interface KnowledgeBundle {
  missionId: string;
  context: FileIndex[];
  artifacts: Artifact[];
  executiveMemory: Record<string, ExecutiveMemoryEntry>;
  decisions: DecisionHistory[];
  architecture: string[];
  capabilities: Record<string, string[]>;
}

export interface ScopedKnowledge {
  context: FileIndex[];
  memory: ExecutiveMemoryEntry | null;
  decisions: DecisionHistory[];
  capabilities: string[];
}
