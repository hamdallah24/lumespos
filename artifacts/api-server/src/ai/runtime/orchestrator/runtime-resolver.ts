// ECP-031: Runtime Resolver — determines which Runtime handles the request
// Frozen. Intent-based + domain-based resolution. Never mode-string matching.

import type { IRuntime, RuntimeContext } from "./runtime-interface";
import { classifyIntent } from "../intent-classifier";

const intentRuntimeMap: Record<string, string> = {
  greeting:          "Chat",
  knowledge_query:   "Consultant",  // ECP-037: Consultant has no execute() in orchestrator.
                                    // Falls through to Layer 3 → CEO. Will be wired properly
                                    // when Consultant becomes a request-handler (future ECP).
  business_action:   "COO",
  analyze_code:      "CTO",
  implement_change:  "CTO",
  devops_operation:  "CTO",
};

class RuntimeResolver {
  private _runtimes = new Map<string, IRuntime>();

  register(runtime: IRuntime): void {
    this._runtimes.set(runtime.name, runtime);
  }

  /** Resolve which runtime handles this context */
  resolve(ctx: RuntimeContext): IRuntime {
    // Layer 1: Legacy mode-based (backward compat)
    if (ctx.mode) {
      const byMode = this._runtimes.get(
        ctx.mode === "bisnis" ? "COO" : ctx.mode.toUpperCase()
      );
      if (byMode) return byMode;
    }

    // Layer 2: Intent-based resolution
    if (ctx.message) {
      const intent = classifyIntent(ctx.message);
      const targetName = intentRuntimeMap[intent.category];

      if (targetName) {
        const runtime = this._runtimes.get(targetName);
        if (runtime) return runtime;
      }

      // Business actions → COO
      if (intent.category === "business_action") {
        const coo = this._runtimes.get("COO");
        if (coo) return coo;
      }
    }

    // Layer 3: Default — CEO (always available)
    const ceo = this._runtimes.get("CEO");
    if (ceo) return ceo;

    const chat = this._runtimes.get("Chat");
    if (chat) return chat;

    throw new Error("No runtime available. System cannot process request.");
  }

  getRegistered(): string[] {
    return [...this._runtimes.keys()];
  }
}

export const resolver = new RuntimeResolver();
