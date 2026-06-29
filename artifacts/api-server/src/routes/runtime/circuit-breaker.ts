// SPRINT 4: Circuit Breaker — state machine preventing cascading failures
// CLOSED → OPEN (failure threshold exceeded)
// OPEN → HALF_OPEN (cooldown elapsed)
// HALF_OPEN → CLOSED (test succeeds) or OPEN (test fails)

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerConfig {
  name: string;
  failureThreshold: number;    // failures before opening
  failureWindowMs: number;     // time window for counting failures
  cooldownMs: number;          // time before trying HALF_OPEN
  halfOpenLimit: number;       // max requests in HALF_OPEN
  onStateChange?: (state: CircuitState) => void;
}

class CircuitBreaker {
  readonly name: string;
  state: CircuitState = "CLOSED";
  private failures: number[] = [];  // timestamps of failures
  private config: BreakerConfig;
  private openedAt: number = 0;
  private halfOpenCount: number = 0;

  constructor(config: BreakerConfig) {
    this.name = config.name;
    this.config = config;
  }

  /** Check if request should be allowed */
  allow(): { allowed: boolean; reason?: string } {
    const now = Date.now();

    if (this.state === "CLOSED") {
      this.pruneFailures(now);
      return { allowed: true };
    }

    if (this.state === "OPEN") {
      if (now - this.openedAt >= this.config.cooldownMs) {
        this.transition("HALF_OPEN");
        this.halfOpenCount = 0;
        return { allowed: true };
      }
      const remaining = Math.ceil((this.config.cooldownMs - (now - this.openedAt)) / 1000);
      return { allowed: false, reason: `Circuit OPEN for ${this.name} — retry in ${remaining}s` };
    }

    // HALF_OPEN
    if (this.halfOpenCount >= this.config.halfOpenLimit) {
      return { allowed: false, reason: `Circuit HALF_OPEN limit reached for ${this.name}` };
    }
    this.halfOpenCount++;
    return { allowed: true };
  }

  /** Record a successful request */
  success(): void {
    if (this.state === "HALF_OPEN") {
      this.transition("CLOSED");
      this.failures = [];
    }
  }

  /** Record a failed request */
  failure(): void {
    const now = Date.now();
    this.failures.push(now);

    if (this.state === "HALF_OPEN") {
      this.transition("OPEN");
      this.openedAt = now;
      return;
    }

    this.pruneFailures(now);
    if (this.failures.length >= this.config.failureThreshold) {
      this.transition("OPEN");
      this.openedAt = now;
    }
  }

  /** Record a request that timed out (same as failure) */
  timeout(): void {
    this.failure();
  }

  private transition(newState: CircuitState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    console.log(`[CircuitBreaker] ${this.name}: ${oldState} → ${newState}`);
    this.config.onStateChange?.(newState);
  }

  private pruneFailures(now: number): void {
    const cutoff = now - this.config.failureWindowMs;
    this.failures = this.failures.filter(t => t > cutoff);
  }

  /** Get health status */
  status(): { state: CircuitState; failureCount: number; openedAt?: number } {
    return {
      state: this.state,
      failureCount: this.failures.length,
      openedAt: this.state !== "CLOSED" ? this.openedAt : undefined,
    };
  }
}

// ── Pre-configured breakers ──

export const deepseekBreaker = new CircuitBreaker({
  name: "DeepSeek",
  failureThreshold: 3,
  failureWindowMs: 30000,
  cooldownMs: 60000,
  halfOpenLimit: 1,
  onStateChange: (state) => {
    if (state === "OPEN") console.warn("[CircuitBreaker] DeepSeek circuit OPEN — pausing requests for 60s");
    if (state === "CLOSED") console.log("[CircuitBreaker] DeepSeek circuit CLOSED — resuming normal operation");
  },
});

export const githubBreaker = new CircuitBreaker({
  name: "GitHub",
  failureThreshold: 5,
  failureWindowMs: 60000,
  cooldownMs: 120000,
  halfOpenLimit: 1,
});

export const sshBreaker = new CircuitBreaker({
  name: "SSH",
  failureThreshold: 2,
  failureWindowMs: 30000,
  cooldownMs: 30000,
  halfOpenLimit: 1,
});

// ── Component metadata ──

export const circuitBreakerSystem = {
  name: "CircuitBreaker",
  version: "1.0.0",
  capabilities: ["failure-detection", "state-machine", "cascading-failure-prevention"],
  dependencies: [],
  health: () => ({
    status: "healthy" as const, uptime: 0, dependencies: [],
    version: "1.0.0",
    custom: {
      deepseek: deepseekBreaker.status(),
      github: githubBreaker.status(),
      ssh: sshBreaker.status(),
    },
  }),

  /** Wrapper: execute fn with circuit breaker protection */
  async execute<T>(breaker: CircuitBreaker, fn: () => Promise<T>, timeoutMs = 30000): Promise<T> {
    const check = breaker.allow();
    if (!check.allowed) throw new Error(`CircuitBreaker: ${check.reason}`);

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CircuitBreaker: timeout")), timeoutMs)),
      ]);
      breaker.success();
      return result;
    } catch (e) {
      const isTimeout = (e as Error).message?.includes("timeout");
      if (isTimeout) breaker.timeout();
      else breaker.failure();
      throw e;
    }
  },
};
