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
  private _needsImpl = false;

  constructor(needsImpl = false) {
    this._needsImpl = needsImpl;
    console.log(`[STRATEGY:DEBUG] StrategyEngine constructed — needsImpl=${needsImpl}`);
  }

  get strategy(): ExecutionStrategy { return this._strategy; }
  get cycleCount(): number { return this._cycleCount; }

  setComplexity(c: string): void { this._complexity = c; }
  startAt(s: ExecutionStrategy): void { this._strategy = s; console.log(`[STRATEGY:DEBUG] startAt called — strategy=${s}`); }
  setNeedsImpl(v: boolean): void { this._needsImpl = v; console.log(`[STRATEGY:DEBUG] setNeedsImpl called — value=${v}`); }

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

    // Safety: global terlalu lama — soft guard, hard limit 50 cycle
    if (this._cycleCount >= 50) { this._strategy = "ESCALATE"; return this._result(previous, "Safety: 50 cycle max"); }

    // Anti-loop: tool sama terus
    if (this.detectLoop(evidenceQuality)) {
      this._advanceOnLoop();
      return this._result(previous, `Anti-loop: ${previous} → ${this._strategy}`);
    }

    // ── Per-cycle completion ──
    if (toolCalls.length === 0) {
      // LLM produce text → advance (kecuali CONCLUDE dengan needsImpl → EXECUTE)
      if (this._strategy === "CONCLUDE" && this._needsImpl) {
        this._strategy = "EXECUTE";
        this._strategyCycleCount = 0;
        return this._result(previous, `CONCLUDE→EXECUTE (needsImpl)`);
      }
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

      // Complete: minimal 1 file unik dibaca (readFile) ATAU soft max cycles
      const maxExploreCycles = evidenceQuality > 0.60 ? 20 : evidenceQuality < 0.20 ? 30 : 25;
      if (uniqueFiles >= Math.min(this._strategyCycleCount, 2) || this._strategyCycleCount >= maxExploreCycles) {
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

      // Complete: file sudah dibaca, confidence cukup, ATAU soft max cycles
      const maxAnalyzeCycles = evidenceQuality > 0.60 ? 15 : evidenceQuality < 0.20 ? 25 : 20;
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
    console.log(`[STRATEGY:DEBUG] _advanceTextOnly called — strategy=${this._strategy} needsImpl=${this._needsImpl}`);
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
      EXPLORE: "[GOVERNOR] SEKARANG: CYCLE 1 - EXPLORE. Cari file target. WAJIB GUNAKAN TOOLS. Pipeline: searchContent → cari file relevan. listDirectory → lihat struktur folder. WAJIB baca file yang ditemukan dengan readFile(). searchContent TANPA readFile = TIDAK LENGKAP. JANGAN gunakan execCommand untuk baca file.",
      ANALYZE: "[GOVERNOR] SEKARANG: CYCLE 2 - ANALYZE. Baca file dengan readFile(). Pahami isi kode. JANGAN pakai wc/grep/cat — pakai readFile(). WAJIB GUNAKAN TOOLS.",
      CONCLUDE: `[GOVERNOR] SEKARANG: CYCLE 3 - CONCLUDE. Berikan analisis berdasarkan FILE yang sudah dibaca.

## Root Cause
[JELASKAN penyebab utama dengan detail]

## Verified Evidence
[Jelaskan temuan dan analisis. Kutip baris kode spesifik jika relevan.]

## Rekomendasi Teknis
1. [Langkah spesifik dengan justifikasi]
2. [Langkah spesifik dengan justifikasi]
3. [Langkah spesifik dengan justifikasi]

## Confidence
[XX]% — [alasan detail]`,
      EXECUTE: "[GOVERNOR] SEKARANG: CYCLE 4 - EXECUTE. Implementasi perubahan yg sudah disetujui CEO/Founder. Anda SUDAH mendapat persetujuan. Gunakan analisis CONCLUDE Anda untuk menentukan file dan perubahan yang diperlukan. WAJIB: (1) BACA file target dengan readFile untuk verifikasi kondisi terkini. (2) Gunakan editFile untuk perubahan TERSARANG (oldString UNIK) atau writeFile untuk file baru. (3) JANGAN tulis ulang seluruh file jika hanya perlu edit beberapa baris. (4) Verifikasi hasil dengan readFile. (5) Laporkan perubahan yang dilakukan.",
      ESCALATE: "[GOVERNOR] ESCALATE. Tidak bisa diselesaikan. Laporkan temuan.",
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