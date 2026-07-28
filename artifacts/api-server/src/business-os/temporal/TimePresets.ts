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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function today(): BusinessTimeContext {
  const now = new Date();
  return {
    mode: 'today',
    from: startOfDay(now),
    to: endOfDay(now),
    timezone: TZ,
    label: 'Hari Ini',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function yesterday(): BusinessTimeContext {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return {
    mode: 'yesterday',
    from: startOfDay(d),
    to: endOfDay(d),
    timezone: TZ,
    label: 'Kemarin',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function thisWeek(): BusinessTimeContext {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return {
    mode: 'this_week',
    from: startOfDay(mon),
    to: endOfDay(now),
    timezone: TZ,
    label: 'Minggu Ini',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function lastWeek(): BusinessTimeContext {
  const now = new Date();
  const day = now.getDay();
  const lastMon = new Date(now);
  lastMon.setDate(now.getDate() - ((day + 6) % 7) - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  return {
    mode: 'last_week',
    from: startOfDay(lastMon),
    to: endOfDay(lastSun),
    timezone: TZ,
    label: 'Minggu Lalu',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function last7Days(): BusinessTimeContext {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return {
    mode: 'last_7_days',
    from: startOfDay(from),
    to: endOfDay(now),
    timezone: TZ,
    label: '7 Hari Terakhir',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function last30Days(): BusinessTimeContext {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 29);
  return {
    mode: 'last_30_days',
    from: startOfDay(from),
    to: endOfDay(now),
    timezone: TZ,
    label: '30 Hari Terakhir',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function thisMonth(): BusinessTimeContext {
  const now = new Date();
  return {
    mode: 'this_month',
    from: startOfDay(startOfMonth(now)),
    to: endOfDay(now),
    timezone: TZ,
    label: 'Bulan Ini',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}

export function lastMonth(): BusinessTimeContext {
  const now = new Date();
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    mode: 'last_month',
    from: startOfDay(startOfMonth(lm)),
    to: endOfDay(endOfMonth(lm)),
    timezone: TZ,
    label: 'Bulan Lalu',
    comparison: { enabled: true, mode: 'previous_period' },
  };
}
