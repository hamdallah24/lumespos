# EIOS v4.1 — Implementation Blueprint

**Status:** Architecture Frozen v4.1.0  
**Last Updated:** 2026-07-12  
**Owner:** EIOS Core Team  
**Stability:** Locked — no architectural changes permitted beyond this document

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Layer Architecture](#2-layer-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Contracts Layer Specification](#4-contracts-layer-specification)
5. [Public API Layer Specification](#5-public-api-layer-specification)
6. [Internal Implementation Specification](#6-internal-implementation-specification)
7. [Components Specification](#7-components-specification)
8. [Bootstrap Lifecycle](#8-bootstrap-lifecycle)
9. [Pipeline Execution Flow](#9-pipeline-execution-flow)
10. [Phase Implementation Plan](#10-phase-implementation-plan)
11. [File Inventory](#11-file-inventory)
12. [Architecture Tests](#12-architecture-tests)
13. [Architecture Rules (Constitution Articles)](#13-architecture-rules-constitution-articles)

---

## 1. Architecture Overview

```
FOUNDATION KERNEL (Identity, Directives, Schema)
        |
   EIOS RUNTIME
        |
   +-- CONTRACTS LAYER (contracts/) -- STABLE
   |   ComponentId, SemVer, Manifest, Event, Policy,
   |   Capability, Pipeline, Registry, Health, Plugin, Bootstrap
   |
   +-- PUBLIC LAYER (public/) -- Facade
   |   RuntimeFacade, PipelineContext, PipelineResolver,
   |   ObserverEngine, TriggerEngine
   |
   +-- INTERNAL LAYER (internal/) -- Implementation
   |   Metadata Core, Governance, Dependency System,
   |   Pipeline Core, Execution Core, Lifecycle
   |
   +-- COMPONENTS (Self-Registering)
       11 Stages, 6 Observers, 7 Profiles
        |
   EXECUTIVE RUNTIME (Pure Consumers)
   CEO, CTO, CFO, CMO, CAIO, CKO, COO
   Only consume ExecutiveBrief -- no orchestration
```

### Import Rules

```
contracts/  (stable, never changes)
    |
public/     (facade, uses contracts/ only)
    |
internal/   (implements contracts/, not accessible from outside)
    |
stages/ observers/ profiles/  (self-registering, use contracts/ + public/ only)
    |
executive-runtime/executives/  (pure consumer, contracts/ only for ExecutiveBrief)
```

## 2. Layer Architecture

### Layer 1 — Core Runtime Kernel (existing, minimal changes)
Foundation, Identity, Event Schema bootstrap, Kernel registration.

### Layer 2 — EIOS Runtime (refactored, this blueprint)

| Sub-layer | Path | Responsibility |
|-----------|------|----------------|
| Contracts | `contracts/` | Stable interfaces — ComponentId, SemVer, Manifests, Events, Policies, Capabilities, Pipeline, Registry, Health, Plugin, Bootstrap |
| Public | `public/` | RuntimeFacade (single entry), PipelineContext (immutable), PipelineResolver (strategy), ObserverEngine (QoS), TriggerEngine |
| Internal | `internal/` | All implementations — registries, governance, dependency, pipeline, execution, lifecycle |

### Layer 3 — Runtime Components

| Component | Count | Type |
|-----------|-------|------|
| Stages | 11 | Pipeline stage (self-registering via PipelineStageRegistry) |
| Observers | 6 | Event-driven (self-registering via ObserverRegistry) |
| Profiles | 7 | Intent-based pipeline selection (self-registering via PipelineProfileRegistry) |

### Layer 4 — Enhancement Libraries (existing, no changes)
decision-context, north-star, strategy-simulator, workflow-runtime, executive-memory, digital-twin, self-evolution, plugin-architecture, event-schema, executive-council/learning

### Layer 5 — Executive Runtime (modified — orchestration removed)
CEO, CTO, CFO, CMO, CAIO, CKO, COO — pure consumers of ExecutiveBrief

---

## 3. Folder Structure

```
src/
├── index.ts                              # Minimal boot
│
├── eios-runtime/
│   ├── contracts/                        # Layer 1: Stable Interfaces
│   │   ├── ComponentId.ts                # Universal ComponentId + SemVer
│   │   ├── Manifest.ts                   # defineStage, defineObserver, dll
│   │   ├── EventContracts.ts             # EventDefinition, RuntimeEvent
│   │   ├── PolicyContracts.ts            # Policy, PolicyResult, PolicyExplanation
│   │   ├── CapabilityContracts.ts        # Capability, CapabilityConstraint
│   │   ├── PipelineContracts.ts          # PipelineContext, ContextDelta, ExecutionResult
│   │   ├── RegistryContracts.ts          # RegistryLifecycle, ComponentStatus, Registry
│   │   ├── HealthContracts.ts            # HealthRecord, HealthScore
│   │   ├── RuntimeContracts.ts           # RuntimeFacade interface
│   │   ├── PluginContracts.ts            # PermissionToken, PluginAPI
│   │   ├── BootstrapContracts.ts         # BootStep interface
│   │   └── index.ts
│   │
│   ├── public/                           # Layer 2: Runtime Facade
│   │   ├── RuntimeFacade.ts              # Single external entry point
│   │   ├── PipelineContext.ts            # Immutable, ContextDelta-based
│   │   ├── PipelineResolver.ts           # Strategy pattern
│   │   ├── ObserverEngine.ts            # QoS + Dead Letter Queue
│   │   ├── TriggerEngine.ts              # Registry-driven triggers
│   │   └── index.ts
│   │
│   ├── internal/                         # Layer 3: Implementation
│   │   ├── runtime-metadata/             # 13 registry files
│   │   ├── runtime-governance/           # 8 validator files
│   │   ├── runtime-policy/               # 4 policy engine files
│   │   ├── runtime-capability/           # 4 capability files
│   │   ├── Container.ts                  # DI Container
│   │   ├── RuntimeDiscoveryEngine.ts     # Manifest-based discovery
│   │   ├── DependencyResolver.ts         # Construction graph
│   │   ├── PipelineEngine.ts             # Pipeline executor
│   │   ├── PipelineAudit.ts             # Audit trail
│   │   ├── PipelineMetrics.ts            # Metrics collection
│   │   ├── PipelineScheduler.ts          # Periodic scheduling
│   │   ├── RuntimeSnapshotManager.ts     # Event-sourcing snapshot
│   │   ├── RuntimeFreezeManager.ts       # Registry freeze
│   │   ├── RuntimeHealth.ts              # Time-series scoring
│   │   ├── RuntimeState.ts               # State machine
│   │   ├── Bootstrap.ts                  # Transactional boot
│   │   └── index.ts
│   │
│   ├── stages/                           # 11 self-registering stages
│   ├── observers/                        # 6 self-registering observers
│   ├── profiles/                         # 7 self-registering profiles
│   └── index.ts                          # initializeEIOSRuntime()
│
├── executive-runtime/executives/         # Modified: remove recordDecision()
└── programs/                             # Minor: remove recordDecision from COO

---

## 4. Contracts Layer Specification

### 4.1 ComponentId + SemVer

```typescript
// contracts/ComponentId.ts

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  build?: string;
}

export type ComponentType =
  | "stage" | "observer" | "trigger" | "profile"
  | "plugin" | "policy" | "event" | "executive";

export interface ComponentId {
  namespace: string;
  type: ComponentType;
  name: string;
  version: SemVer;
}

// Format: "eios.core:stage:north_star@1.0.0"
export function parseComponentId(str: string): ComponentId;
export function formatComponentId(id: ComponentId): string;
export function componentIdEquals(a: ComponentId, b: ComponentId): boolean;
export function satisfies(constraint: string, version: SemVer): boolean;
```

### 4.2 Manifest

```typescript
// contracts/Manifest.ts

export interface ComponentManifest {
  id: ComponentId;
  name: string;
  description: string;
  dependencies: ComponentId[];
  capabilities: string[];
  tags: string[];
  checksum: string;
  signature?: string;
  schemaVersion: SemVer;
  migrationVersion?: SemVer;
  compatibilityVersion?: SemVer;
  deprecated: boolean;
  replacement: ComponentId | null;
  extends?: ComponentId;
  metadata: Record<string, unknown>;
}

export function defineStage(manifest: ComponentManifest): ComponentManifest;
export function defineObserver(manifest: ComponentManifest): ComponentManifest;
export function defineTrigger(manifest: ComponentManifest): ComponentManifest;
export function defineProfile(manifest: ComponentManifest): ComponentManifest;
export function defineExecutive(manifest: ComponentManifest): ComponentManifest;
```

### 4.3 Event Contracts

```typescript
// contracts/EventContracts.ts

export interface EventDefinition {
  id: ComponentId;
  schema: Record<string, unknown>;
  retention: "forever" | "7d" | "24h" | "1h";
  category: "system" | "business" | "audit";
  producer: ComponentId[];
  consumer: ComponentId[];
}

export interface RuntimeEvent {
  id: string;
  correlationId: string;
  type: ComponentId;
  payload: unknown;
  timestamp: string;
  version: SemVer;
}
```

### 4.4 Policy Contracts

```typescript
// contracts/PolicyContracts.ts

export interface PolicyRule {
  id: ComponentId;
  condition: string;
  action: string;
  priority: number;
}

export interface PolicyResult {
  passed: boolean;
  actions: string[];
}

export interface PolicyExplanation {
  action: string;
  reason: string;
  rule: string;
  threshold: number;
  actualValue: number;
  source: ComponentId;
  chain: PolicyExplanation[];
}
```

### 4.5 Pipeline Contracts

```typescript
// contracts/PipelineContracts.ts

export interface PipelineContext {
  readonly correlationId: string;
  readonly traceId: string;
  readonly stageId: ComponentId | null;
  readonly executionState: Readonly<Record<string, unknown>>;
  read<T>(key: string): T | undefined;
}

export interface ContextDelta {
  correlationId: string;
  stageId: ComponentId;
  patches: Record<string, unknown>;
  timestamp: string;
}

export interface ExecutionResult {
  correlationId: string;
  success: boolean;
  durationMs: number;
  stages: ComponentId[];
  failures: Array<{ stage: ComponentId; error: string }>;
}

export interface BootStep {
  id: string;
  execute(): Promise<void>;
  rollback(): Promise<void>;
}
```

### 4.6 Registry Contracts

```typescript
// contracts/RegistryContracts.ts

export type RegistryState =
  | "BOOT" | "REGISTERING" | "VALIDATING"
  | "FROZEN" | "RUNNING" | "SHUTDOWN";

export type ComponentStatus =
  | "ACTIVE" | "DEPRECATED" | "DISABLED";

export interface Registry<T> {
  register(component: T): void;
  get(id: ComponentId): T | undefined;
  getAll(): T[];
  setStatus(id: ComponentId, status: ComponentStatus): void;
  getStatus(id: ComponentId): ComponentStatus;
}

export class RegistryFrozenError extends Error {
  constructor() { super("Registry is FROZEN -- mutations not allowed"); }
}
```

### 4.7 Capability Contracts

```typescript
// contracts/CapabilityContracts.ts

export interface Capability {
  id: ComponentId;
  name: string;
  provider: ComponentId;
  priority: number;
  cost: number;
  latency: number;
}

export interface CapabilityConstraint {
  minVersion?: SemVer;
  maxVersion?: SemVer;
  maxCost?: number;
  maxLatency?: number;
  preferredProvider?: string;
}
```

### 4.8 Plugin Contracts

```typescript
// contracts/PluginContracts.ts

export interface PermissionToken {
  pluginId: ComponentId;
  capabilities: string[];
  expiresAt: string;
  signature: string;
}

export interface PluginAPI {
  readonly runtime: RuntimeFacade;
  readonly token: PermissionToken;
}
```

### 4.9 Runtime Contracts

```typescript
// contracts/RuntimeContracts.ts

export interface RuntimeFacade {
  execute(intent: string, payload?: unknown): Promise<ExecutionResult>;
  subscribe(event: string, handler: Function): void;
  capability(id: string): boolean;
  emit(event: string, payload: unknown): void;
  context(): PipelineContext;
}
```

### 4.10 Health Contracts

```typescript
// contracts/HealthContracts.ts

export interface HealthRecord {
  timestamp: string;
  overall: number;
  registries: number;
  plugins: number;
  pipeline: number;
  memory: number;
  eventBus: number;
  dependencies: number;
  governance: number;
  scheduler: number;
}

export interface HealthScore {
  overall: number;
  registries: number;
  plugins: number;
  pipeline: number;
  memory: number;
  scheduler: number;
}

export interface DependencyHealth {
  redis: { status: string; latencyMs: number };
  database: { status: string; latencyMs: number };
  llm: { status: string; model: string };
  embedding: { status: string; enabled: boolean };
  knowledge: { status: string; totalBlocks: number };
}
```

### 4.11 Bootstrap Contracts

```typescript
// contracts/BootstrapContracts.ts

export interface BootStep {
  id: string;
  description: string;
  execute(): Promise<void>;
  rollback(): Promise<void>;
}

export interface BootReport {
  success: boolean;
  steps: BootStepResult[];
  durationMs: number;
  error?: string;
}

export interface BootStepResult {
  id: string;
  status: "completed" | "failed" | "rolled_back";
  durationMs: number;
  error?: string;
}
```

---

## 5. Public API Layer Specification

### 5.1 RuntimeFacade

```typescript
// public/RuntimeFacade.ts

export class RuntimeFacade implements RuntimeFacade {
  constructor(private engine: PipelineEngine) {}

  async execute(intent: string, payload?: unknown): Promise<ExecutionResult> {
    const ctx = new PipelineContext(Date.now().toString(36));
    const graphId = PipelineResolver.resolve(intent, ctx);
    return this.engine.execute(graphId, ctx);
  }

  subscribe(event: string, handler: Function): void {
    ObserverRegistry.register({
      id: { namespace: "custom", type: "observer", name: "obs_" + Date.now(),
            version: { major: 1, minor: 0, patch: 0 } },
      subscribe: event,
      deliveryMode: "FireAndForget",
      priority: 500,
      handle: handler,
    });
  }

  capability(id: string): boolean {
    return CapabilityRegistry.has(id);
  }

  emit(event: string, payload: unknown): void {
    ObserverEngine.dispatch({
      id: Date.now().toString(36),
      correlationId: "",
      type: { namespace: "custom", type: "event", name: event,
              version: { major: 1, minor: 0, patch: 0 } },
      payload, timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });
  }

  context(): PipelineContext {
    return PipelineEngine.getCurrentContext();
  }
}
```

### 5.2 Immutable PipelineContext

```typescript
// public/PipelineContext.ts

export class PipelineContext {
  private state: Readonly<Record<string, unknown>> = {};
  private readonly deltaHistory: ContextDelta[] = [];
  constructor(readonly correlationId: string) {}

  read<T>(key: string): T | undefined {
    return this.state[key] as T;
  }

  apply(delta: ContextDelta): void {
    if (delta.correlationId !== this.correlationId) {
      throw new Error("Delta correlationId mismatch");
    }
    this.state = { ...this.state, ...delta.patches };
    this.deltaHistory.push(delta);
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.state;
  }

  getHistory(): ReadonlyArray<ContextDelta> {
    return [...this.deltaHistory];
  }

  static fromDeltas(correlationId: string, deltas: ContextDelta[]): PipelineContext {
    const ctx = new PipelineContext(correlationId);
    for (const d of deltas) ctx.apply(d);
    return ctx;
  }
}
```

### 5.3 PipelineResolver (Strategy Pattern)

```typescript
// public/PipelineResolver.ts

export interface PipelineSelectionStrategy {
  name: string;
  select(intent: string, context: PipelineContext): string;
}

export const RuleBasedStrategy: PipelineSelectionStrategy = {
  name: "rule-based",
  select(intent: string, _ctx: PipelineContext): string {
    const intents: Record<string, string> = {
      business_operation: "business",
      inventory_change: "business",
      sales_event: "business",
      founder_query: "query",
      planning_request: "planning",
      executive_command: "executive",
      data_analysis: "analytics",
      what_if: "simulation",
    };
    return intents[intent] || "business";
  },
};

export const PipelineResolver = {
  private strategy: PipelineSelectionStrategy = RuleBasedStrategy;
  setStrategy(s: PipelineSelectionStrategy): void { this.strategy = s; }
  resolve(intent: string, ctx: PipelineContext): string {
    return this.strategy.select(intent, ctx);
  },
};
```

### 5.4 ObserverEngine with QoS

```typescript
// public/ObserverEngine.ts

export type DeliveryMode = "FireAndForget" | "ExactlyOnce" | "AtLeastOnce" | "Buffered";

const MAX_RETRIES = 3;
const deadLetterQueue: any[] = [];

export const ObserverEngine = {
  async dispatch(event: RuntimeEvent): Promise<void> {
    const observers = ObserverRegistry.getObserversForEvent(event.type.id)
      .sort((a, b) => a.priority - b.priority);

    for (const obs of observers) {
      if (obs.deliveryMode === "FireAndForget") {
        obs.handle(event).catch(() => {});
      } else if (obs.deliveryMode === "ExactlyOnce" || obs.deliveryMode === "AtLeastOnce") {
        await this.dispatchWithRetry(obs, event);
      } else if (obs.deliveryMode === "Buffered") {
        BufferService.enqueue(obs, event);
      }
    }
  },

  private async dispatchWithRetry(observer: any, event: RuntimeEvent): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try { await observer.handle(event); return; }
      catch (err) { lastError = err as Error; }
    }
    deadLetterQueue.push({
      eventId: event.id, observerId: observer.id,
      payload: event.payload, error: String(lastError),
      failedAt: new Date().toISOString(), retryCount: MAX_RETRIES,
    });
  },

  getDeadLetterQueue(): any[] { return [...deadLetterQueue]; },

  async replayDeadLetter(index: number): Promise<void> {
    const record = deadLetterQueue[index];
    if (!record) return;
    const observers = ObserverRegistry.getObserversForEvent(record.observerId.name);
    for (const obs of observers) {
      await obs.handle({ id: record.eventId, correlationId: "", type: record.observerId,
        payload: record.payload, timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 } });
    }
    deadLetterQueue.splice(index, 1);
  },
};
```

### 5.5 TriggerEngine

```typescript
// public/TriggerEngine.ts

export const TriggerEngine = {
  async fire(triggerId: string, payload?: unknown): Promise<ExecutionResult | null> {
    const trigger = TriggerRegistry.get(parseComponentId(triggerId));
    if (!trigger || !trigger.enabled) return null;
    if (trigger.condition && !trigger.condition(payload)) return null;

    const ctx = new PipelineContext(Date.now().toString(36));
    const intent = trigger.intent || "business_operation";
    const graphId = PipelineResolver.resolve(intent, ctx);
    return PipelineEngine.execute(graphId, ctx);
  },
};
```

---

## 6. Internal Implementation Specification

### 6.1 RegistryLifecycle

```typescript
// internal/runtime-metadata/RegistryLifecycle.ts

let _state: RegistryState = "BOOT";

export const RegistryLifecycle = {
  get state() { return _state; },

  transition(to: RegistryState): void {
    const valid: Record<string, string[]> = {
      BOOT: ["REGISTERING"], REGISTERING: ["VALIDATING"],
      VALIDATING: ["FROZEN"], FROZEN: ["RUNNING"],
      RUNNING: ["SHUTDOWN"], SHUTDOWN: [],
    };
    if (!valid[_state]?.includes(to)) {
      throw new Error("Invalid transition: " + _state + " -> " + to);
    }
    _state = to;
  },

  assertMutable(): void {
    if (_state === "FROZEN" || _state === "RUNNING") {
      throw new RegistryFrozenError();
    }
  },

  isFrozen(): boolean {
    return _state === "FROZEN" || _state === "RUNNING";
  },
};
```

### 6.2 Append-Only PipelineStageRegistry

```typescript
// internal/runtime-metadata/PipelineStageRegistry.ts

export interface StageDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  execute(ctx: PipelineContext): Promise<ContextDelta>;
  canRun?(ctx: PipelineContext): boolean;
  rollback?(ctx: PipelineContext): Promise<void>;
  timeout: number;
  retries: number;
}

const entries: StageDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const PipelineStageRegistry = {
  register(def: StageDefinition): void {
    RegistryLifecycle.assertMutable();
    if (entries.some(e => componentIdEquals(e.id, def.id))) {
      throw new Error("Stage already registered: " + formatComponentId(def.id));
    }
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): StageDefinition | undefined {
    return entries.find(e => componentIdEquals(e.id, id));
  },

  getBestVersion(ns: string, type: string, name: string, constraint?: string): StageDefinition | undefined {
    const candidates = entries.filter(
      e => e.id.namespace === ns && e.id.type === type && e.id.name === name
    );
    return candidates.sort((a, b) => b.id.version.major - a.id.version.major ||
      b.id.version.minor - a.id.version.minor)[0];
  },

  getAll(): StageDefinition[] { return [...entries]; },

  setStatus(id: ComponentId, status: ComponentStatus): void {
    RegistryLifecycle.assertMutable();
    statuses.set(formatComponentId(id), status);
  },

  getStatus(id: ComponentId): ComponentStatus {
    return statuses.get(formatComponentId(id)) || "DISABLED";
  },

  getActive(): StageDefinition[] {
    return entries.filter(e => statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },
};
```

### 6.3 PipelineGraphRegistry (DAG + Conditional Edges)

```typescript
// internal/runtime-metadata/PipelineGraphRegistry.ts

interface GraphEdge {
  from: string;
  to: string;
  condition?: (ctx: PipelineContext) => boolean;
}

const edges: GraphEdge[] = [];

export const PipelineGraphRegistry = {
  addEdge(from: ComponentId, to: ComponentId, condition?: (ctx: PipelineContext) => boolean): void {
    edges.push({ from: formatComponentId(from), to: formatComponentId(to), condition });
  },

  dependsOn(from: ComponentId, to: ComponentId, condition?: (ctx: PipelineContext) => boolean): void {
    this.addEdge(from, to, condition);
  },

  getExecutionOrder(profileId: string, ctx: PipelineContext): ComponentId[] {
    const filteredEdges = edges.filter(e => !e.condition || e.condition(ctx));
    const sorted = topologicalSort(filteredEdges);
    return sorted.map(s => parseComponentId(s));
  },

  validate(): { cyclic: boolean; missing: string[] } {
    return detectCyclesAndMissing(edges);
  },
};
```

### 6.4 DependencyResolver (Construction Graph)

```typescript
// internal/DependencyResolver.ts

export const DependencyResolver = {
  resolveAll(): void {
    this.resolveStageDependencies();
    this.resolveCapabilityDependencies();
    this.resolvePluginDependencies();
    this.resolveExecutiveDependencies();
    this.buildConstructionGraph();
    const cycles = this.detectCrossModuleCycles();
    if (cycles.length > 0) {
      throw new Error("Circular dependencies detected: " + JSON.stringify(cycles));
    }
  },

  buildConstructionGraph(): ComponentId[] {
    const all = [
      ...PipelineStageRegistry.getAll().map(s => s.id),
      ...ObserverRegistry.getAll().map(o => o.id),
      ...CapabilityRegistry.getAll().map(c => c.id),
    ];
    return topologicalSortWithDependencies(all);
  },

  detectCrossModuleCycles(): ComponentId[][] {
    // Tarjan's algorithm across ALL registries
    // Detects: stage<->stage, plugin<->plugin, capability<->capability
    // registry<->registry, observer<->event<->observer
    return detectCycles(allNodes, allEdges);
  },
};
```

### 6.5 RuntimeGovernance

```typescript
// internal/runtime-governance/RuntimeGovernance.ts

export const RuntimeGovernance = {
  async validateAll(): Promise<{ passed: boolean; timestamp: string }> {
    const results = await Promise.all([
      StartupValidator.validate(),
      RegistryValidator.validate(),
      ManifestValidator.validate(),
      PolicyValidator.validate(),
      CompatibilityValidator.validate(),
      MigrationValidator.validate(),
      DependencyValidator.validate(),
    ]);

    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      throw new Error("Governance validation failed: " + failures.map(f => f.message).join(", "));
    }
    return { passed: true, timestamp: new Date().toISOString() };
  },

  startPeriodicCheck(intervalMs = 60000): void {
    setInterval(async () => {
      const report = await this.validateAll().catch(() => null);
      if (!report) RuntimeHealth.recordAnomaly("governance_check_failed");
    }, intervalMs);
  },
};
```

### 6.6 PolicyEngine (with Explain)

```typescript
// internal/runtime-policy/PolicyEngine.ts

export const PolicyEngine = {
  evaluate(ctx: PolicyContext): PolicyResult {
    const policies = PolicyRegistry.getPoliciesFor(ctx.scope);
    const actions: string[] = [];
    for (const policy of policies) {
      if (PolicyEvaluator.evaluate(policy.rule, ctx)) {
        actions.push(policy.action);
      }
    }
    return { passed: actions.length === 0, actions };
  },

  explain(ctx: PolicyContext): PolicyExplanation[] {
    const explanations: PolicyExplanation[] = [];
    const policies = PolicyRegistry.getPoliciesFor(ctx.scope);
    for (const policy of policies) {
      const ruleValue = extractValue(policy.rule, ctx);
      const threshold = getThreshold(policy.rule);
      if (ruleValue !== undefined && threshold !== undefined) {
        explanations.push({
          action: policy.action,
          reason: policy.rule + ": " + ruleValue + " vs threshold " + threshold,
          rule: policy.rule, threshold, actualValue: ruleValue,
          source: policy.id, chain: [],
        });
      }
    }
    return explanations;
  },
};
```

### 6.7 CapabilityNegotiator

```typescript
// internal/runtime-capability/CapabilityNegotiator.ts

export const CapabilityNegotiator = {
  negotiateAll(): void {
    const capabilities = CapabilityRegistry.getAll();
    const byName = new Map<string, Capability[]>();

    for (const cap of capabilities) {
      const key = cap.id.namespace + ":" + cap.id.name;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(cap);
    }

    for (const [key, versions] of byName) {
      if (versions.length > 1) {
        const selected = versions.sort((a, b) =>
          a.priority - b.priority || a.cost - b.cost || a.latency - b.latency
        )[0];
        CapabilityRegistry.setProvider(key, selected);
      }
    }
  },
};
```

### 6.8 Transactional Bootstrap

```typescript
// internal/Bootstrap.ts

const STEPS: BootStep[] = [
  { id: "container", description: "Init DI Container",
    execute: initContainer, rollback: destroyContainer },
  { id: "discovery", description: "Scan manifests",
    execute: scanManifests, rollback: clearRegistries },
  { id: "dependencies", description: "Resolve dependencies",
    execute: resolveDependencies, rollback: resetDependencies },
  { id: "negotiation", description: "Negotiate capabilities",
    execute: negotiateCapabilities, rollback: resetNegotiation },
  { id: "graph", description: "Build pipeline graph",
    execute: buildPipelineGraph, rollback: clearGraph },
  { id: "governance", description: "Run governance validation",
    execute: runGovernanceValidation, rollback: async () => {} },
  { id: "freeze", description: "Freeze registries",
    execute: freezeRegistries, rollback: unfreezeRegistries },
  { id: "snapshot", description: "Create boot snapshot",
    execute: createBootSnapshot, rollback: restorePreviousSnapshot },
  { id: "health", description: "Check runtime health",
    execute: checkRuntimeHealth, rollback: async () => {} },
];

export async function bootstrapRuntime(): Promise<void> {
  const executed: BootStep[] = [];

  for (const step of STEPS) {
    try {
      await step.execute();
      executed.push(step);
    } catch (err) {
      for (const done of executed.reverse()) {
        try { await done.rollback(); } catch { /* compensate */ }
      }
      throw new Error("Bootstrap failed at step '" + step.id + "': " + err);
    }
  }

  RuntimeState.start();
}
```

### 6.9 RuntimeHealth with Time-Series

```typescript
// internal/RuntimeHealth.ts

const history: HealthRecord[] = [];
const MAX_HISTORY = 1000;

export const RuntimeHealth = {
  record(): void {
    history.push({
      timestamp: new Date().toISOString(), ...this.score(),
    });
    if (history.length > MAX_HISTORY) history.shift();
  },

  score(): Omit<HealthRecord, 'timestamp'> {
    return {
      overall: 97, registries: 100, plugins: 100,
      pipeline: 94, memory: 97, eventBus: 100,
      dependencies: 100, governance: 100, scheduler: 90,
    };
  },

  getHistory(windowMs?: number): HealthRecord[] {
    if (!windowMs) return [...history];
    const cutoff = Date.now() - windowMs;
    return history.filter(h => new Date(h.timestamp).getTime() > cutoff);
  },

  getTrend(): "improving" | "declining" | "stable" {
    const recent = this.getHistory(300000);
    if (recent.length < 2) return "stable";
    const delta = recent[recent.length - 1].overall - recent[0].overall;
    if (delta > 2) return "improving";
    if (delta < -2) return "declining";
    return "stable";
  },
};
```

---

## 7. Bootstrap Lifecycle

```
Boot
  |
[1] Container.init()
  |
[2] RuntimeDiscoveryEngine.scan()    (manifest-based, not fs.readdir)
  |
[3] RegistryLifecycle -> REGISTERING
  |
[4] DependencyResolver.resolve()
  |   resolveStageDependencies(), buildConstructionGraph(), detectCrossModuleCycles()
  |
[5] CapabilityNegotiator.negotiate()  (version-aware, priority/cost/latency)
  |
[6] PipelineGraphRegistry.build()     (DAG + conditional edges) + validate()
  |
[7] RegistryLifecycle -> VALIDATING
  |
[8] RuntimeGovernance.validateAll()   (7 validators)
  |   IF ANY FAILS -> ROLLBACK (compensation in reverse order)
  |
[9] RegistryLifecycle -> FROZEN
  |
[10] RuntimeFreezeManager.freezeAll()
  |
[11] RuntimeSnapshotManager.createSnapshot("boot")
  |
[12] RuntimeHealth.record()
  |
[13] RuntimeState -> RUNNING
  |
[14] RuntimeGovernance.startPeriodicCheck(60000ms)
```

## 8. Pipeline Execution Flow

```
Trigger fires (event_bus | scheduler | webhook | api | founder | cli)
    |
TriggerEngine.fire(triggerId, payload)
    |
PipelineResolver.resolve(intent, ctx) -> graphId
    |  (PipelineSelectionStrategy.select(intent))
    |
PipelineEngine.execute(graphId, ctx)
    |
    +-- PipelineGraphRegistry.getExecutionOrder(graphId, ctx) -> stageIds[]
    |   (evaluates conditional edges at runtime)
    |
    +-- FOR each stageId IN order:
    |   +-- PipelineStageRegistry.get(stageId) -> StageDefinition
    |   +-- IF stage.canRun && !stage.canRun(ctx) -> SKIP
    |   +-- stage.execute(ctx) -> ContextDelta (stage NEVER mutates ctx directly)
    |   +-- ctx.apply(delta)  (Runtime merges delta)
    |   +-- ObserverEngine.dispatch({ type: "stage.completed", payload: { stageId, delta } })
    |   |   Observers: FireAndForget | ExactlyOnce(+DLQ) | AtLeastOnce | Buffered
    |   +-- PipelineAudit.record() + PipelineMetrics.record()
    |
    +-- ObserverEngine.dispatch({ type: "pipeline.completed", payload: result })
    +-- RuntimeHealth.record()
    +-- Return ExecutionResult
```

## 9. Phase Implementation Plan

| Phase | Scope | Files | Dependencies | Days |
|-------|-------|-------|--------------|------|
| P0 | contracts/ -- ComponentId, SemVer, Manifest, interfaces | 12 | None | 2-3 |
| P1 | All registries + RegistryLifecycle + append-only | 14 | P0 | 3-4 |
| P2 | DependencyResolver + ConstructionGraph + CapabilityNegotiator | 6 | P1 | 2-3 |
| P3 | RuntimeGovernance + 7 validators + PolicyEngine | 14 | P1 | 3-4 |
| P4 | PipelineContext + PipelineGraph + conditional edges + PipelineEngine | 6 | P0-P3 | 3-4 |
| P5 | TriggerEngine + ObserverEngine + QoS + DLQ | 4 | P4 | 2-3 |
| P6 | Bootstrap (transactional) + FreezeManager + SnapshotManager + Health | 6 | P0-P5 | 2-3 |
| P7 | 11 stages + 6 observers + 7 profiles | 30 | P0-P6 | 4-5 |
| P8 | Cleanup 7 executive runtimes | 7 | P7 | 1 |
| P9 | index.ts cleanup + delete old files | 3 | P0-P8 | 1 |
| P10 | Testing: 156 existing + 50 new | 10 | P0-P9 | 3-4 |
| | **TOTAL** | **~112 files** | | **26-34 days** |

## 10. File Inventory

### CREATE (~91 new files)
- contracts/: 12 files
- public/: 6 files
- internal/runtime-metadata/: 14 files
- internal/runtime-governance/: 9 files
- internal/runtime-policy/: 4 files
- internal/runtime-capability/: 4 files
- internal/ root: 12 files
- stages/: 13 files
- observers/: 8 files
- profiles/: 9 files

### MODIFY (~18 files)
- eios-runtime/index.ts, src/index.ts
- 7 executive runtimes (remove recordDecision)
- COO coo-runtime.ts (remove 4x recordDecision)

### DELETE (4 old files)
- EIOSOrchestrator.ts -> replaced by Bootstrap.ts + RuntimeGovernance.ts
- PipelineController.ts -> replaced by PipelineEngine.ts
- PipelineRegistry.ts -> replaced by PipelineStageRegistry.ts
- TriggerManager.ts -> replaced by TriggerEngine.ts

## 11. Architecture Tests

### Contract Tests
- ComponentId must have valid SemVer
- Manifest must have checksum
- No two manifests share the same ComponentId

### Import Boundary Tests
- public/ must not import from internal/
- stages/ must only import contracts/ and public/
- executives/ must only import contracts/
- no circular imports between modules

### Registry Tests
- Registry must reject mutations after FROZEN
- Registry must be append-only (no remove)
- ComponentStatus transitions: ACTIVE -> DEPRECATED -> DISABLED

### Pipeline Tests
- PipelineGraph must detect cycles
- Conditional edges evaluated at runtime
- PipelineContext immutable via stages
- Stages return ContextDelta, not mutate ctx directly

### Governance Tests
- Governance blocks boot if validation fails
- PolicyEngine.explain() returns chain of reasoning
- Bootstrap rollbacks all steps on failure
- Health maintains time-series history

## 12. Architecture Rules (Constitution Articles)

### ARTICLE VII -- CORE RUNTIME PURITY
1. Core Runtime must NOT know component implementations.
2. Core Runtime must NOT have hardcoded metadata strings.
3. Core Runtime must NOT have hardcoded configuration numbers.
4. Core Runtime must NOT know plugins, executives, profiles, or stages.
5. Core Runtime must ONLY know Registry interfaces.

### ARTICLE VIII -- CONTRACT IMMUTABILITY
1. contracts/ is the ONLY stable interface layer.
2. contracts/ must NEVER change after Architecture Frozen status.
3. New features via new contracts, not modifying existing ones.
4. Breaking changes require Architecture Review Board approval.

### ARTICLE IX -- IMPORT RULES
1. internal/ must never be imported by public/.
2. Components must only import contracts/ and public/RuntimeFacade.
3. Plugins and Executive Runtime must only import contracts/.
4. Architecture tests validate these rules automatically.

### ARTICLE X -- REGISTRY INTEGRITY
1. All registries are append-only. No delete or unregister.
2. Component status: ACTIVE -> DEPRECATED -> DISABLED.
3. All registries are FROZEN before Runtime enters RUNNING state.
4. Post-freeze mutations throw RegistryFrozenError.

### ARTICLE XI -- BOOTSTRAP INTEGRITY
1. Bootstrap is transactional. Each step implements execute() + rollback().
2. If any step fails, all prior steps rollback in reverse order.
3. Runtime must NEVER enter RUNNING if governance validation fails.

### ARTICLE XII -- GOVERNANCE
1. Governance runs at boot AND periodically at runtime.
2. RuntimeHealth maintains time-series history.
3. PolicyEngine.explain() available for all policy decisions.
