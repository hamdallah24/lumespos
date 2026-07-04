// ECP-044 Sprint 1: Executive Memory
// Isolated per-executive memory. Never shared directly between executives.

import type { ExecutiveMemory, ExecutiveRole, MemoryScope } from "./learning-types";

const SCOPE_MAP: Record<ExecutiveRole, MemoryScope> = {
  CEO: "STRATEGY",
  CTO: "ARCHITECTURE",
  COO: "OPERATIONS",
  CFO: "FINANCE",
  CMO: "MARKETING",
  CHRO: "HR",
  CIO: "DATA",
};

export class ExecutiveMemoryStore {
  private memories: Map<string, ExecutiveMemory> = new Map();

  /** Initialize memory for an executive */
  init(role: ExecutiveRole, executiveId: string): ExecutiveMemory {
    const memory: ExecutiveMemory = {
      executiveId,
      role,
      scope: SCOPE_MAP[role] || "OPERATIONS",
      experiences: [],
      knowledgeNodes: [],
      statistics: { missions: 0, success: 0, failures: 0, confidence: 0 },
      lastAccessed: new Date().toISOString(),
    };
    this.memories.set(executiveId, memory);
    return memory;
  }

  /** Get or create memory */
  get(executiveId: string, role: ExecutiveRole): ExecutiveMemory {
    const existing = this.memories.get(executiveId);
    if (existing) {
      existing.lastAccessed = new Date().toISOString();
      return existing;
    }
    return this.init(role, executiveId);
  }

  /** Record an experience ID in memory */
  addExperience(executiveId: string, experienceId: string): void {
    const mem = this.memories.get(executiveId);
    if (mem && !mem.experiences.includes(experienceId)) {
      mem.experiences.push(experienceId);
    }
  }

  /** Record a knowledge node in memory */
  addKnowledge(executiveId: string, nodeId: string): void {
    const mem = this.memories.get(executiveId);
    if (mem && !mem.knowledgeNodes.includes(nodeId)) {
      mem.knowledgeNodes.push(nodeId);
    }
  }

  /** Update statistics after mission */
  recordOutcome(executiveId: string, success: boolean, confidence: number): void {
    const mem = this.memories.get(executiveId);
    if (!mem) return;
    mem.statistics.missions++;
    if (success) mem.statistics.success++;
    else mem.statistics.failures++;
    // Rolling confidence average
    const n = mem.statistics.missions;
    mem.statistics.confidence = ((mem.statistics.confidence * (n - 1)) + confidence) / n;
    mem.lastAccessed = new Date().toISOString();
  }

  /** Get memory stats for an executive */
  getStats(executiveId: string): ExecutiveMemory["statistics"] | null {
    const mem = this.memories.get(executiveId);
    if (!mem) return null;
    return { ...mem.statistics };
  }

  /** List all memories */
  list(): ExecutiveMemory[] {
    return [...this.memories.values()];
  }
}

export const executiveMemoryStore = new ExecutiveMemoryStore();
