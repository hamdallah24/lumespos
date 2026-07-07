// ECP-019: Execution Strategy — 4-cycle state machine
// EXPLORE(1) → ANALYZE(2) → CONCLUDE(3) → EXECUTE(4) → ESCALATE
// Setiap cycle COMPLETE dulu sebelum lanjut. Budget bukan hard stop.

import type { ExecutionStrategy, JournalEntry } from "./execution-manifest";

class ExecutionStrategyEngine {
  private _strategy: ExecutionStrategy = "EXPLORE";
  private _toolHistory: string[][] = [];
  private _complexity: string = "medium";
  private _cycleCount = 0;

  get strategy(): ExecutionStrategy { return this._strategy; }
  get cycleCount(): number { return this._cycleCount; }

  setComplexity(c: string): void { this._complexity = c; }

  /** Override initial strategy (skip EXPLORE when target files known) */
  startAt(s: ExecutionStrategy): void { this._strategy = s; }

  /** Infer strategy — simple progression based on tool behavior */
  infer(
    toolCalls: { name: string; durationMs: number }[],
    state: string,
    evidenceQuality = 0,
  ): {
    strategy: ExecutionStrategy;
    changed: boolean;
    reason: string;
  } {
    const previous = this._strategy;
    this._toolHistory.push(toolCalls.map(t => t.name));
    this._cycleCount++;

    // Safety: stuck terlalu lama → force advance
    if (this._cycleCount >= 10) { this._strategy = "CONCLUDE"; }
    if (this._cycleCount >= 14) { this._strategy = "ESCALATE"; }

    // Adaptive: evidence tinggi → advance lebih cepat
    const maxExplore = evidenceQuality > 0.60 ? 3 : evidenceQuality < 0.20 ? 7 : 5;
    const maxAnalyze = evidenceQuality > 0.60 ? 3 : evidenceQuality < 0.20 ? 6 : 4;

    if (toolCalls.length === 0) {
      // Text-only response → advance
      if (this._strategy === "EXPLORE") this._strategy = "ANALYZE";
      else if (this._strategy === "ANALYZE") this._strategy = "CONCLUDE";
    } else {
      // Tool calls → determine strategy by tool type
      const names = toolCalls.map(t => t.name);
      const isWrite = names.some(n => ["writeFile", "editFile", "execCommand", "sshExec"].includes(n));
      const isSearch = names.some(n => ["searchContent", "listDirectory", "fetchGitHubDir", "grep", "glob"].includes(n));
      const isRead = names.some(n => ["readFile", "fetchGitHubFile", "getDependencies"].includes(n));

      if (isWrite) this._strategy = "EXECUTE";
      else if (isSearch || isRead) {
        // Stay in EXPLORE if still searching for targets, ANALYZE if reading known files
        if (this._strategy === "EXPLORE" && this._cycleCount >= maxExplore) this._strategy = "ANALYZE";
        else if (this._strategy === "ANALYZE" && this._cycleCount >= maxAnalyze) this._strategy = "CONCLUDE";
      }
    }

    // Anti-loop: tool sama terus → advance
    if (this.detectLoop(evidenceQuality)) {
      if (this._strategy === "EXPLORE") this._strategy = "ANALYZE";
      else if (this._strategy === "ANALYZE") this._strategy = "CONCLUDE";
      else if (this._strategy === "EXECUTE") this._strategy = "CONCLUDE";
    }

    const changed = previous !== this._strategy;
    return { strategy: this._strategy, changed, reason: changed ? `${previous} → ${this._strategy}` : "unchanged" };
  }

  /** Get system directive for strategy */
  getDirective(): string {
    const directives: Record<ExecutionStrategy, string> = {
      EXPLORE: "[SYSTEM] CYCLE 1: EXPLORE. Cari dan identifikasi file target. Gunakan grep, glob, listDirectory, readFile sampai target teridentifikasi dengan jelas. Jangan setengah-setengah.",
      ANALYZE: "[SYSTEM] CYCLE 2: ANALYZE. Baca file target secara mendalam. searchContent, readFile, getDependencies. Pahami alur, struktur, dan temukan akar masalah.",
      CONCLUDE: "[SYSTEM] CYCLE 3: CONCLUDE. Gabungkan hasil EXPLORE + ANALYZE. Berikan analisis lengkap, rekomendasi, dan tentukan apakah ada file yg perlu diubah. Minta persetujuan Founder.",
      EXECUTE: "[SYSTEM] CYCLE 4: EXECUTE. Implementasi perubahan berdasarkan analisis yg sudah disetujui. writeFile, editFile, execCommand. Hanya jalankan jika Founder sudah setuju.",
      ESCALATE: "[SYSTEM] ESCALATE. Tidak bisa diselesaikan dengan sumber daya saat ini. Laporkan temuan sejauh ini.",
    };
    return directives[this._strategy];
  }

  private detectLoop(evidenceQuality = 0): boolean {
    const lookback = evidenceQuality > 0.60 ? 2 : 3;
    const recent = this._toolHistory.slice(-lookback);
    if (recent.length < lookback) return false;
    const allSameTool = recent.every(tools =>
      tools.length === 1 && tools[0] === recent[0][0]
    );
    const allSearch = recent.every(tools =>
      tools.some(t => ["searchContent", "listDirectory", "fetchGitHubDir"].includes(t))
    );
    return allSameTool || allSearch;
  }

  reset(): void {
    this._strategy = "EXPLORE";
    this._toolHistory = [];
    this._cycleCount = 0;
  }
}

export { ExecutionStrategyEngine };