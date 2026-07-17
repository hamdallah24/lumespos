import type { OperationalData } from './types';

export function getOperationalData(operational: OperationalData[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const entry of operational) {
    map[entry.type] = entry.data;
  }
  return map;
}
