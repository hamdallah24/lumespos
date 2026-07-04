// ECP-038: Runtime Resolver — CEO is the single orchestrator
// ALL requests go to CEO. CEO delegates internally via OrganizationEngine.
// Mode-based dispatch removed. Intent-based dispatch removed.
// ECP-047: Registry reference from RuntimeOrchestrator (SSOT). No local map.

import type { IRuntime, RuntimeContext } from "./runtime-interface";

class RuntimeResolver {
  private _registryRef: Map<string, IRuntime> | null = null;

  /** Receive shared registry reference from RuntimeOrchestrator (SSOT) */
  setRef(registry: Map<string, IRuntime>): void {
    this._registryRef = registry;
  }

  /** Compatibility wrapper — delegates to shared registry */
  register(runtime: IRuntime): void {
    this._registryRef?.set(runtime.name, runtime);
  }

  /** Resolve — always returns CEO. CEO is the single orchestrator. */
  resolve(_ctx: RuntimeContext): IRuntime {
    const ceo = this._registryRef?.get("CEO");
    if (ceo) return ceo;
    throw new Error("CEO Runtime not registered. System cannot process request.");
  }

  getRegistered(): string[] {
    return this._registryRef ? [...this._registryRef.keys()] : [];
  }
}

export const resolver = new RuntimeResolver();
