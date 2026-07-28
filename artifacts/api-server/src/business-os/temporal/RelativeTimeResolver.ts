import { BusinessTimeContext } from './BusinessTimeContext';
import * as Presets from './TimePresets';

export function resolveRelative(text: string): BusinessTimeContext | null {
  const t = text.toLowerCase().trim();

  if (/^hari\s+ini$/.test(t)) return Presets.today();
  if (/^hari\s+ini\s+saja$/.test(t)) return Presets.today();
  if (/^sekarang$/.test(t)) return Presets.today();

  if (/^kemarin$/.test(t)) return Presets.yesterday();

  if (/^minggu\s+ini$/.test(t)) return Presets.thisWeek();
  if (/^pekan\s+ini$/.test(t)) return Presets.thisWeek();

  if (/^minggu\s+lalu$/.test(t)) return Presets.lastWeek();
  if (/^pekan\s+lalu$/.test(t)) return Presets.lastWeek();
  if (/^minggu\s+kemarin$/.test(t)) return Presets.lastWeek();

  if (/^7\s*hari(\s+terakhir)?$/.test(t)) return Presets.last7Days();
  if (/^tujuh\s*hari(\s+terakhir)?$/.test(t)) return Presets.last7Days();
  if (/^seminggu(\s+terakhir)?$/.test(t)) return Presets.last7Days();

  if (/^30\s*hari(\s+terakhir)?$/.test(t)) return Presets.last30Days();
  if (/^sebulan(\s+terakhir)?$/.test(t)) return Presets.last30Days();

  if (/^bulan\s+ini$/.test(t)) return Presets.thisMonth();
  if (/^sekarang\s+bulan\s+ini$/.test(t)) return Presets.thisMonth();

  if (/^bulan\s+lalu$/.test(t)) return Presets.lastMonth();
  if (/^bulan\s+kemarin$/.test(t)) return Presets.lastMonth();

  const match90 = t.match(/^(\d+)\s*hari(\s+terakhir)?$/);
  if (match90) {
    const n = parseInt(match90[1], 10);
    if (n > 0 && n <= 365) {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - (n - 1));
      return {
        mode: 'rolling',
        from: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        timezone: 'Asia/Jakarta',
        label: `${n} Hari Terakhir`,
        comparison: { enabled: true, mode: 'previous_period' },
      };
    }
  }

  return null;
}
