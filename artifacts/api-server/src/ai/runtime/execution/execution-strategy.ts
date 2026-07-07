// ECP-019: Execution Strategy — per-cycle completion metrics
// EXPLORE(1) → ANALYZE(2) → CONCLUDE(3) → EXECUTE(4)
// Setiap cycle pindah berdasarkan parameter selesai per-cycle.

import type { ExecutionStrategy } from "./execution-manifest";

class ExecutionStrategyEngine {
  private _strategy: ExecutionStrategy = "EXPLORE";
  private _toolHistory: string[][] = [];
  private _complexity: string = "medium";
  private _cycleCount = 0;
  private _strategyCycleCount = 0; // reset tiap ganti strategy

  get strategy(): ExecutionStrategy { return this._strategy; }
  get cycleCount(): number { return this._cycleCount; }

  setComplexity(c: string): void { this._complexity = c; }
  startAt(s: ExecutionStrategy): void { this._strategy = s; }

  infer(
    toolCalls: { name: string; durationMs: number }[],
    state: string,
    evidenceQuality = 0,
    uniqueFiles = 0,
    confidence = 0,
  ): {
    strategy: ExecutionStrategy;
    changed: boolean;
    reason: string;
  } {
    const previous = this._strategy;
    this._toolHistory.push(toolCalls.map(t => t.name));
    this._cycleCount++;
    this._strategyCycleCount++;

    // Safety: global terlalu lama
    if (this._cycleCount >= 14) { this._strategy = "ESCALATE"; return this._result(previous, "Safety: 14 cycle max"); }
    if (this._cycleCount >= 10) { this._strategy = "CONCLUDE"; return this._result(previous, "Safety: 10 cycle max"); }

    // Anti-loop: tool sama terus
    if (this.detectLoop(evidenceQuality)) {
      this._advanceOnLoop();
      return this._result(previous, `Anti-loop: ${previous} → ${this._strategy}`);
    }

    // ── Per-cycle completion ──
    if (toolCalls.length === 0) {
      // LLM produce text → advance
      this._advanceTextOnly();
      return this._result(previous, `Text response: ${previous} → ${this._strategy}`);
    }

    const names = toolCalls.map(t => t.name);

    // JIKA ADA WRITE TOOL → langsung EXECUTE
    if (names.some(n => ["writeFile", "editFile", "execCommand", "sshExec"].includes(n))) {
      this._strategy = "EXECUTE";
      return this._result(previous, `Write tool: ${previous} → EXECUTE`);
    }

    // ── CYCLE 1: EXPLORE ──
    if (this._strategy === "EXPLORE") {
      const isSearch = names.some(n => ["searchContent", "listDirectory", "fetchGitHubDir", "grep", "glob"].includes(n));
      const isRead = names.some(n => ["readFile", "fetchGitHubFile", "getDependencies"].includes(n));
      if (!isSearch && !isRead) return this._result(previous, "unchanged");

      // Complete: target teridentifikasi (≥1 file unik dibaca) ATAU max cycles
      const maxExploreCycles = evidenceQuality > 0.60 ? 4 : evidenceQuality < 0.20 ? 8 : 5;
      if (uniqueFiles >= 1 || this._strategyCycleCount >= maxExploreCycles) {
        this._strategy = "ANALYZE";
        this._strategyCycleCount = 0;
        return this._result(previous, `EXPLORE selesai: uniqueFiles=${uniqueFiles}, strategyCycles=${this._strategyCycleCount}`);
      }
      return this._result(previous, "unchanged");
    }

    // ── CYCLE 2: ANALYZE ──
    if (this._strategy === "ANALYZE") {
      const isRead = names.some(n => ["readFile", "fetchGitHubFile", "getDependencies", "searchContent"].includes(n));
      if (!isRead) return this._result(previous, "unchanged");

      // Complete: file sudah dibaca, confidence cukup, ATAU max cycles
      const maxAnalyzeCycles = evidenceQuality > 0.60 ? 4 : evidenceQuality < 0.20 ? 7 : 5;
      if ((confidence >= 50 && uniqueFiles >= 1) || this._strategyCycleCount >= maxAnalyzeCycles) {
        this._strategy = "CONCLUDE";
        this._strategyCycleCount = 0;
        return this._result(previous, `ANALYZE selesai: confidence=${confidence}, uniqueFiles=${uniqueFiles}`);
      }
      return this._result(previous, "unchanged");
    }

    return this._result(previous, "unchanged");
  }

  private _advanceTextOnly(): void {
    if (this._strategy === "EXPLORE") { this._strategy = "ANALYZE"; this._strategyCycleCount = 0; }
    else if (this._strategy === "ANALYZE") { this._strategy = "CONCLUDE"; this._strategyCycleCount = 0; }
  }

  private _advanceOnLoop(): void {
    if (this._strategy === "EXPLORE") { this._strategy = "ANALYZE"; this._strategyCycleCount = 0; }
    else if (this._strategy === "ANALYZE") { this._strategy = "CONCLUDE"; this._strategyCycleCount = 0; }
    else if (this._strategy === "EXECUTE") { this._strategy = "CONCLUDE"; this._strategyCycleCount = 0; }
  }

  private _result(previous: string, reason: string): { strategy: ExecutionStrategy; changed: boolean; reason: string } {
    return { strategy: this._strategy, changed: previous !== this._strategy, reason };
  }

  getDirective(): string {
    const d: Record<ExecutionStrategy, string> = {
      EXPLORE: "[SYSTEM] CYCLE 1: EXPLORE. Cari dan identifikasi file target. Gunakan grep, glob, listDirectory, readFile sampai target teridentifikasi dengan jelas. Jangan setengah-setengah.",
      ANALYZE: "[SYSTEM] CYCLE 2: ANALYZE. Baca file target secara mendalam. searchContent, readFile, getDependencies. Pahami alur, struktur, dan temukan akar masalah.",
      CONCLUDE: "[SYSTEM] CYCLE 3: CONCLUDE. Gabungkan hasil EXPLORE + ANALYZE. Berikan analisis lengkap, rekomendasi, dan tentukan apakah ada file yg perlu diubah. Minta persetujuan Founder.",
      EXECUTE: "[SYSTEM] CYCLE 4: EXECUTE. Implementasi perubahan berdasarkan analisis yg sudah disetujui. writeFile, editFile, execCommand. Hanya jalankan jika Founder sudah setuju.",
      ESCALATE: "[SYSTEM] ESCALATE. Tidak bisa diselesaikan dengan sumber daya saat ini. Laporkan temuan sejauh ini.",
    };
    return d[this._strategy];
  }

  private detectLoop(evidenceQuality = 0): boolean {
    const lookback = evidenceQuality > 0.60 ? 2 : 3;
    const recent = this._toolHistory.slice(-lookback);
    if (recent.length < lookback) return false;
    const allSameTool = recent.every(tools => tools.length === 1 && tools[0] === recent[0][0]);
    const allSearch = recent.every(tools => tools.some(t => ["searchContent", "listDirectory", "fetchGitHubDir"].includes(t)));
    return allSameTool || allSearch;
  }

  reset(): void {
    this._strategy = "EXPLORE";
    this._toolHistory = [];
    this._cycleCount = 0;
    this._strategyCycleCount = 0;
  }
}

export { ExecutionStrategyEngine };