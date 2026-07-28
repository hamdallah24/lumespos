import { BusinessTimeContext, TimeComparison } from './BusinessTimeContext';

export function computeComparisonPeriod(ctx: BusinessTimeContext): BusinessTimeContext | null {
  if (!ctx.comparison?.enabled) return null;

  const fromMs = ctx.from.getTime();
  const toMs = ctx.to.getTime();
  const durationMs = toMs - fromMs;

  if (durationMs <= 0) return null;

  let prevFrom: Date;
  let prevTo: Date;
  let label: string;

  switch (ctx.comparison.mode) {
    case 'previous_period': {
      prevTo = new Date(fromMs - 1);
      prevFrom = new Date(prevTo.getTime() - durationMs);
      label = `Periode Sebelumnya`;
      break;
    }
    case 'previous_year': {
      prevFrom = new Date(fromMs);
      prevFrom.setFullYear(prevFrom.getFullYear() - 1);
      prevTo = new Date(toMs);
      prevTo.setFullYear(prevTo.getFullYear() - 1);
      label = `Tahun Lalu`;
      break;
    }
    default:
      return null;
  }

  return {
    mode: ctx.mode,
    from: prevFrom,
    to: prevTo,
    timezone: ctx.timezone,
    label,
    comparison: { enabled: false, mode: 'none' },
  };
}
