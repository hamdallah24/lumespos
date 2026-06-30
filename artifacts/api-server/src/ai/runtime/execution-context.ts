// SPRINT 3.5 + ECP-010: Engineering Runtime Telemetry
// Per-request observable lifecycle with state machine, events, timeline.

export interface TraceStep {
  component: string;
  action: string;
  startedAt: number;
  durationMs?: number;
  status: "pending" | "ok" | "error" | "timeout";
  error?: string;
  metadata?: Record<string, any>;
}

export interface ToolTrace {
  name: string;
  durationMs: number;
  status: "ok" | "error";
  error?: string;
}

// ── Telemetry Types ──

export enum RuntimeState {
  RECEIVED = "RECEIVED",
  UNDERSTANDING = "UNDERSTANDING",
  PLANNING = "PLANNING",
  KNOWLEDGE_LOADING = "KNOWLEDGE_LOADING",
  TOOL_EXECUTION = "TOOL_EXECUTION",
  REASONING = "REASONING",
  VALIDATION = "VALIDATION",
  DELIVERY = "DELIVERY",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface RuntimeEvent {
  state: RuntimeState;
  phase?: "start" | "end" | "raw" | "cleaned" | "remembered" | "streaming";
  timestampMs: number;           // ms from request start
  durationMs?: number;
  metadata?: Record<string, any>;
}

type Verdict = "PASS" | "WARNING" | "FAILED";

export class ExecutionContext {
  readonly requestId: string;
  readonly startedAt: number;
  readonly userId: number;
  readonly mode: string;

  trace: TraceStep[] = [];
  tools: ToolTrace[] = [];
  errors: { step: string; message: string }[] = [];
  metrics: Record<string, number> = {};
  events: RuntimeEvent[] = [];

  private _currentStep: TraceStep | null = null;
  private _currentState: RuntimeState = RuntimeState.RECEIVED;

  constructor(userId: number, mode: string) {
    this.requestId = `REQ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = Date.now();
    this.userId = userId;
    this.mode = mode;
    this.events.push({ state: RuntimeState.RECEIVED, timestampMs: 0 });
  }

  // ── State Machine ──

  setState(state: RuntimeState): void {
    const now = Date.now();
    const elapsed = now - this.startedAt;
    const prevDuration = this.events.length > 0
      ? elapsed - (this.events[this.events.length - 1]?.timestampMs || 0)
      : 0;

    this._currentState = state;
    this.events.push({
      state,
      timestampMs: elapsed,
      durationMs: prevDuration,
    });
  }

  addEvent(event: RuntimeEvent): void {
    // Ensure timestamp is relative to startedAt
    if (!event.timestampMs) event.timestampMs = Date.now() - this.startedAt;
    this.events.push(event);
  }

  get currentState(): RuntimeState { return this._currentState; }

  // ── Pipeline Steps (existing) ──

  step(component: string, action: string, metadata?: Record<string, any>): void {
    this._currentStep = { component, action, startedAt: Date.now(), status: "pending", metadata };
  }

  end(status: "ok" | "error" = "ok", error?: string): void {
    if (!this._currentStep) return;
    this._currentStep.durationMs = Date.now() - this._currentStep.startedAt;
    this._currentStep.status = status;
    if (error) this._currentStep.error = error;
    this.trace.push({ ...this._currentStep });
    if (status === "error") this.errors.push({ step: this._currentStep.component, message: error || "unknown" });
    this._currentStep = null;
  }

  tool(name: string, durationMs: number, error?: string): void {
    this.tools.push({ name, durationMs, status: error ? "error" : "ok", error });
  }

  setMetric(key: string, value: number): void { this.metrics[key] = value; }
  incMetric(key: string): void { this.metrics[key] = (this.metrics[key] || 0) + 1; }

  get totalDurationMs(): number { return Date.now() - this.startedAt; }

  // ── Timeline (for PM2 + future dashboards) ──

  getTimeline(): RuntimeEvent[] {
    return [...this.events];
  }

  get verdict(): Verdict {
    if (this.errors.length > 0) return "FAILED";
    if (this._currentState === RuntimeState.COMPLETED) return "PASS";
    return "WARNING";
  }

  report(): string {
    const lines = [
      `═══ ${this.requestId} ═══`,
    ];

    for (const ev of this.events) {
      const icon = ev.state === RuntimeState.FAILED ? "❌"
        : ev.state === RuntimeState.COMPLETED ? "✅"
        : "▸";
      const meta = ev.metadata ? ` (${Object.entries(ev.metadata).map(([k,v]) => `${k}:${v}`).join(", ")})` : "";
      lines.push(`${String(ev.timestampMs).padStart(6)}ms ▸ ${ev.state}${meta}`);
    }

    const toolCount = this.tools.length;
    const tokenCount = this.metrics?.tokenCount || 0;
    lines.push(`═══ ${this.verdict} | ${this.totalDurationMs}ms | Tools: ${toolCount} | Tokens: ${tokenCount} ═══`);

    return lines.join("\n");
  }
}
