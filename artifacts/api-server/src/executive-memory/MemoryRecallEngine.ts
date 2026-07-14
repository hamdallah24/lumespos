import type { DecisionRecord, DecisionFilter, MemoryRecall, ExecutiveRole } from "./types";
import { queryDecisions } from "./DecisionRecorder";

export function recallDecisions(filter: DecisionFilter): MemoryRecall {
  const records = queryDecisions(filter);
  const contextPrompt = buildContextPrompt(records, filter.executive);

  return {
    records,
    total: records.length,
    contextPrompt,
  };
}

export function recallForExecutive(executive: ExecutiveRole, limit = 10): MemoryRecall {
  return recallDecisions({ executive, limit });
}

export function recallByDomain(domain: string, limit = 10): MemoryRecall {
  return recallDecisions({ domain: domain as any, limit });
}

export function recallRecent(limit = 10): MemoryRecall {
  return recallDecisions({ limit });
}

function buildContextPrompt(records: DecisionRecord[], executive?: ExecutiveRole): string {
  if (records.length === 0) {
    return "Tidak ada keputusan sebelumnya yang ditemukan.";
  }

  const filtered = records.slice(0, 8);
  const lines: string[] = [
    `Konteks dari ${filtered.length} keputusan sebelumnya${executive ? ` (${executive})` : ""}:`,
    "",
  ];

  for (const r of filtered) {
    const outcomeIcon = r.outcome === "success" ? "✓" : r.outcome === "failure" ? "✗" : r.outcome === "partial" ? "◐" : "○";
    lines.push(`  [${outcomeIcon}] ${r.title} (${r.domain}, ${r.executive})`);
    lines.push(`       Pilihan: ${r.selectedOption}`);
    if (r.alternatives.length > 0) {
      lines.push(`       Alternatif: ${r.alternatives.join(", ")}`);
    }
    if (r.outcome !== "pending") {
      lines.push(`       Hasil: ${r.outcome} | Keyakinan: ${r.confidence}`);
    }
    lines.push("");
  }

  lines.push(`Total catatan terkait: ${records.length}`);

  const successRate = computeSuccessRate(records);
  if (successRate > 0) {
    lines.push(`Tingkat keberhasilan: ${Math.round(successRate * 100)}%`);
  }

  return lines.join("\n");
}

function computeSuccessRate(records: DecisionRecord[]): number {
  const evaluated = records.filter((r) => r.outcome === "success" || r.outcome === "failure");
  if (evaluated.length === 0) return 0;
  const successes = evaluated.filter((r) => r.outcome === "success").length;
  return successes / evaluated.length;
}
