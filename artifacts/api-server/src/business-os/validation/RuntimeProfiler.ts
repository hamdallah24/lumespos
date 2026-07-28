export class RuntimeProfiler {
  private marks: Map<string, number> = new Map();
  private entries: { stage: string; durationMs: number; timestamp: string }[] = [];

  reset(): void {
    this.marks.clear();
    this.entries = [];
  }

  start(stage: string): void {
    this.marks.set(stage, Date.now());
  }

  end(stage: string): number {
    const start = this.marks.get(stage);
    if (start === undefined) return 0;
    const duration = Date.now() - start;
    this.entries.push({ stage, durationMs: duration, timestamp: new Date().toISOString() });
    return duration;
  }

  measure<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    this.start(stage);
    return fn().finally(() => { this.end(stage); });
  }

  getEntries(): { stage: string; durationMs: number; timestamp: string }[] {
    return [...this.entries];
  }

  getTotalMs(): number {
    return this.entries.reduce((s, e) => s + e.durationMs, 0);
  }

  getTable(): string {
    if (this.entries.length === 0) return "(no data)";
    const lines = this.entries.map(e => `  ${e.stage.padEnd(25)} ${String(e.durationMs).padStart(6)} ms`);
    lines.push(`  ${"─".repeat(33)}`);
    lines.push(`  ${"TOTAL".padEnd(25)} ${String(this.getTotalMs()).padStart(6)} ms`);
    return lines.join("\n");
  }

  getAverageMs(): number {
    return this.entries.length > 0 ? this.getTotalMs() / this.entries.length : 0;
  }
}
