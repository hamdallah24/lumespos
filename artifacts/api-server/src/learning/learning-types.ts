// ECP-044: Learning Types — Shared types for Organizational Learning System
// All types are read-only contracts between learning modules.

export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CHRO" | "CIO";

export type OutcomeStatus = "SUCCESS" | "FAILURE" | "PARTIAL";

export type NodeType = "PATTERN" | "BUG" | "SOLUTION" | "INSIGHT" | "WARNING";

export type MemoryScope = "STRATEGY" | "ARCHITECTURE" | "OPERATIONS" | "FINANCE" | "MARKETING" | "HR" | "DATA";

// ── Experience ──

export interface Experience {
  id: string;
  missionId: string;
  executive: ExecutiveRole;
  outcome: OutcomeStatus;
  duration: number;
  tokenUsage: number;
  toolUsage: number;
  confidence: number;
  lessons: string[];
  createdAt: string;
}

// ── Reflection ──

export interface Reflection {
  id: string;
  experienceId: string;
  missionObjective: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  newPatterns: string[];
  createdAt: string;
}

// ── Knowledge ──

export interface KnowledgeNode {
  id: string;
  domain: string;
  type: NodeType;
  content: string;
  confidence: number;
  source: {
    executive: ExecutiveRole;
    missionId: string;
    experienceId: string;
  };
  relatesTo: string[];
  learnedAt: string;
  reinforced: number;
}

// ── Executive Memory ──

export interface ExecutiveMemory {
  executiveId: string;
  role: ExecutiveRole;
  scope: MemoryScope;
  experiences: string[];
  knowledgeNodes: string[];
  statistics: {
    missions: number;
    success: number;
    failures: number;
    confidence: number;
  };
  lastAccessed: string;
}

// ── Retrieval ──

export interface RetrievalResult {
  experiences: Experience[];
  knowledge: KnowledgeNode[];
  confidence: number;
}

// ── Knowledge Queue ──

export interface KnowledgeQueueItem {
  id: string;
  missionId: string;
  executive: ExecutiveRole;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt?: string;
}

// ── Learning Event ──

export interface LearningEvent {
  type: "EXPERIENCE_CREATED" | "REFLECTION_COMPLETE" | "KNOWLEDGE_ADDED" | "GRAPH_UPDATED" | "MEMORY_UPDATED" | "CYCLE_COMPLETE";
  missionId: string;
  executive: ExecutiveRole;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ── Index Entry ──

export interface IndexEntry {
  nodeId: string;
  domain: string;
  type: NodeType;
  keywords: string[];
  confidence: number;
  reinforced: number;
  executive: ExecutiveRole;
}

// ── Factory helpers ──

let _expCounter = 0;
let _refCounter = 0;
let _nodeCounter = 0;
let _queueCounter = 0;

export function createExperienceId(): string { _expCounter++; return `EXP-${Date.now().toString(36)}-${_expCounter}`; }
export function createReflectionId(): string { _refCounter++; return `RFL-${Date.now().toString(36)}-${_refCounter}`; }
export function createNodeId(): string { _nodeCounter++; return `NODE-${Date.now().toString(36)}-${_nodeCounter}`; }
export function createQueueId(): string { _queueCounter++; return `Q-${Date.now().toString(36)}-${_queueCounter}`; }
