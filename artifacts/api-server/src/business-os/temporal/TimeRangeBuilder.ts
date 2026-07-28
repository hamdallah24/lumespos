import { BusinessTimeContext } from './BusinessTimeContext';

const TZ = 'Asia/Jakarta';

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

const MONTH_NAMES: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDateToken(token: string): { day: number; month: number; year?: number } | null {
  const now = new Date();
  const y = now.getFullYear();

  // "23 juli" or "23 Juli 2026"
  const match = token.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const monthIdx = MONTH_NAMES[monthName];
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const year = match[3] ? parseInt(match[3], 10) : y;
      return { day, month: monthIdx, year };
    }
  }

  // ISO: 2026-01-01 or 2026/01/01
  const iso = token.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    return { day: parseInt(iso[3], 10), month: parseInt(iso[2], 10) - 1, year: parseInt(iso[1], 10) };
  }

  return null;
}

export function resolveCustomRange(text: string): BusinessTimeContext | null {
  const t = text.toLowerCase().trim();

  // "dari tanggal 1 sampai 23 juli", "1 juli - 23 juli", "1 Juli sampai 23 Juli"
  const rangePatterns = [
    new RegExp("dari\\s+tanggal\\s+(\\d{1,2}\\s+[a-zA-Z]+(?:\\s+\\d{4})?)\\s*(?:sampai|s/d|hingga|sd|s\\.d\\.?|sampai\\s+dengan|-|–)\\s+(\\d{1,2}\\s+[a-zA-Z]+(?:\\s+\\d{4})?)", "i"),
    new RegExp("(\\d{1,2}\\s+[a-zA-Z]+(?:\\s+\\d{4})?)\\s*(?:sampai|s/d|hingga|sd|s\\.d\\.?|sampai\\s+dengan|-|–)\\s+(\\d{1,2}\\s+[a-zA-Z]+(?:\\s+\\d{4})?)", "i"),
    new RegExp("(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})\\s*(?:sampai|s/d|hingga|sd|s\\.d\\.?|sampai\\s+dengan|-|–)\\s+(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})", "i"),
    /(?:dari|antara)\s+(\d{1,2}\s+[a-zA-Z]+(?:\s+\d{4})?)\s*(?:sampai|hingga|sd|sampai\s+dengan|-|–)\s+(sekarang|hari\s+ini|saat\s+ini)/i,
    /(?:dari|sejak)\s+(\d{1,2}\s+[a-zA-Z]+(?:\s+\d{4})?)\s*(?:sampai|hingga)\s+(sekarang|hari\s+ini|saat\s+ini)/i,
  ];

  for (const pat of rangePatterns) {
    const m = t.match(pat);
    if (m) {
      const fromToken = m[1];
      const toToken = m[2];

      const fromParsed = parseDateToken(fromToken);
      if (!fromParsed) continue;

      let fromDate: Date;
      if (fromParsed.year !== undefined) {
        fromDate = new Date(fromParsed.year, fromParsed.month, fromParsed.day);
      } else {
        fromDate = new Date(new Date().getFullYear(), fromParsed.month, fromParsed.day);
      }

      let toDate: Date;
      if (/^(sekarang|hari\s+ini|saat\s+ini)$/i.test(toToken)) {
        toDate = new Date();
      } else {
        const toParsed = parseDateToken(toToken);
        if (!toParsed) continue;
        if (toParsed.year !== undefined) {
          toDate = new Date(toParsed.year, toParsed.month, toParsed.day);
        } else {
          toDate = new Date(fromDate.getFullYear(), toParsed.month, toParsed.day);
        }
      }

      return {
        mode: 'custom',
        from: startOfDay(fromDate),
        to: endOfDay(toDate),
        timezone: TZ,
        label: `${fromDate.getDate()} ${getMonthLabel(fromDate.getMonth())} — ${toDate.getDate()} ${getMonthLabel(toDate.getMonth())}`,
        comparison: { enabled: false, mode: 'none' },
      };
    }
  }

  return null;
}

function getMonthLabel(m: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return names[m];
}
