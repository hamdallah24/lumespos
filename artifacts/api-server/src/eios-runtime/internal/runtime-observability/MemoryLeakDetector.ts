interface LeakReport {
  detected: boolean;
  suspiciousObjects: Array<{ name: string; count: number; growth: number }>;
  warnings: string[];
}

let lastSnapshot: Record<string, number> = {};

function getContextCounts(): Record<string, number> {
  return {
    activeSpans: 0,
    completedSpans: 0,
    activeObservers: 0,
    queuedTasks: 0,
    activePipelines: 0,
  };
}

export const MemoryLeakDetector = {
  scan(): LeakReport {
    const current = getContextCounts();
    const suspicious: Array<{ name: string; count: number; growth: number }> = [];
    const warnings: string[] = [];

    for (const [key, count] of Object.entries(current)) {
      const prev = lastSnapshot[key] || 0;
      const growth = count - prev;
      if (growth > 1000) {
        suspicious.push({ name: key, count, growth });
        warnings.push(`Suspicious growth in "${key}": ${prev} → ${count} (${growth} new)`);
      } else if (count > 10000) {
        warnings.push(`High count in "${key}": ${count} entries — possible leak`);
      }
    }

    lastSnapshot = current;

    return { detected: suspicious.length > 0, suspiciousObjects: suspicious, warnings };
  },

  reset(): void { lastSnapshot = {}; },
};
