import type { TruthMismatch, MismatchType } from './TruthMismatch';

export interface ScoreDeduction {
  reason: string;
  points: number;
  type: MismatchType;
}

export interface TruthScoreResult {
  executive: string;
  score: number;
  deductions: ScoreDeduction[];
  totalMismatches: number;
  periodLabel: string;
  timestamp: string;
}

const PENALTY_MAP: Record<MismatchType, number> = {
  WRONG_PERIOD: 25,
  INVENTED_NUMBER: 30,
  INVENTED_DATE: 25,
  INVENTED_BRANCH: 20,
  INVENTED_PRODUCT: 15,
  INVENTED_SUPPLIER: 15,
  INVENTED_KPI: 25,
  WRONG_BRANCH: 20,
  UNSUPPORTED_CLAIM: 10,
  INVENTED_ENTITY: 15,
  MISSING_DATA_CLAIM: 15,
};

export function computeScore(executive: string, mismatches: TruthMismatch[], periodLabel: string): TruthScoreResult {
  let score = 100;
  const deductions: ScoreDeduction[] = [];

  for (const m of mismatches) {
    const penalty = PENALTY_MAP[m.type] || 10;
    score -= penalty;
    deductions.push({
      reason: `[${m.type}] "${m.statement.slice(0, 80)}" — expected "${m.expected ?? 'N/A'}", got "${m.actual}"`,
      points: penalty,
      type: m.type,
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    executive,
    score,
    deductions,
    totalMismatches: mismatches.length,
    periodLabel,
    timestamp: new Date().toISOString(),
  };
}

export interface TruthHealthSummary {
  executives: TruthScoreResult[];
  averageScore: number;
  integrity: 'good' | 'needs_attention' | 'critical';
  worstExecutive: string;
  worstScore: number;
}

export function computeHealthSummary(scores: TruthScoreResult[]): TruthHealthSummary {
  const avg = scores.length > 0 ? scores.reduce((s, r) => s + r.score, 0) / scores.length : 100;
  const worst = scores.reduce((w, r) => r.score < (w?.score ?? 100) ? r : w, scores[0]);
  return {
    executives: scores,
    averageScore: Math.round(avg * 100) / 100,
    integrity: avg >= 90 ? 'good' : avg >= 70 ? 'needs_attention' : 'critical',
    worstExecutive: worst?.executive ?? '',
    worstScore: worst?.score ?? 100,
  };
}
