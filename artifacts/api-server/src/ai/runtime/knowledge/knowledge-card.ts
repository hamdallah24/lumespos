// ECP-029.5: Knowledge Card — standardized knowledge representation
// Frozen. Consultant Runtime reads cards, not raw documents.
// Cards are the atomic unit of knowledge in Engineering OS.

export type KnowledgeLifecycle = "RAW" | "VALIDATED" | "ACTIVE" | "BEST_PRACTICE" | "FOUNDATION_CANDIDATE" | "ARCHIVED";

export interface KnowledgeCard {
  id: string;
  topic: string;
  summary: string;
  confidence: number;           // 0-100
  importance: number;            // 0-100
  status: KnowledgeLifecycle;
  owners: string[];              // Which runtimes contributed
  sourceCount: number;           // How many source missions
  contradictionCount: number;
  bestPractice: boolean;
  lastUsed: string;              // ISO timestamp
  relatedCards: string[];        // IDs of linked cards
  foundationRef?: string;        // Foundation document ID
  policyRef?: string;            // Policy document ID
  tags: string[];
}

export function createCard(
  id: string, topic: string, summary: string,
  sourceCount = 1, tags: string[] = [],
): KnowledgeCard {
  return {
    id, topic, summary,
    confidence: 70,
    importance: 50,
    status: "RAW",
    owners: [],
    sourceCount,
    contradictionCount: 0,
    bestPractice: false,
    lastUsed: new Date().toISOString(),
    relatedCards: [],
    tags,
  };
}

export function promoteCard(card: KnowledgeCard, toStatus: KnowledgeLifecycle): KnowledgeCard {
  return { ...card, status: toStatus, lastUsed: new Date().toISOString() };
}

export function touchCard(card: KnowledgeCard): KnowledgeCard {
  return { ...card, lastUsed: new Date().toISOString() };
}
