// ECP-038: Runtime Resolver — CEO is the single orchestrator
// ALL requests go to CEO. CEO delegates internally via OrganizationEngine.
// Mode-based dispatch removed. Intent-based dispatch removed.

import type { IRuntime, RuntimeContext } from "./runtime-interface";

class RuntimeResolver {
  private _runtimes = new Map<string, IRuntime>();

  register(runtime: IRuntime): void {
    this._runtimes.set(runtime.name, runtime);
  }

  /** Resolve — always returns CEO. CEO is the single orchestrator. */
  resolve(_ctx: RuntimeContext): IRuntime {
    const ceo = this._runtimes.get("CEO");
    if (ceo) return ceo;
    throw new Error("CEO Runtime not registered. System cannot process request.");
  }

  getRegistered(): string[] {
    return [...this._runtimes.keys()];
  }
}

export const resolver = new RuntimeResolver();
