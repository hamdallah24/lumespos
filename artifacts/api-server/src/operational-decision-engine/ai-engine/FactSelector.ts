import type { BusinessFact } from "../../business-intelligence/core/types";

const MAX_FACTS_FOR_AI = 10;

export function selectRelevantFacts(
  facts: BusinessFact[],
  branchId?: number,
): BusinessFact[] {
  let filtered = branchId
    ? facts.filter(f => f.branchId === branchId || f.branchId === undefined)
    : [...facts];

  const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  filtered.sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0));

  const unique = new Map<string, BusinessFact>();
  for (const f of filtered) {
    const key = `${f.domain}:${f.name}`;
    if (!unique.has(key)) {
      unique.set(key, f);
    }
  }

  return Array.from(unique.values()).slice(0, MAX_FACTS_FOR_AI);
}
