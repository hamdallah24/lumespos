---
id: component-interface-v1
title: Runtime Component Interface
domain: runtime
artifact_type: standard
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
  - Quarterly
knowledge_level: governing
context_priority: critical
depends_on:
  - runtime-architecture-v1
  - event-bus-v1
referenced_by:
  - all-runtime-specs
consumers:
  - CTO
  - All Engine Components
loading_strategy: conditional
tags:
  - runtime
  - interface
  - contract
  - standard
  - component
purpose: |
  Define the standard contract that every Runtime Component must implement.
  Lifecycle, interface, metrics, health check, error handling, dependency declaration.
  Every engine (Knowledge Loader, Memory Bridge, Planner, Validator, etc.)
  must conform to this interface.
---

# Runtime Component Interface

## 1. Why I Exist

Without a standard contract, every engine implements differently. One engine logs to console, another to a file. One returns errors, another throws them. One reports metrics, another remains silent. This makes integration, testing, and debugging impossible at scale. Every component must conform to this interface.

## 2. Component Lifecycle

```
INITIALIZE ──→ READY ──→ EXECUTE ──→ (repeat)
                   │                    │
                   │                    └──→ ERROR? → RECOVER / RETRY
                   │
                   └──→ SHUTDOWN

States:
  INITIALIZING   Component is loading dependencies, registering with Event Bus
  READY          Component is ready to accept requests
  EXECUTING      Component is processing a request
  DEGRADED       Component is operational but with reduced capability
  ERROR          Component has encountered a fatal error
  SHUTTING_DOWN  Component is cleaning up resources
  SHUTDOWN       Component has stopped
```

## 3. Core Interface

Every Runtime Component must implement:

```typescript
interface RuntimeComponent<Input = any, Output = any> {
  // ── Identity ──
  readonly name: string;
  readonly version: string;

  // ── Lifecycle ──
  initialize(context: ComponentContext): Promise<void>;
  execute(input: Input, requestContext: RequestContext): Promise<Output>;
  shutdown(): Promise<void>;

  // ── Health ──
  health(): HealthReport;

  // ── Validation ──
  validate(input: Input): ValidationResult;

  // ── Metrics ──
  metrics(): ComponentMetrics;

  // ── Dependencies ──
  readonly dependencies: string[]; // names of required components

  // ── Capability ──
  readonly capabilities: string[]; // what this component provides
}

// ── Contexts ──

interface ComponentContext {
  eventBus: EventBus;
  config: Record<string, any>;
  logger: ComponentLogger;
}

interface RequestContext {
  requestId: string;
  userId: number;
  mode: "cto" | "bisnis" | "chat" | "vps";
  startedAt: Date;
  tokenBudget: number;
  roundCount: number;
}

// ── Health ──

interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number; // seconds since initialization
  lastError?: {
    message: string;
    timestamp: string;
    recoverable: boolean;
  };
  dependencies: DependencyHealth[]; // health of required dependencies
  version: string;
}

interface DependencyHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
}

// ── Validation ──

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string; // e.g., "MISSING_FIELD", "INVALID_TYPE"
}

interface ValidationWarning {
  field: string;
  message: string;
  severity: "low" | "medium" | "high";
}

// ── Metrics ──

interface ComponentMetrics {
  name: string;
  version: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  lastExecutionTimeMs: number;
  uptimeSeconds: number;
  customMetrics?: Record<string, number | string>;
}

// ── Logger ──

interface ComponentLogger {
  info(msg: string, data?: Record<string, any>): void;
  warn(msg: string, data?: Record<string, any>): void;
  error(msg: string, error?: Error, data?: Record<string, any>): void;
  debug(msg: string, data?: Record<string, any>): void;
}
```

## 4. Error Contract

All components must follow the same error pattern:

```typescript
class ComponentError extends Error {
  constructor(
    public readonly component: string,
    public readonly code: ErrorCode,
    public readonly requestId?: string,
    public readonly context?: Record<string, any>,
  ) {
    super(`[${component}] ${code}: ${context ? JSON.stringify(context) : ""}`);
  }
}

type ErrorCode =
  | "INITIALIZATION_FAILED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_INPUT"
  | "EXECUTION_FAILED"
  | "TIMEOUT"
  | "TOKEN_BUDGET_EXCEEDED"
  | "RESOURCE_EXHAUSTED"
  | "UNKNOWN";

// Usage:
if (input === undefined) {
  throw new ComponentError(
    "KnowledgeLoader",
    "INVALID_INPUT",
    requestContext.requestId,
    { reason: "input is undefined" }
  );
}
```

### Error Recovery Rules

| Error Code | Recovery Strategy |
|------------|------------------|
| `DEPENDENCY_UNAVAILABLE` | Retry with exponential backoff (3 attempts max) |
| `TIMEOUT` | Retry once, then report as degraded |
| `TOKEN_BUDGET_EXCEEDED` | Trim low-priority context, retry |
| `INVALID_INPUT` | Report to caller — do not retry |
| `EXECUTION_FAILED` | Report to Circuit Breaker |
| `INITIALIZATION_FAILED` | Set status to `unhealthy`, report to Observability |

## 5. Dependency Declaration

Every component must declare its dependencies explicitly:

```typescript
// Example: Knowledge Loader
class KnowledgeLoader implements RuntimeComponent {
  readonly name = "KnowledgeLoader";
  readonly version = "1.0.0";
  readonly dependencies = ["EventBus"];  // only needs Event Bus
  readonly capabilities = ["knowledge-loading", "token-budget-allocation"];
  // ...
}

// Example: Planner
class Planner implements RuntimeComponent {
  readonly name = "Planner";
  readonly version = "1.0.0";
  readonly dependencies = ["KnowledgeLoader", "MemoryBridge", "EventBus"];
  readonly capabilities = ["task-planning", "step-decomposition", "confidence-estimation"];
  // ...
}
```

The Runtime Orchestrator validates that all dependencies are available before allowing `initialize()`.

## 6. Logging Contract

Every log message must include component name and request ID:

```typescript
// Required format:
logger.info("knowledge_loaded", {
  component: "KnowledgeLoader",
  requestId: "req-123",
  assetCount: 3,
  tokenCount: 2100,
  durationMs: 89
});

// Required fields:
//   component: string
//   requestId: string (if in request context)
//   durationMs: number (for timed operations)
```

### Log Levels

| Level | When to Use |
|-------|------------|
| `debug` | Internal state, variable values — never in production |
| `info` | Normal operation: "loaded 3 assets", "plan created with 2 steps" |
| `warn` | Recoverable issues: "retry attempt 2/3", "token budget exceeded, trimming" |
| `error` | Failures: "dependency unavailable", "execution failed" — always include error object |

## 7. Metrics Contract

Components must report these metrics after every execution:

```typescript
class KnowledgeLoader implements RuntimeComponent {
  private totalExecutions = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalDurationMs = 0;
  private lastDurationMs = 0;
  private startTime = Date.now();

  metrics(): ComponentMetrics {
    return {
      name: this.name,
      version: this.version,
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successCount,
      failedExecutions: this.failureCount,
      averageExecutionTimeMs: this.totalExecutions > 0
        ? this.totalDurationMs / this.totalExecutions
        : 0,
      lastExecutionTimeMs: this.lastDurationMs,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      customMetrics: {
        averageAssetsLoaded: this.successCount > 0
          ? this.totalAssetsLoaded / this.successCount
          : 0,
      },
    };
  }
}
```

### Observability Integration

After every execution, publish metrics to Observability via Event Bus:

```typescript
async execute(input: Input, ctx: RequestContext): Promise<Output> {
  const start = Date.now();
  this.totalExecutions++;

  try {
    const result = await this.doExecute(input, ctx);
    this.successCount++;
    this.publishMetrics(ctx);
    return result;
  } catch (error) {
    this.failureCount++;
    this.publishMetrics(ctx);
    throw new ComponentError(this.name, "EXECUTION_FAILED", ctx.requestId, {
      error: (error as Error).message
    });
  }
}
```

## 8. Component Registry

The Runtime Orchestrator maintains a registry of all components:

```typescript
interface ComponentRegistry {
  register(component: RuntimeComponent): void;
  get(name: string): RuntimeComponent | undefined;
  getAll(): RuntimeComponent[];
  getByCapability(capability: string): RuntimeComponent[];
  healthAll(): HealthReport[];
  validateDependencies(): DependencyValidationResult;
}

interface DependencyValidationResult {
  valid: boolean;
  missing: { component: string; missingDependency: string }[];
  circular: string[][];
}
```

## 9. Example: Complete Component Implementation (Knowledge Loader skeleton)

```typescript
class KnowledgeLoader implements RuntimeComponent {
  readonly name = "KnowledgeLoader";
  readonly version = "1.0.0";
  readonly dependencies = ["EventBus"];
  readonly capabilities = ["knowledge-loading", "token-budget-allocation"];

  private bus!: EventBus;
  private logger!: ComponentLogger;
  private startTime = 0;

  async initialize(ctx: ComponentContext): Promise<void> {
    this.bus = ctx.eventBus;
    this.logger = ctx.logger;
    this.startTime = Date.now();

    this.bus.subscribe("INTENT_IDENTIFIED", this.onIntent.bind(this));
    this.logger.info("initialized", { component: this.name });
  }

  async execute(input: { mode: string; taskDescription: string }, reqCtx: RequestContext): Promise<KnowledgePayload> {
    this.logger.info("loading_knowledge", { component: this.name, requestId: reqCtx.requestId, mode: input.mode });

    // Implementation...
    const assets = await this.loadFoundation();
    const domainAssets = await this.loadDomain(input.mode);
    const taskAssets = await this.loadTaskSpecific(input.taskDescription);
    const allAssets = this.applyTokenBudget([...assets, ...domainAssets, ...taskAssets], reqCtx.tokenBudget);

    return allAssets;
  }

  validate(input: any): ValidationResult {
    if (!input?.mode) {
      return { valid: false, errors: [{ field: "mode", message: "Missing mode", code: "MISSING_FIELD" }], warnings: [] };
    }
    return { valid: true, errors: [], warnings: [] };
  }

  health(): HealthReport {
    return { status: "healthy", uptime: Math.floor((Date.now() - this.startTime) / 1000), dependencies: [], version: this.version };
  }

  metrics(): ComponentMetrics {
    return { name: this.name, version: this.version, totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageExecutionTimeMs: 0, lastExecutionTimeMs: 0, uptimeSeconds: 0 };
  }

  async shutdown(): Promise<void> {
    this.logger.info("shutting_down", { component: this.name });
  }

  // ...
}
```

## 10. Non-Goals

- I do not define component-specific business logic. That belongs to individual specs.
- I do not define persistence layer. That belongs to DATABASE_SPEC.md.
- I do not define network communication. Future ADR for distributed components.
- I do not define authentication/authorization for components. That belongs to SECURITY.md.
