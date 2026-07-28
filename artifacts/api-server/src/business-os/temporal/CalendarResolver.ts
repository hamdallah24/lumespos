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

export function resolveCalendar(text: string): BusinessTimeContext | null {
  const t = text.toLowerCase().trim();
  const now = new Date();
  const y = now.getFullYear();

  // Quarter: Q1-Q4
  const qMatch = t.match(/^q([1-4])$/i);
  if (qMatch) {
    const q = parseInt(qMatch[1], 10);
    const qStart = new Date(y, (q - 1) * 3, 1);
    const qEnd = new Date(y, q * 3, 0);
    return {
      mode: 'quarter',
      from: startOfDay(qStart),
      to: endOfDay(qEnd),
      timezone: TZ,
      label: `Q${q} ${y}`,
      comparison: { enabled: true, mode: 'previous_period' },
    };
  }

  // Quarter with year: Q1 2026
  const qyMatch = t.match(/^q([1-4])\s*(\d{4})$/i);
  if (qyMatch) {
    const q = parseInt(qyMatch[1], 10);
    const qy = parseInt(qyMatch[2], 10);
    const qStart = new Date(qy, (q - 1) * 3, 1);
    const qEnd = new Date(qy, q * 3, 0);
    return {
      mode: 'quarter',
      from: startOfDay(qStart),
      to: endOfDay(qEnd),
      timezone: TZ,
      label: `Q${q} ${qy}`,
      comparison: { enabled: true, mode: 'previous_year' },
    };
  }

  // "quarter 2", "kuartal 2"
  const qIndo = t.match(/^(quarter|kuartal|triwulan)\s*(\d)$/i);
  if (qIndo) {
    const q = parseInt(qIndo[2], 10);
    if (q >= 1 && q <= 4) {
      const qStart = new Date(y, (q - 1) * 3, 1);
      const qEnd = new Date(y, q * 3, 0);
      return {
        mode: 'quarter',
        from: startOfDay(qStart),
        to: endOfDay(qEnd),
        timezone: TZ,
        label: `Q${q} ${y}`,
        comparison: { enabled: true, mode: 'previous_period' },
      };
    }
  }

  // Semester: H1, H2, "semester 1", "semester pertama", "semester 2"
  const semMatch = t.match(/^(h([12])|semester\s*(pertama|1|kedua|2))$/i);
  if (semMatch) {
    const sVal = semMatch[2] ? parseInt(semMatch[2], 10) : (semMatch[4] === 'pertama' || semMatch[4] === '1' ? 1 : 2);
    if (sVal === 1 || sVal === 2) {
      const sStart = new Date(y, (sVal - 1) * 6, 1);
      const sEnd = new Date(y, sVal * 6, 0);
      return {
        mode: 'semester',
        from: startOfDay(sStart),
        to: endOfDay(sEnd),
        timezone: TZ,
        label: `Semester ${sVal === 1 ? 'Pertama' : 'Kedua'} ${y}`,
        comparison: { enabled: true, mode: 'previous_period' },
      };
    }
  }

  // Year: "tahun ini", "tahun 2026"
  if (/^tahun\s+ini$/.test(t)) {
    const yStart = new Date(y, 0, 1);
    const yEnd = new Date(y, 11, 31);
    return {
      mode: 'year',
      from: startOfDay(yStart),
      to: endOfDay(yEnd),
      timezone: TZ,
      label: `Tahun ${y}`,
      comparison: { enabled: true, mode: 'previous_year' },
    };
  }

  const yMatch = t.match(/^tahun\s*(\d{4})$/);
  if (yMatch) {
    const ty = parseInt(yMatch[1], 10);
    const yStart = new Date(ty, 0, 1);
    const yEnd = new Date(ty, 11, 31);
    return {
      mode: 'year',
      from: startOfDay(yStart),
      to: endOfDay(yEnd),
      timezone: TZ,
      label: `Tahun ${ty}`,
      comparison: { enabled: true, mode: 'previous_year' },
    };
  }

  if (/^tahun\s+lalu$/.test(t)) {
    const ly = y - 1;
    const yStart = new Date(ly, 0, 1);
    const yEnd = new Date(ly, 11, 31);
    return {
      mode: 'year',
      from: startOfDay(yStart),
      to: endOfDay(yEnd),
      timezone: TZ,
      label: `Tahun ${ly}`,
      comparison: { enabled: true, mode: 'previous_year' },
    };
  }

  // Month name: "Januari", "Januari 2026"
  const monthNames: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };
  for (const [name, mIdx] of Object.entries(monthNames)) {
    const monthPat = new RegExp(`^${name}(\\s*(\\d{4}))?$`, 'i');
    if (monthPat.test(t)) {
      const my = t.match(/(\d{4})/);
      const targetYear = my ? parseInt(my[1], 10) : y;
      const mStart = new Date(targetYear, mIdx, 1);
      const mEnd = new Date(targetYear, mIdx + 1, 0);
      const label = `${name.charAt(0).toUpperCase() + name.slice(1)}${my ? ` ${targetYear}` : ''}`;
      return {
        mode: 'custom',
        from: startOfDay(mStart),
        to: endOfDay(mEnd),
        timezone: TZ,
        label,
        comparison: { enabled: true, mode: 'previous_year' },
      };
    }
  }

  return null;
}
