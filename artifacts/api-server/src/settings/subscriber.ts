// ConfigCenter — Configuration Subscriber.
// A subsystem subscribes to ConfigurationChanged notifications (metadata only),
// then reconciles by reading fresh values via the SDK — never from event
// payloads (events carry no values). Monotonic revision drives idempotency.
// Subscribers may filter by key set or scope.

import { ConfigEventBus, type ConfigurationEvent } from "./events";
import type { ConfigScope, ConfigValue } from "./types";
import type { ConfigReader } from "./sdk";

export interface SubscriberDeps {
  sdk: ConfigReader;
  bus: ConfigEventBus;
  keys?: string[]; // if provided, only reconcile when these keys changed
  scopeMatches?: (scope: ConfigScope) => boolean;
  onReconcile: (snapshot: Record<string, ConfigValue>) => void | Promise<void>;
}

export class ConfigSubscriber {
  private lastSeenRevision = -1;
  private readonly sdk: ConfigReader;
  private readonly bus: ConfigEventBus;
  private readonly keys?: string[];
  private readonly scopeMatches?: (scope: ConfigScope) => boolean;
  private readonly onReconcile: (snapshot: Record<string, ConfigValue>) => void | Promise<void>;
  private subId?: string;

  constructor(deps: SubscriberDeps) {
    this.sdk = deps.sdk;
    this.bus = deps.bus;
    this.keys = deps.keys;
    this.scopeMatches = deps.scopeMatches;
    this.onReconcile = deps.onReconcile;
  }

  start(): void {
    const id = `config-${Math.random().toString(36).slice(2, 10)}`;
    this.subId = id;
    this.bus.on(id, (event: ConfigurationEvent) => {
      void this.handle(event);
    });
  }

  stop(): void {
    if (this.subId) this.bus.off(this.subId);
  }

  private async handle(event: ConfigurationEvent): Promise<void> {
    if (event.revision <= this.lastSeenRevision) return;
    this.lastSeenRevision = event.revision;

    if (this.scopeMatches && !this.scopeMatches(event.scope)) return;

    if (this.keys && this.keys.length > 0) {
      const relevant = event.changedKeys.some((k) => this.keys!.includes(k));
      if (!relevant) return;
    }

    const snapshot: Record<string, ConfigValue> = {};
    const readKeys = (this.keys && this.keys.length > 0 ? this.keys : event.changedKeys);
    // Reconcile against the scope that changed (derive a resolution context
    // from the event scope so fresh values read via SDK are scope-correct).
    for (const k of readKeys) {
      snapshot[k] = (await this.sdk.get(k, this.ctxFromScope(event.scope))).value;
    }
    await this.onReconcile(snapshot);
  }

  private ctxFromScope(scope: ConfigScope) {
    return {
      workspaceId: scope.type === "workspace" ? scope.workspaceId : undefined,
      branchId: scope.type === "branch" ? scope.branchId : undefined,
      executiveRole: scope.type === "executive" ? scope.executiveRole : undefined,
    };
  }

  get lastRevision(): number {
    return this.lastSeenRevision;
  }
}
