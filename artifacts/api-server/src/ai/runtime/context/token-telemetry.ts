// ECP-032: Token Telemetry — tracks token usage across layers
// Frozen. Records per-layer token allocation after each request.
// Enables cost analysis and optimization.

interface TelemetryRecord {
  timestamp: string;
  runtime: string;
  layers: { layer: string; used: number; budget: number }[];
  totalUsed: number;
  totalBudget: number;
  overBudget: boolean;
  compressed: boolean;
  droppedLayers: string[];
}

class TokenTelemetry {
  private _records: TelemetryRecord[] = [];

  record(entry: Omit<TelemetryRecord, "timestamp">): void {
    this._records.push({ ...entry, timestamp: new Date().toISOString() });
    if (this._records.length > 200) this._records.splice(0, 50);
  }

  /** Get average token usage per layer */
  average(): { layer: string; avgUsed: number; avgBudget: number }[] {
    const layerTotals = new Map<string, { used: number; budget: number; count: number }>();

    for (const record of this._records) {
      for (const layer of record.layers) {
        const entry = layerTotals.get(layer.layer) || { used: 0, budget: 0, count: 0 };
        entry.used += layer.used;
        entry.budget += layer.budget;
        entry.count++;
        layerTotals.set(layer.layer, entry);
      }
    }

    return [...layerTotals.entries()].map(([layer, data]) => ({
      layer,
      avgUsed: Math.round(data.used / data.count),
      avgBudget: Math.round(data.budget / data.count),
    }));
  }

  /** Get overflow rate */
  overflowRate(): number {
    if (this._records.length === 0) return 0;
    const overflows = this._records.filter(r => r.overBudget).length;
    return Math.round((overflows / this._records.length) * 100);
  }

  getRecent(limit = 20): TelemetryRecord[] {
    return this._records.slice(-limit);
  }
}

export const tokenTelemetry = new TokenTelemetry();
