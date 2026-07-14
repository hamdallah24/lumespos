import type { DecisionRecord, ExecutiveRole, DecisionDomain, DecisionOutcome } from "./types";

const decisionStore: DecisionRecord[] = [];
const MAX_DECISIONS = 500;
let counter = 0;

export function recordDecision(params: {
  executive: ExecutiveRole;
  domain: DecisionDomain;
  title: string;
  description: string;
  situationId?: string;
  alternatives: string[];
  selectedOption: string;
  tags?: string[];
  relatedDecisionIds?: string[];
  missionId?: string;
  confidence?: number;
}): DecisionRecord {
  counter++;

  const record: DecisionRecord = {
    id: `EM-${Date.now()}-${counter}`,
    executive: params.executive,
    domain: params.domain,
    title: params.title,
    description: params.description,
    situationId: params.situationId,
    alternatives: params.alternatives,
    selectedOption: params.selectedOption,
    outcome: "pending",
    confidence: params.confidence ?? 70,
    tags: params.tags ?? [],
    relatedDecisionIds: params.relatedDecisionIds ?? [],
    missionId: params.missionId,
    createdAt: new Date().toISOString(),
  };

  decisionStore.unshift(record);
  if (decisionStore.length > MAX_DECISIONS) {
    decisionStore.length = MAX_DECISIONS;
  }

  return record;
}

export function getDecisionById(id: string): DecisionRecord | undefined {
  return decisionStore.find((d) => d.id === id);
}

export function queryDecisions(filter: {
  executive?: ExecutiveRole;
  domain?: DecisionDomain;
  outcome?: DecisionOutcome;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): DecisionRecord[] {
  let results = [...decisionStore];

  if (filter.executive) {
    results = results.filter((d) => d.executive === filter.executive);
  }
  if (filter.domain) {
    results = results.filter((d) => d.domain === filter.domain);
  }
  if (filter.outcome) {
    results = results.filter((d) => d.outcome === filter.outcome);
  }
  if (filter.tag) {
    results = results.filter((d) => d.tags.includes(filter.tag!));
  }
  if (filter.fromDate) {
    results = results.filter((d) => d.createdAt >= filter.fromDate!);
  }
  if (filter.toDate) {
    results = results.filter((d) => d.createdAt <= filter.toDate!);
  }

  const limit = filter.limit ?? 20;
  return results.slice(0, limit);
}

export function updateDecisionOutcome(id: string, outcome: DecisionOutcome): boolean {
  const record = decisionStore.find((d) => d.id === id);
  if (!record) return false;
  record.outcome = outcome;
  record.outcomeUpdatedAt = new Date().toISOString();
  return true;
}

export function getAllDecisions(): DecisionRecord[] {
  return [...decisionStore];
}

export function clearDecisions(): void {
  decisionStore.length = 0;
}
