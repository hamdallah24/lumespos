// T.0.2 Phase 1 — MemoryProvider types
// LOCKED: T015_MEMORY_PROVIDER_CONTRACT.md

export interface MemoryQuery {
  executive: string;
  query: string;
  domain?: string;
  memoryScope: "session" | "project" | "organization";
  maxTokens?: number;
  includeDecisions?: boolean;
  includeWorking?: boolean;
  includeSemantic?: boolean;
  includeEpisodic?: boolean;
  includeOrgKnowledge?: boolean;
  includeMemoryEngine?: boolean;
}

export interface MemoryContext {
  recentDecisions: string;
  workingMemory: string;
  semanticMemory: string;
  episodicMemory: string;
  knowledgeContext: string;
  organizationalMemory: string;
  memoryEngineRecords: string;
  totalTokens: number;
}

export interface WriteMemoryInput {
  content: string;
  executive: string;
  category?: string;
  scope?: string;
  source?: string;
  tags?: string[];
  confidence?: number;
  executivePriority?: number;
  isUserExplicit?: boolean;
}

export interface WriteMemoryResult {
  id: string;
  importanceScore: number;
  state: string;
}

export interface MemoryProvider {
  read(query: MemoryQuery): Promise<MemoryContext>;
  write(input: WriteMemoryInput): Promise<WriteMemoryResult>;
  estimate(query: MemoryQuery): { tokens: number; sources: string[] };
}
