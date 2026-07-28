import type { TruthMismatch, MismatchType } from './TruthMismatch';
import type { TruthScoreResult } from './TruthScore';
import { EpisodicMemory } from '../memory/EpisodicMemory';

interface AuditEntry {
  executive: string;
  mismatches: TruthMismatch[];
  score: number;
  periodLabel: string;
  timestamp: string;
  query?: string;
}

interface FailurePattern {
  executive: string;
  type: MismatchType;
  frequency: number;
  lastOccurrence: string;
  examples: string[];
}

export class TruthAudit {
  private entries: AuditEntry[] = [];
  private maxEntries = 1000;

  record(executive: string, mismatches: TruthMismatch[], score: number, periodLabel: string, query?: string): void {
    this.entries.push({
      executive,
      mismatches,
      score,
      periodLabel,
      timestamp: new Date().toISOString(),
      query,
    });

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    for (const mm of mismatches) {
      try {
        const memory = new EpisodicMemory();
        memory.record({
          executive,
          type: 'event',
          title: `TruthViolation:${mm.type}`,
          description: `[${mm.severity}] ${mm.type}: "${mm.statement.slice(0, 120)}" — expected "${mm.expected ?? 'N/A'}", got "${mm.actual}"`,
          outcome: 'failure',
          confidence: 0.2,
          context: { type: mm.type, severity: mm.severity, field: mm.contextPath },
          tags: ['truth', 'hallucination', mm.type, executive],
        });
      } catch { /* non-critical */ }
    }
  }

  getRecent(limit = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getByExecutive(executive: string): AuditEntry[] {
    return this.entries.filter(e => e.executive === executive);
  }

  getFailurePatterns(): FailurePattern[] {
    const patternMap = new Map<string, { count: number; last: string; examples: string[] }>();

    for (const entry of this.entries) {
      for (const mm of entry.mismatches) {
        const key = `${entry.executive}:${mm.type}`;
        const existing = patternMap.get(key) || { count: 0, last: '', examples: [] };
        existing.count++;
        existing.last = mm.timestamp > existing.last ? mm.timestamp : existing.last;
        if (existing.examples.length < 5) {
          existing.examples.push(mm.statement.slice(0, 100));
        }
        patternMap.set(key, existing);
      }
    }

    return Array.from(patternMap.entries()).map(([key, data]) => {
      const [executive, type] = key.split(':') as [string, MismatchType];
      return {
        executive,
        type,
        frequency: data.count,
        lastOccurrence: data.last,
        examples: data.examples,
      };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  getMostHallucinatedExecutives(): { executive: string; totalMismatches: number; avgScore: number }[] {
    const stats = new Map<string, { mismatches: number; scores: number[] }>();

    for (const entry of this.entries) {
      const existing = stats.get(entry.executive) || { mismatches: 0, scores: [] };
      existing.mismatches += entry.mismatches.length;
      existing.scores.push(entry.score);
      stats.set(entry.executive, existing);
    }

    return Array.from(stats.entries())
      .map(([executive, data]) => ({
        executive,
        totalMismatches: data.mismatches,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      }))
      .sort((a, b) => b.totalMismatches - a.totalMismatches);
  }

  getScoreHistory(executive: string, limit = 20): { score: number; timestamp: string }[] {
    return this.entries
      .filter(e => e.executive === executive)
      .slice(-limit)
      .map(e => ({ score: e.score, timestamp: e.timestamp }));
  }

  clear(): void {
    this.entries = [];
  }
}

let instance: TruthAudit | null = null;
export function getTruthAudit(): TruthAudit {
  if (!instance) instance = new TruthAudit();
  return instance;
}
