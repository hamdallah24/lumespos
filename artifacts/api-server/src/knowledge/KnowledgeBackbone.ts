// RFC-012 Phase 10C: Knowledge Backbone — Executive Knowledge
// Unified Knowledge Access Layer — wraps Executive Memory + Decision History + Mission History.
// Does NOT own storage. Does NOT move files.

import { missionContextRegistry } from "./MissionContextRegistry";
import { artifactRepository } from "../metrics/ArtifactRepository";
import { contextManager } from "../memory/ContextManager";
import { decisionHistoryStore } from "../intelligence/decision-history";
import { missionHistory } from "../mission/MissionHistory";
import { organizationalMemory } from "../intelligence/organizational-memory";
import { architectureRegistry } from "./ArchitectureRegistry";
import { capabilityRegistry } from "./CapabilityRegistry";
import { findingBuilder } from "../runtime/reasoning/FindingBuilder";
import { findingValidator } from "../runtime/reasoning/FindingValidator";
import type { ExecutiveRole } from "../mission/Mission";
import type { KnowledgeBundle, ScopedKnowledge } from "./KnowledgeBundle";
import type { ExecutiveMemoryEntry } from "../memory/ContextManager";
import type { EvidenceItem, EvidenceGraph, Finding } from "../runtime/EvidenceTypes";
import { createEvidenceId } from "../runtime/EvidenceTypes";

export class KnowledgeBackbone {

  // ── Sub-registries (wrap existing domain modules) ──
  readonly context = missionContextRegistry;
  readonly artifacts = artifactRepository;
  readonly _memory = contextManager;
  readonly _decisions = decisionHistoryStore;
  readonly _history = missionHistory;
  readonly organization = organizationalMemory;
  readonly architecture = architectureRegistry;
  readonly capabilities = capabilityRegistry;

  // ECP-014R: Evidence Registry
  private _evidence: Map<string, EvidenceItem> = new Map();
  private _findings: Finding[] = [];

  /** Append evidence item */
  addEvidence(item: Omit<EvidenceItem, "id">): EvidenceItem {
    const full: EvidenceItem = { ...item, id: createEvidenceId() };
    this._evidence.set(full.id, full);
    return full;
  }

  /** Get evidence by ID */
  getEvidence(id: string): EvidenceItem | null {
    return this._evidence.get(id) ?? null;
  }

  /** Query evidence by type */
  queryEvidence(type?: string, source?: string): EvidenceItem[] {
    let results = [...this._evidence.values()];
    if (type) results = results.filter(e => e.type === type);
    if (source) results = results.filter(e => e.source.includes(source));
    return results;
  }

  /** Build evidence graph from stored evidence */
  buildEvidenceGraph(): EvidenceGraph {
    return findingBuilder.buildGraph([...this._evidence.values()]);
  }

  /** Trace evidence chain for a finding */
  traceEvidence(finding: Finding): EvidenceItem[] {
    return finding.evidenceIds.map(id => this._evidence.get(id)).filter(Boolean) as EvidenceItem[];
  }

  /** Store finding */
  addFinding(finding: Finding): void {
    this._findings.push(finding);
  }

  /** Get all findings */
  getFindings(): Finding[] {
    return [...this._findings];
  }

  /** Clear mission-scoped evidence */
  clearEvidence(): void {
    this._evidence.clear();
    this._findings = [];
  }

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
      architecture: this.architecture.rules(),
      capabilities: this.capabilities.all().reduce((acc, c) => { acc[c.role] = c.tools; return acc; }, {} as Record<string, string[]>),
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
      capabilities: this.capabilities.getTools(executive),
    };
  }
}

export const knowledgeBackbone = new KnowledgeBackbone();
