export type CircuitState = "closed" | "open" | "half_open";

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

const circuits = new Map<string, { state: CircuitState; failures: number; successes: number; lastFailure: number; config: CircuitConfig }>();

export const CircuitBreaker = {
  register(name: string, config?: Partial<CircuitConfig>): void {
    if (circuits.has(name)) return;
    circuits.set(name, {
      state: "closed",
      failures: 0,
      successes: 0,
      lastFailure: 0,
      config: { failureThreshold: 5, successThreshold: 2, timeoutMs: 30000, ...config },
    });
  },

  state(name: string): CircuitState {
    const c = circuits.get(name);
    if (!c) return "closed";
    if (c.state === "open" && Date.now() - c.lastFailure > c.config.timeoutMs) {
      c.state = "half_open";
    }
    return c.state;
  },

  async call<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const c = circuits.get(name);
    if (!c) return fn();

    if (c.state === "open") {
      if (Date.now() - c.lastFailure > c.config.timeoutMs) {
        c.state = "half_open";
      } else {
        throw new Error(`Circuit breaker open for ${name}`);
      }
    }

    try {
      const result = await fn();
      c.successes++;
      if (c.state === "half_open" && c.successes >= c.config.successThreshold) {
        c.state = "closed";
        c.failures = 0;
        c.successes = 0;
      }
      return result;
    } catch (err) {
      c.failures++;
      c.lastFailure = Date.now();
      if (c.state === "half_open" || c.failures >= c.config.failureThreshold) {
        c.state = "open";
        c.successes = 0;
      }
      throw err;
    }
  },

  reset(name: string): void {
    const c = circuits.get(name);
    if (c) { c.state = "closed"; c.failures = 0; c.successes = 0; }
  },

  getAll(): Array<{ name: string; state: CircuitState; failures: number }> {
    return Array.from(circuits.entries()).map(([name, c]) => ({ name, state: c.state, failures: c.failures }));
  },
};
