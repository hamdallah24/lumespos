const TZ = 'Asia/Jakarta';

// Indonesia national holidays 2026 (sample — extend as needed)
const INDONESIAN_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Tahun Baru',
  '2026-03-29': 'Nyepi',
  '2026-04-03': 'Wafat Isa Almasih',
  '2026-05-01': 'Hari Buruh',
  '2026-05-21': 'Kenaikan Isa Almasih',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-07-27': 'Hari Libur Nasional',
  '2026-08-17': 'Hari Kemerdekaan',
  '2026-12-25': 'Natal',
};

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date): boolean {
  const key = date.toISOString().slice(0, 10);
  return key in INDONESIAN_HOLIDAYS_2026;
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

export function getHolidayName(date: Date): string | null {
  const key = date.toISOString().slice(0, 10);
  return INDONESIAN_HOLIDAYS_2026[key] || null;
}

export function getBusinessDays(from: Date, to: Date): Date[] {
  const result: Date[] = [];
  const current = new Date(from);
  while (current <= to) {
    if (isBusinessDay(current)) {
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export function countBusinessDays(from: Date, to: Date): number {
  return getBusinessDays(from, to).length;
}

export function getTimezone(): string {
  return TZ;
}
