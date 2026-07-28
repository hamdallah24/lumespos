import { BusinessTimeContext } from './BusinessTimeContext';
import { resolveRelative } from './RelativeTimeResolver';
import { resolveCalendar } from './CalendarResolver';
import { resolveCustomRange } from './TimeRangeBuilder';
import { validateTimeContext } from './TimeValidator';

export function parseTime(text: string): BusinessTimeContext | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  // Try each resolver in order
  const resolvers: ((input: string) => BusinessTimeContext | null)[] = [
    resolveRelative,
    resolveCalendar,
    resolveCustomRange,
  ];

  for (const resolve of resolvers) {
    const result = resolve(text);
    if (result) {
      const validation = validateTimeContext(result);
      if (validation.valid) {
        return result;
      }
    }
  }

  return null;
}

export function parseTimeOrThrow(text: string): BusinessTimeContext {
  const result = parseTime(text);
  if (!result) {
    // Default to last 7 days if nothing matches
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return {
      mode: 'last_7_days',
      from: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
      to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      timezone: 'Asia/Jakarta',
      label: '7 Hari Terakhir',
      comparison: { enabled: true, mode: 'previous_period' },
    };
  }
  return result;
}
