// ConfigCenter — Milestone 4 Phase 1: Generic Background Scheduler.
// Pure scheduling primitive. Deliberately knows NOTHING about Snapshot, Health,
// Audit or any config capability. Concepts: Job, Interval, Tick, Execute.
// Automation phases register their own jobs; this module never imports domain
// modules, keeping the dependency boundary one-directional (automation consumes).

export type JobId = string;

export type JobExecutionStatus = "idle" | "running" | "success" | "error";

export type JobStatus = "enabled" | "disabled";

export interface JobExecutionContext {
  jobId: JobId;
  name: string;
  manual: boolean;
  startedAt: number;
}

export type JobExecuteFn = (ctx: JobExecutionContext) => void | Promise<void>;

export interface JobDefinition {
  id: JobId;
  name: string;
  intervalMs: number;
  enabled?: boolean;
  execute: JobExecuteFn;
}

export interface JobExecutionRecord {
  jobId: JobId;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: JobExecutionStatus;
  manual: boolean;
  error?: string;
}

export interface JobState {
  id: JobId;
  name: string;
  intervalMs: number;
  enabled: boolean;
  status: JobStatus;
  lastRunAt: number | null;
  lastStatus: JobExecutionStatus | null;
  nextRunAt: number | null;
  runCount: number;
  errorCount: number;
  history: JobExecutionRecord[];
}

export interface SchedulerSnapshot {
  jobs: JobState[];
  totalExecutions: number;
  runningCount: number;
}

export interface BackgroundSchedulerOptions {
  tickIntervalMs?: number;
  maxHistoryPerJob?: number;
  now?: () => number;
}

interface RegisteredJob extends JobDefinition {
  enabled: boolean;
  lastRunAt: number | null;
  lastStatus: JobExecutionStatus | null;
  runCount: number;
  errorCount: number;
  nextRunAt: number | null;
  history: JobExecutionRecord[];
}

export class BackgroundScheduler {
  private readonly jobs = new Map<JobId, RegisteredJob>();
  private readonly running = new Set<JobId>();
  private readonly tickIntervalMs: number;
  private readonly maxHistoryPerJob: number;
  private readonly nowFn: () => number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private totalExecutions = 0;

  constructor(options: BackgroundSchedulerOptions = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;
    this.maxHistoryPerJob = options.maxHistoryPerJob ?? 50;
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  register(job: JobDefinition): JobState {
    if (this.jobs.has(job.id)) {
      throw new Error(`job already registered: ${job.id}`);
    }
    if (!Number.isFinite(job.intervalMs) || job.intervalMs <= 0) {
      throw new Error(`job interval must be a positive number: ${job.id}`);
    }
    const registered: RegisteredJob = {
      ...job,
      enabled: job.enabled ?? true,
      lastRunAt: null,
      lastStatus: null,
      runCount: 0,
      errorCount: 0,
      history: [],
      nextRunAt: job.enabled === false ? null : this.now() + job.intervalMs,
    };
    this.jobs.set(job.id, registered);
    return this.stateOf(registered);
  }

  unregister(jobId: JobId): boolean {
    return this.jobs.delete(jobId);
  }

  has(jobId: JobId): boolean {
    return this.jobs.has(jobId);
  }

  enable(jobId: JobId): void {
    const job = this.requireJob(jobId);
    job.enabled = true;
    if (job.nextRunAt == null) {
      job.nextRunAt = this.now() + job.intervalMs;
    }
  }

  disable(jobId: JobId): void {
    const job = this.requireJob(jobId);
    job.enabled = false;
    job.nextRunAt = null;
  }

  isEnabled(jobId: JobId): boolean {
    return this.requireJob(jobId).enabled;
  }

  setInterval(jobId: JobId, intervalMs: number): void {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new Error(`job interval must be a positive number: ${jobId}`);
    }
    this.requireJob(jobId).intervalMs = intervalMs;
  }

  // Manual execution — runs immediately regardless of interval/enabled state.
  async runNow(jobId: JobId): Promise<JobExecutionRecord> {
    return this.execute(jobId, true);
  }

  status(jobId: JobId): JobState | null {
    const job = this.jobs.get(jobId);
    return job ? this.stateOf(job) : null;
  }

  list(): JobState[] {
    return [...this.jobs.values()].map((job) => this.stateOf(job));
  }

  snapshot(): SchedulerSnapshot {
    return {
      jobs: this.list(),
      totalExecutions: this.totalExecutions,
      runningCount: this.running.size,
    };
  }

  // Start the tick loop.
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  // Evaluate due jobs and run them. Returns the records for completed runs.
  async tick(): Promise<JobExecutionRecord[]> {
    const now = this.now();
    const due = [...this.jobs.values()].filter((job) => job.enabled && !this.running.has(job.id) && job.nextRunAt != null && job.nextRunAt <= now);
    const records: JobExecutionRecord[] = [];
    for (const job of due) {
      records.push(await this.execute(job.id, false));
    }
    return records;
  }

  private async execute(jobId: JobId, manual: boolean): Promise<JobExecutionRecord> {
    const job = this.requireJob(jobId);
    if (this.running.has(jobId)) {
      throw new Error(`job already running: ${jobId}`);
    }
    this.running.add(jobId);
    const startedAt = this.now();
    let status: JobExecutionStatus = "success";
    let error: string | undefined;
    try {
      await job.execute({ jobId: job.id, name: job.name, manual, startedAt });
    } catch (err) {
      status = "error";
      error = err instanceof Error ? err.message : String(err);
    } finally {
      this.running.delete(jobId);
    }
    const finishedAt = this.now();
    const record: JobExecutionRecord = {
      jobId: job.id,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      status,
      manual,
      error,
    };
    job.history.push(record);
    if (job.history.length > this.maxHistoryPerJob) {
      job.history.splice(0, job.history.length - this.maxHistoryPerJob);
    }
    job.lastRunAt = finishedAt;
    job.lastStatus = status;
    job.runCount += 1;
    job.errorCount += status === "error" ? 1 : 0;
    job.nextRunAt = finishedAt + job.intervalMs;
    this.totalExecutions += 1;
    return record;
  }

  private stateOf(job: RegisteredJob): JobState {
    return {
      id: job.id,
      name: job.name,
      intervalMs: job.intervalMs,
      enabled: job.enabled,
      status: job.enabled ? "enabled" : "disabled",
      lastRunAt: job.lastRunAt,
      lastStatus: job.lastStatus,
      nextRunAt: job.nextRunAt,
      runCount: job.runCount,
      errorCount: job.errorCount,
      history: [...job.history],
    };
  }

  private requireJob(jobId: JobId): RegisteredJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`job not registered: ${jobId}`);
    return job;
  }
}
