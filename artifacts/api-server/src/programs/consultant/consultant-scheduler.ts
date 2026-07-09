// ECP-030: Consultant Scheduler — background task runner
// Runs CKO maintenance + project discovery nightly.
// 02:00 Project Discovery, 02:30 Knowledge Audit, 03:00 Weekly Report.

import { consultantRuntime } from "./consultant-runtime";
import { consultantDiscovery } from "./consultant-discovery";

class ConsultantScheduler {
  private _intervals: NodeJS.Timeout[] = [];
  private _running = false;

  start(): void {
    if (this._running) return;
    this._running = true;

    // Run discovery immediately on startup (if no file-map yet), then nightly
    try {
      const existing = consultantDiscovery.load();
      if (!existing) {
        console.log("[CKO] No file map found — running initial project discovery...");
        const map = consultantDiscovery.scan();
        console.log(`[CKO] Initial discovery complete: ${Object.keys(map).length} keywords mapped`);
      } else {
        console.log(`[CKO] File map loaded: ${Object.keys(existing).length} keywords`);
      }
    } catch (e: any) {
      console.log(`[CKO] Discovery skipped: ${e.message}`);
    }

    // Daily: project structure discovery at 02:00 UTC
    this.schedule(2, () => {
      console.log("[CKO] Running nightly project discovery...");
      const map = consultantDiscovery.scan();
      console.log(`[CKO] Discovery complete: ${Object.keys(map).length} keywords mapped`);
    });

    // Daily: knowledge maintenance at 02:30 UTC
    this.schedule(2.5, () => {
      const results = consultantRuntime.maintenance();
      console.log(`[CKO] Daily maintenance: ${results.map(r => r.result).join("; ")}`);
    });

    // Monthly: full health report
    this._intervals.push(setInterval(() => {
      const results = consultantRuntime.maintenance();
      const monthly = results.find(r => r.mode === "monthly_review");
      if (monthly) console.log(`[CKO] Monthly report:\n${monthly.result.slice(0, 500)}`);
    }, 30 * 86400000));
  }

  stop(): void {
    this._running = false;
    for (const interval of this._intervals) clearInterval(interval);
    this._intervals = [];
  }

  private schedule(hourUTC: number, task: () => void): void {
    const now = new Date();
    const next = new Date(now);
    const intHour = Math.floor(hourUTC);
    const intMin = Math.round((hourUTC - intHour) * 60);
    next.setUTCHours(intHour, intMin, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const msUntil = next.getTime() - now.getTime();
    setTimeout(() => {
      task();
      this.schedule(hourUTC, task);
    }, msUntil);

    this._intervals.push(setTimeout(() => {}, msUntil));
  }
}

export const consultantScheduler = new ConsultantScheduler();
