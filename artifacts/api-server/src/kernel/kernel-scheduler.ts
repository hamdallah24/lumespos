// ECP-035: Kernel Scheduler — centralized organizational scheduler
// Frozen. Mission scheduling, consultant analysis, knowledge maintenance, learning cycles.

class KernelScheduler {
  private _intervals: ReturnType<typeof setInterval>[] = [];

  /** Schedule a recurring task */
  schedule(name: string, intervalMs: number, task: () => void): void {
    console.log(`[Kernel] Scheduled: ${name} (every ${intervalMs / 1000}s)`);
    const id = setInterval(() => {
      try { task(); } catch (e) { console.error(`[Kernel] Scheduler error (${name}):`, e); }
    }, intervalMs);
    this._intervals.push(id);
  }

  /** Schedule a one-time task with delay */
  scheduleOnce(name: string, delayMs: number, task: () => void): void {
    console.log(`[Kernel] Scheduled once: ${name} (in ${delayMs / 1000}s)`);
    setTimeout(() => {
      try { task(); } catch (e) { console.error(`[Kernel] Scheduler error (${name}):`, e); }
    }, delayMs);
  }

  stop(): void {
    for (const id of this._intervals) clearInterval(id);
    this._intervals = [];
  }
}

export const kernelScheduler = new KernelScheduler();
