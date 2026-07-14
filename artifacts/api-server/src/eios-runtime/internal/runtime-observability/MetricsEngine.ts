interface Counter { inc(n?: number): void; value(): number; }
interface Gauge { set(v: number): void; value(): number; }
interface Histogram { record(v: number): void; percentile(p: number): number; }

function createCounter(): Counter {
  let v = 0;
  return { inc: (n = 1) => { v += n; }, value: () => v };
}

function createGauge(): Gauge {
  let v = 0;
  return { set: (n) => { v = n; }, value: () => v };
}

function createHistogram(): Histogram {
  const samples: number[] = [];
  const MAX = 10000;
  return {
    record(v) { samples.push(v); if (samples.length > MAX) samples.shift(); },
    percentile(p) {
      if (samples.length === 0) return 0;
      const sorted = [...samples].sort((a, b) => a - b);
      const idx = Math.ceil(p / 100 * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    },
  };
}

interface MetricSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }>;
}

const counters = new Map<string, Counter>();
const gauges = new Map<string, Gauge>();
const histograms = new Map<string, Histogram>();

export const MetricsEngine = {
  counter(name: string): Counter {
    if (!counters.has(name)) counters.set(name, createCounter());
    return counters.get(name)!;
  },

  gauge(name: string): Gauge {
    if (!gauges.has(name)) gauges.set(name, createGauge());
    return gauges.get(name)!;
  },

  histogram(name: string): Histogram {
    if (!histograms.has(name)) histograms.set(name, createHistogram());
    return histograms.get(name)!;
  },

  snapshot(): MetricSnapshot {
    const c: Record<string, number> = {};
    const g: Record<string, number> = {};
    const h: Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }> = {};

    for (const [k, v] of counters) c[k] = v.value();
    for (const [k, v] of gauges) g[k] = v.value();
    for (const [k, v] of histograms) {
      const values = [v.percentile(50), v.percentile(95), v.percentile(99)];
      h[k] = { avg: values[0], p50: values[0], p95: values[1], p99: values[2], count: 0 };
    }

    return { counters: c, gauges: g, histograms: h };
  },

  reset(): void {
    counters.clear();
    gauges.clear();
    histograms.clear();
  },
};
