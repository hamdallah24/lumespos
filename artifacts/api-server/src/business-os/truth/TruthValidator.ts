import type { RuntimeContext } from '../../runtime-intelligence-core/types';
import type { TruthReference } from './TruthReference';
import type { TruthMismatch, MismatchType } from './TruthMismatch';
import { makeMismatch } from './TruthMismatch';
import { TruthTracer } from './TruthTracer';

export interface ValidationResult {
  valid: boolean;
  score: number;
  errors: TruthMismatch[];
  warnings: TruthMismatch[];
  references: TruthReference[];
  executive: string;
  periodLabel: string;
}

export class TruthValidator {
  private tracer = new TruthTracer();

  validate(text: string, ctx: RuntimeContext, executive: string): ValidationResult {
    const errors: TruthMismatch[] = [];
    const warnings: TruthMismatch[] = [];
    const references = this.tracer.traceAll(text, ctx);
    const periodLabel = ctx.time?.label || 'unknown';

    // RULE 1: Period check
    const periodRefs = references.filter(r => r.sourceField === 'time.label' && !r.match);
    for (const ref of periodRefs) {
      errors.push(makeMismatch(
        executive,
        'WRONG_PERIOD',
        ref.statement,
        ref.statement,
        ctx.time?.label || '',
        'time.label',
        'CRITICAL',
      ));
    }

    // RULE 2: Revenue trend when revenue = 0
    const trendRefs = references.filter(r => r.sourceField === 'finance.revenue.total' && !r.match);
    for (const ref of trendRefs) {
      errors.push(makeMismatch(
        executive,
        'INVENTED_KPI',
        ref.statement,
        'revenue trend mentioned but revenue = 0',
        'Data tidak tersedia',
        'finance.revenue.total',
        'CRITICAL',
      ));
    }

    // RULE 3: Unmatched numbers (potential invented numbers)
    const unmatchedNumbers = references.filter(r => r.sourceField === 'unknown' && !r.match);
    for (const ref of unmatchedNumbers) {
      warnings.push(makeMismatch(
        executive,
        'INVENTED_NUMBER',
        ref.statement,
        `"${ref.statement}" cannot be traced to any context field`,
        undefined,
        undefined,
        'MEDIUM',
      ));
    }

    // RULE 4/5/6: "Data tidak tersedia" claim when data exists
    const missingDataRefs = references.filter(r =>
      r.sourceField === 'finance.revenue.total' && !r.match &&
      r.statement.includes('tidak tersedia'),
    );
    for (const ref of missingDataRefs) {
      errors.push(makeMismatch(
        executive,
        'MISSING_DATA_CLAIM',
        ref.statement,
        'claimed data not available but revenue data exists in context',
        String(ref.sourceValue),
        'finance.revenue.total',
        'HIGH',
      ));
    }

    // RULE 9: Data tidak tersedia enforcement
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (erp) {
      const sales = erp.sales;
      const finance = erp.finance;
      const noRevenueData = !sales?.today?.revenue && !sales?.period?.revenue && !finance?.revenue?.total;
      const noHRData = !erp.people?.headcount;
      const noInventoryData = !erp.inventory?.totalItems;

      if (noRevenueData || noHRData || noInventoryData) {
        const saysNoData = text.toLowerCase().includes('data tidak tersedia') ||
          text.toLowerCase().includes('tidak ada data') ||
          text.toLowerCase().includes('belum ada data');

        if (!saysNoData) {
          warnings.push(makeMismatch(
            executive,
            'UNSUPPORTED_CLAIM',
            '(implied) executive did not say "Data tidak tersedia" despite missing data',
            'data missing but not acknowledged',
            'Data tidak tersedia',
            undefined,
            'LOW',
          ));
        }
      }
    }

    // Rule 7: Objective progress check
    this.checkObjectiveProgress(text, ctx, executive, warnings);

    // Compute score
    const totalPenalty = errors.length * 25 + warnings.length * 10;
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      references,
      executive,
      periodLabel,
    };
  }

  private checkObjectiveProgress(text: string, ctx: RuntimeContext, executive: string, warnings: TruthMismatch[]): void {
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (!erp?.workspace?.objectives) return;

    const objectives = erp.workspace.objectives as any[];
    for (const obj of objectives) {
      if (obj.progress != null && obj.progress < 100) {
        const finishedPattern = new RegExp(`\\b${this.escapeRegex(obj.title || '')}\\b.*(selesai|completed|done|rampung)`, 'i');
        if (finishedPattern.test(text)) {
          warnings.push(makeMismatch(
            executive,
            'INVENTED_KPI',
            `objective "${obj.title}" claimed complete`,
            `said completed but progress is ${obj.progress}%`,
            `progress ${obj.progress}%`,
            `workspace.objectives.${obj.id}.progress`,
            'MEDIUM',
          ));
        }
      }
    }
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
