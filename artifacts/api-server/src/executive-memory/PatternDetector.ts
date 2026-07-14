import type { DecisionRecord, DetectedPattern } from "./types";
import { queryDecisions } from "./DecisionRecorder";

let nextPatternId = 1;

export function detectPatterns(): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const all = queryDecisions({ limit: 10000 });

  patterns.push(...detectExecutiveTendencies(all));
  patterns.push(...detectDomainOutcomes(all));
  patterns.push(...detectRecurringDecisions(all));

  return patterns;
}

function detectExecutiveTendencies(records: DecisionRecord[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const execDomains = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (!execDomains.has(r.executive)) {
      execDomains.set(r.executive, new Map());
    }
    const domainMap = execDomains.get(r.executive)!;
    domainMap.set(r.domain, (domainMap.get(r.domain) ?? 0) + 1);
  }

  for (const [exec, domains] of execDomains) {
    const total = Array.from(domains.values()).reduce((a, b) => a + b, 0);
    if (total < 3) continue;

    for (const [domain, count] of domains) {
      const ratio = count / total;
      if (ratio >= 0.5 && count >= 3) {
        const relatedIds = records
          .filter((r) => r.executive === exec && r.domain === domain)
          .map((r) => r.id);

        patterns.push({
          id: `PAT-ET-${nextPatternId++}`,
          type: "executive_tendency",
          label: `${exec} cenderung mengambil keputusan ${domain}`,
          description: `${count} dari ${total} keputusan ${exec} berada di domain ${domain} (${Math.round(ratio * 100)}%)`,
          triggerCount: count,
          confidence: Math.round(ratio * 100),
          relatedDecisionIds: relatedIds.slice(0, 10),
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return patterns;
}

function detectDomainOutcomes(records: DecisionRecord[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const domainOutcomes = new Map<string, { success: number; failure: number; total: number }>();

  for (const r of records) {
    if (r.outcome === "pending" || r.outcome === "unknown") continue;
    if (!domainOutcomes.has(r.domain)) {
      domainOutcomes.set(r.domain, { success: 0, failure: 0, total: 0 });
    }
    const stats = domainOutcomes.get(r.domain)!;
    stats.total++;
    if (r.outcome === "success") stats.success++;
    if (r.outcome === "failure") stats.failure++;
  }

  for (const [domain, stats] of domainOutcomes) {
    if (stats.total < 3) continue;

    const successRate = stats.success / stats.total;
    if (successRate <= 0.4) {
      const relatedIds = records
        .filter((r) => r.domain === domain && (r.outcome === "success" || r.outcome === "failure"))
        .map((r) => r.id);

      patterns.push({
        id: `PAT-DO-${nextPatternId++}`,
        type: "domain_outcome",
        label: `Domain ${domain} memiliki tingkat keberhasilan rendah`,
        description: `${stats.success} success / ${stats.failure} failure — rate ${Math.round(successRate * 100)}%`,
        triggerCount: stats.total,
        confidence: Math.round((1 - successRate) * 100),
        relatedDecisionIds: relatedIds.slice(0, 10),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return patterns;
}

function detectRecurringDecisions(records: DecisionRecord[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const titleGroups = new Map<string, DecisionRecord[]>();

  for (const r of records) {
    const key = `${r.executive}::${r.domain}::${r.selectedOption}`;
    if (!titleGroups.has(key)) {
      titleGroups.set(key, []);
    }
    titleGroups.get(key)!.push(r);
  }

  for (const [key, group] of titleGroups) {
    if (group.length < 3) continue;

    const outcomes = group.filter((r) => r.outcome === "success" || r.outcome === "failure");
    const successCount = outcomes.filter((r) => r.outcome === "success").length;
    const failureCount = outcomes.filter((r) => r.outcome === "failure").length;
    const successRate = outcomes.length > 0 ? successCount / outcomes.length : 0;

    const [exec, domain, option] = key.split("::");

    patterns.push({
      id: `PAT-RD-${nextPatternId++}`,
      type: "recurring_decision",
      label: `${exec} berulang kali memilih "${option}" di domain ${domain}`,
      description: `${group.length}x terjadi — ${successCount} sukses, ${failureCount} gagal (rate ${Math.round(successRate * 100)}%)`,
      triggerCount: group.length,
      confidence: Math.round(successRate * 100),
      relatedDecisionIds: group.map((r) => r.id).slice(0, 10),
      detectedAt: new Date().toISOString(),
    });
  }

  return patterns;
}
