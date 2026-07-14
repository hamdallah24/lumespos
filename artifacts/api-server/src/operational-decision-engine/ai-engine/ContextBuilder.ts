import type { BusinessFact } from "../../business-intelligence/core/types";

interface ContextInput {
  facts: BusinessFact[];
  branchId?: number;
}

export function buildContext(input: ContextInput): string {
  const parts: string[] = [];

  if (input.branchId) {
    parts.push(`Cabang: ${input.branchId}`);
  }

  const domains = groupBy(input.facts, "domain");
  for (const [domain, facts] of domains) {
    parts.push(`\n[${domain.toUpperCase()}]`);
    for (const f of facts) {
      parts.push(`  - ${f.name}: ${f.description} (nilai=${f.value}, severity=${f.severity})`);
    }
  }

  parts.push(`\nTotal fakta: ${input.facts.length}`);
  parts.push(`Waktu analisis: ${new Date().toISOString()}`);

  return parts.join("\n");
}

function groupBy<T, K extends keyof T>(items: T[], key: K): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = String(item[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}
