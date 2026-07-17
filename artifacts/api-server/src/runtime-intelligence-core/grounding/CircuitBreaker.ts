export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  state: CircuitState;
  failureCount: number;
  consecutiveFailures: number;
  lastFailure: number | null;
  cooldownMs: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private circuits = new Map<string, {
    state: CircuitState;
    failureCount: number;
    consecutiveFailures: number;
    lastFailure: number | null;
    openedAt: number | null;
    cooldownMs: number;
    baseCooldown: number;
  }>();

  constructor(
    private threshold: number = 3,
    private baseCooldownMs: number = 15000,
  ) {}

  private getCircuit(name: string) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: 'CLOSED',
        failureCount: 0,
        consecutiveFailures: 0,
        lastFailure: null,
        openedAt: null,
        cooldownMs: this.baseCooldownMs,
        baseCooldown: this.baseCooldownMs,
      });
    }
    return this.circuits.get(name)!;
  }

  canExecute(name: string): boolean {
    const circuit = this.getCircuit(name);
    if (circuit.state === 'CLOSED') return true;
    if (circuit.state === 'OPEN') {
      const elapsed = Date.now() - (circuit.openedAt ?? 0);
      if (elapsed >= circuit.cooldownMs) {
        circuit.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(name: string): void {
    const circuit = this.getCircuit(name);
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'CLOSED';
      circuit.cooldownMs = circuit.baseCooldown;
    }
    circuit.consecutiveFailures = 0;
    circuit.failureCount = 0;
    circuit.openedAt = null;
  }

  recordFailure(name: string): void {
    const circuit = this.getCircuit(name);
    circuit.failureCount++;
    circuit.consecutiveFailures++;
    circuit.lastFailure = Date.now();

    if (circuit.consecutiveFailures >= this.threshold && circuit.state !== 'OPEN') {
      circuit.state = 'OPEN';
      circuit.openedAt = Date.now();
      circuit.cooldownMs = Math.min(circuit.cooldownMs * 2, 120000);
    }
  }

  getStatus(name: string): CircuitStatus {
    const c = this.getCircuit(name);
    return {
      state: c.state,
      failureCount: c.failureCount,
      consecutiveFailures: c.consecutiveFailures,
      lastFailure: c.lastFailure,
      cooldownMs: c.cooldownMs,
      openedAt: c.openedAt,
    };
  }

  getAllStatuses(): Record<string, CircuitStatus> {
    const result: Record<string, CircuitStatus> = {};
    for (const [name] of this.circuits) {
      result[name] = this.getStatus(name);
    }
    return result;
  }

  reset(name?: string): void {
    if (name) {
      this.circuits.delete(name);
    } else {
      this.circuits.clear();
    }
  }
}
