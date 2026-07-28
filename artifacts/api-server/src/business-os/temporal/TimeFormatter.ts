import { BusinessTimeContext } from './BusinessTimeContext';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimeContext(ctx: BusinessTimeContext): string {
  const fromStr = formatDate(ctx.from);
  const toStr = formatDate(ctx.to);
  if (ctx.from.getTime() === ctx.to.getTime()) {
    return `${ctx.label}: ${fromStr}`;
  }
  return `${ctx.label}: ${fromStr} — ${toStr}`;
}

export function formatDuration(days: number): string {
  if (days === 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari terakhir`;
  if (days < 30) return `${Math.round(days / 7)} minggu terakhir`;
  if (days < 365) return `${Math.round(days / 30)} bulan terakhir`;
  return `${Math.round(days / 365)} tahun terakhir`;
}

export function getPeriodDescription(ctx: BusinessTimeContext): string {
  return ctx.label;
}
