// ECP-030: Consultant Scheduler — background task runner
// Frozen. Runs Consultant maintenance cycles automatically.
// 02:00 Knowledge Audit, 03:00 Architecture Review, 04:00 Weekly Report.

import { consultantRuntime } from "./consultant-runtime";

class ConsultantScheduler {
  private _intervals: NodeJS.Timeout[] = [];
  private _running = false;

  start(): void {
    if (this._running) return;
    this._running = true;

    // Daily: knowledge maintenance at 02:00 UTC (~07:00 WIB)
    this.schedule(2, () => {
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
    next.setUTCHours(hourUTC, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const msUntil = next.getTime() - now.getTime();
    setTimeout(() => {
      task();
      // Re-schedule for next day
      this.schedule(hourUTC, task);
    }, msUntil);

    this._intervals.push(setTimeout(() => {}, msUntil));
  }
}

export const consultantScheduler = new ConsultantScheduler();
