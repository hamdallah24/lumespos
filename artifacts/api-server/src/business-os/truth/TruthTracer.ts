import type { RuntimeContext } from '../../runtime-intelligence-core/types';
import type { TruthReference } from './TruthReference';
import { makeReference } from './TruthReference';

const PERIOD_KEYWORDS: Record<string, string[]> = {
  'hari ini': ['hari ini'],
  'hari-ini': ['hari ini'],
  'hari_ini': ['hari ini'],
  hariini: ['hari ini'],
  kemarin: ['kemarin'],
  'minggu ini': ['minggu ini'],
  'minggu lalu': ['minggu lalu'],
  '7 hari': ['7 hari', '7 Hari', 'tujuh hari'],
  '7hari': ['7 hari'],
  '30 hari': ['30 hari', '30 Hari', 'tiga puluh hari'],
  'bulan ini': ['bulan ini'],
  'bulan lalu': ['bulan lalu'],
  'bulan': ['bulan lalu', 'bulan ini'],
  'quarter': ['quarter', 'kuartal'],
  'tahun': ['tahun ini', 'tahun lalu'],
};

const PERIOD_PATTERNS = [
  { regex: /\b(\d+)\s*hari\s*(terakhir|kedepan|ke depan|yg akan datang)\b/i, type: 'N_DAYS' },
  { regex: /\bhari\s+ini\b/i, type: 'TODAY' },
  { regex: /\bkemarin\b/i, type: 'YESTERDAY' },
  { regex: /\bminggu\s+ini\b/i, type: 'THIS_WEEK' },
  { regex: /\bminggu\s+lalu\b/i, type: 'LAST_WEEK' },
  { regex: /\b7\s*hari\s*terakhir\b/i, type: 'LAST_7_DAYS' },
  { regex: /\b30\s*hari\s*terakhir\b/i, type: 'LAST_30_DAYS' },
  { regex: /\bbulan\s+ini\b/i, type: 'THIS_MONTH' },
  { regex: /\bbulan\s+lalu\b/i, type: 'LAST_MONTH' },
  { regex: /\b(kuartal|quarter)\b/i, type: 'QUARTER' },
  { regex: /\btahun\s+ini\b/i, type: 'YEAR' },
];

const REVENUE_TREND_WORDS = ['naik', 'turun', 'stabil', 'meningkat', 'menurun', 'tetap', 'melesat', 'anjlok', 'melonjak', 'merosot'];
const NEGATION_WORDS = ['tidak', 'belum', 'tak', 'bukan', 'tiada'];

export class TruthTracer {
  tracePeriod(text: string, ctx: RuntimeContext): TruthReference[] {
    const refs: TruthReference[] = [];
    const label = (ctx.time?.label || '').toLowerCase();

    for (const { regex, type } of PERIOD_PATTERNS) {
      const match = text.match(regex);
      if (!match) continue;

      const mentioned = match[0].toLowerCase();
      let matchFound = false;

      if (type === 'TODAY' && label.includes('hari ini')) matchFound = true;
      else if (type === 'LAST_7_DAYS' && (label.includes('7 hari') || label.includes('last_7_days'))) matchFound = true;
      else if (type === 'LAST_30_DAYS' && (label.includes('30 hari') || label.includes('last_30_days'))) matchFound = true;
      else if (type === 'THIS_WEEK' && label.includes('minggu ini')) matchFound = true;
      else if (type === 'LAST_WEEK' && label.includes('minggu lalu')) matchFound = true;
      else if (type === 'THIS_MONTH' && label.includes('bulan ini')) matchFound = true;
      else if (type === 'LAST_MONTH' && label.includes('bulan lalu')) matchFound = true;
      else if (type === 'YEAR' && label.includes('tahun')) matchFound = true;
      else if (type === 'QUARTER' && label.includes('quarter')) matchFound = true;
      else if (type === 'YESTERDAY' && label.includes('kemarin')) matchFound = true;
      else if (type === 'N_DAYS') {
        const numDays = parseInt(match[1], 10);
        if (numDays === 7 && label.includes('7 hari')) matchFound = true;
        if (numDays === 30 && label.includes('30 hari')) matchFound = true;
      }

      refs.push(makeReference(
        match[0],
        'time.label',
        ctx.time?.label || '',
        matchFound,
        matchFound ? 1.0 : 0.0,
      ));
    }

    return refs;
  }

  traceNumbers(text: string, ctx: RuntimeContext): TruthReference[] {
    const refs: TruthReference[] = [];
    const knownValues = this.extractKnownNumbers(ctx);

    const rpMatches = text.matchAll(/Rp\s*([\d.,]+)/gi);
    for (const m of rpMatches) {
      const raw = m[1].replace(/[.,]/g, '');
      const num = parseInt(raw, 10);
      if (isNaN(num)) continue;

      const match = this.findClosestMatch(num, knownValues);
      refs.push(makeReference(
        m[0],
        match?.field || 'unknown',
        match?.value ?? null,
        !!match,
        match ? 0.9 : 0.0,
      ));
    }

    const rawNumberMatches = text.matchAll(/(\d[\d.,]*)\s*(transaksi|pesanan|item|produk|kategori|cabang|karyawan|pegawai|supplier)/gi);
    for (const m of rawNumberMatches) {
      const raw = m[1].replace(/[.,]/g, '');
      const num = parseInt(raw, 10);
      if (isNaN(num)) continue;

      const match = this.findClosestMatch(num, knownValues);
      if (!match) {
        refs.push(makeReference(
          m[0],
          'unknown',
          null,
          false,
          0.0,
        ));
      }
    }

    return refs;
  }

  traceRevenueTrend(text: string, ctx: RuntimeContext): TruthReference[] {
    const refs: TruthReference[] = [];
    const revenue = this.getRevenueFromContext(ctx);

    for (const word of REVENUE_TREND_WORDS) {
      const trendRegex = new RegExp(`\\b${word}\\b`, 'gi');
      if (!trendRegex.test(text)) continue;

      const isNegated = NEGATION_WORDS.some(n => {
        const negRegex = new RegExp(`\\b${n}\\s+(\\w+\\s+){0,3}${word}\\b`, 'gi');
        return negRegex.test(text);
      });

      if (revenue === 0 && !isNegated) {
        refs.push(makeReference(
          `revenue trend: ${word}`,
          'finance.revenue.total',
          0,
          false,
          0.0,
        ));
      } else {
        refs.push(makeReference(
          `revenue trend: ${word}`,
          'finance.revenue.total',
          revenue,
          true,
          0.8,
        ));
      }
    }

    return refs;
  }

  traceEntities(text: string, ctx: RuntimeContext): TruthReference[] {
    const refs: TruthReference[] = [];
    const knownBranches = this.getKnownBranches(ctx);
    const knownProducts = this.getKnownProducts(ctx);

    for (const branch of knownBranches) {
      const occurrence = this.findWordInText(text, branch);
      if (!occurrence) continue;
      refs.push(makeReference(occurrence, 'branches', branch, true, 1.0));
    }

    for (const product of knownProducts) {
      const occurrence = this.findWordInText(text, product);
      if (!occurrence) continue;
      refs.push(makeReference(occurrence, 'products', product, true, 1.0));
    }

    return refs;
  }

  traceMissingDataClaim(text: string, ctx: RuntimeContext): TruthReference[] {
    const refs: TruthReference[] = [];
    const noDataPhrases = [
      'data tidak tersedia',
      'data tidak ada',
      'tidak tersedia',
      'tidak ada data',
      'belum ada data',
      'tidak terdapat data',
    ];

    const hasNoDataClaim = noDataPhrases.some(p => text.toLowerCase().includes(p));
    if (!hasNoDataClaim) return refs;

    const revenue = this.getRevenueFromContext(ctx);
    if (revenue > 0) {
      refs.push(makeReference(
        'Data tidak tersedia (claimed)',
        'finance.revenue.total',
        revenue,
        false,
        0.0,
      ));
    }

    return refs;
  }

  traceAll(text: string, ctx: RuntimeContext): TruthReference[] {
    return [
      ...this.tracePeriod(text, ctx),
      ...this.traceNumbers(text, ctx),
      ...this.traceRevenueTrend(text, ctx),
      ...this.traceEntities(text, ctx),
      ...this.traceMissingDataClaim(text, ctx),
    ];
  }

  private extractKnownNumbers(ctx: RuntimeContext): { field: string; value: number }[] {
    const nums: { field: string; value: number }[] = [];
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (!erp) return nums;

    const sales = erp.sales;
    if (sales) {
      if (typeof sales.today?.revenue === 'number') nums.push({ field: 'sales.today.revenue', value: sales.today.revenue });
      if (typeof sales.today?.orders === 'number') nums.push({ field: 'sales.today.orders', value: sales.today.orders });
      if (typeof sales.period?.revenue === 'number') nums.push({ field: 'sales.period.revenue', value: sales.period.revenue });
      if (typeof sales.period?.orders === 'number') nums.push({ field: 'sales.period.orders', value: sales.period.orders });
    }

    const finance = erp.finance;
    if (finance) {
      if (typeof finance.revenue?.total === 'number') nums.push({ field: 'finance.revenue.total', value: finance.revenue.total });
      if (typeof finance.expenses?.total === 'number') nums.push({ field: 'finance.expenses.total', value: finance.expenses.total });
    }

    const inv = erp.inventory;
    if (inv) {
      if (typeof inv.totalItems === 'number') nums.push({ field: 'inventory.totalItems', value: inv.totalItems });
      if (typeof inv.criticalCount === 'number') nums.push({ field: 'inventory.criticalCount', value: inv.criticalCount });
      if (typeof inv.healthScore === 'number') nums.push({ field: 'inventory.healthScore', value: inv.healthScore });
    }

    const people = erp.people;
    if (people) {
      if (typeof people.headcount === 'number') nums.push({ field: 'people.headcount', value: people.headcount });
    }

    return nums;
  }

  private findClosestMatch(num: number, known: { field: string; value: number }[]): { field: string; value: number } | null {
    for (const k of known) {
      if (k.value === num) return k;
    }
    for (const k of known) {
      const diff = Math.abs(k.value - num);
      const ratio = diff / Math.max(k.value, 1);
      if (ratio < 0.02) return k;
    }
    return null;
  }

  private getRevenueFromContext(ctx: RuntimeContext): number {
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (!erp) return -1;
    const sales = erp.sales;
    if (sales?.today?.revenue > 0) return sales.today.revenue;
    if (sales?.period?.revenue > 0) return sales.period.revenue;
    const finance = erp.finance;
    if (finance?.revenue?.total > 0) return finance.revenue.total;
    return 0;
  }

  private getKnownBranches(ctx: RuntimeContext): string[] {
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (!erp) return [];
    const names: string[] = [];
    const sales = erp.sales;
    if (sales?.branches) {
      for (const b of sales.branches) {
        if (b.branchName) names.push(b.branchName);
        if (b.name) names.push(b.name);
      }
    }
    const finance = erp.finance;
    if (finance?.branches) {
      for (const b of finance.branches) {
        if (b.branchName) names.push(b.branchName);
        if (b.name) names.push(b.name);
      }
    }
    return [...new Set(names)];
  }

  private getKnownProducts(ctx: RuntimeContext): string[] {
    const erp = ctx.erpContexts as Record<string, any> | undefined;
    if (!erp) return [];
    const names: string[] = [];
    const sales = erp.sales;
    if (sales?.topProducts) {
      for (const p of sales.topProducts) {
        if (p.name) names.push(p.name);
      }
    }
    if (sales?.branches) {
      for (const b of sales.branches) {
        if (b.topProducts) {
          for (const p of b.topProducts) {
            if (p.name) names.push(p.name);
          }
        }
      }
    }
    return [...new Set(names)];
  }

  private findWordInText(text: string, word: string): string | null {
    const lower = text.toLowerCase();
    const target = word.toLowerCase();
    if (lower.includes(target)) return target;
    const words = target.split(/\s+/);
    if (words.length > 1 && words.every(w => lower.includes(w))) return target;
    return null;
  }
}
