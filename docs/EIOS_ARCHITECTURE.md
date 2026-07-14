# EIOS v4.1 — Architecture Reference

**Status:** Architecture Frozen v4.1.0  
**Last Updated:** 2026-07-12

---

## 1. Architecture Overview

```
FOUNDATION KERNEL (Identity, Directives, Event Schema)
        |
   EIOS RUNTIME
        |
   +-- CONTRACTS LAYER (contracts/) -- STABLE, never changes
   |   ComponentId, SemVer, Manifest, Event, Policy,
   |   Capability, Pipeline, Registry, Health, Plugin, Bootstrap
   |
   +-- PUBLIC LAYER (public/) -- Runtime Facade
   |   RuntimeFacade, PipelineContext, PipelineResolver,
   |   ObserverEngine, TriggerEngine
   |
   +-- INTERNAL LAYER (internal/) -- Implementation
   |   RuntimeGovernance, RuntimeMetadata, DependencySystem,
   |   PipelineEngine, RuntimeLifecycle
   |
   +-- COMPONENTS (Self-Registering via Registry)
   |   11 Stages, 6 Observers, 7 Profiles
   |
   EXECUTIVE RUNTIME (Pure Consumers)
   CEO, CTO, CFO, CMO, CAIO, CKO, COO
   Only consume ExecutiveBrief -- no orchestration
```

## 2. Layer Architecture

### Layer 1 — Contracts Layer (`contracts/`)
**STABLE** — never changes after Architecture Frozen.

Contains all type definitions and interfaces:
- `ComponentId.ts` — Universal identity for all components
- `SemVer` — Semantic versioning
- `ComponentManifest` — defineStage, defineObserver, defineTrigger, defineProfile, defineExecutive
- Event, Policy, Capability, Pipeline, Registry, Health, Plugin, Bootstrap contracts

**Rule:** contracts/ must NEVER depend on public/ or internal/.

### Layer 2 — Public API (`public/`)
**Facade layer** — single entry point for plugins and external consumers:
- `RuntimeFacade` — execute, subscribe, capability, emit, context
- `PipelineContext` — immutable, ContextDelta-based
- `PipelineResolver` — Strategy pattern (RuleBasedStrategy)
- `ObserverEngine` — QoS delivery modes (FireAndForget, ExactlyOnce, AtLeastOnce, Buffered) + Dead Letter Queue
- `TriggerEngine` — 11 trigger types via registry

**Rule:** public/ must NOT import from internal/.

### Layer 3 — Internal Implementation (`internal/`)
**Implementation** — can change without affecting contracts:
- `runtime-metadata/` — 14 registries + lifecycle
- `runtime-governance/` — 7 validators + periodic checks
- `runtime-policy/` — PolicyEngine with evaluate() + explain()
- `runtime-capability/` — CapabilityNegotiator + Resolver + Priority
- `PipelineEngine.ts` — sequential stage execution with retries
- `Bootstrap.ts` — transactional boot with compensating rollbacks
- `RuntimeHealth.ts` — time-series scoring
- `RuntimeSnapshotManager.ts` — event-sourcing snapshots

**Rule:** internal/ must never be directly imported by external consumers.

## 3. Component Architecture

### 3.1 Stages (11 self-registering)

11 stages that self-register via PipelineStageRegistry at boot:

| # | Stage | Dependencies |
|---|-------|-------------|
| 01 | event_validation | — |
| 02 | business_intelligence | — |
| 03 | decision_context | business_intelligence |
| 04 | decision_engine | decision_context |
| 05 | north_star | decision_engine |
| 06 | strategy_simulator | north_star |
| 07 | strategy_engine | strategy_simulator |
| 08 | execution_planner | strategy_engine |
| 09 | workflow_runtime | execution_planner |
| 10 | brief_generator | workflow_runtime |
| 11 | executive_runtime | brief_generator |

DAG edges defined via PipelineGraphRegistry.dependsOn().

### 3.2 Observers (6 self-registering)

| Observer | Event | QoS Mode | Priority |
|----------|-------|----------|----------|
| executive_memory | decision.made | ExactlyOnce | 100 |
| knowledge_learning | decision.made | Buffered | 200 |
| council_learning | council.resolved | ExactlyOnce | 150 |
| digital_twin | pipeline.started | FireAndForget | 50 |
| self_evolution | pipeline.completed | FireAndForget | 500 |
| communication | brief.generated | FireAndForget | 300 |

Observers subscribe via ObserverRegistry and are dispatched by ObserverEngine with QoS guarantees.

### 3.3 Profiles (7 self-registering)

| Profile | Intents |
|---------|---------|
| business | business_operation, inventory_change, sales_event, financial_event |
| query | founder_query, status_check, simple_question |
| planning | planning_request, strategy_session, long_term_plan |
| executive | executive_command, ceo_directive, emergency_action |
| analytics | data_analysis, report_generation, metric_review |
| simulation | what_if, simulation_run, scenario_analysis |
| replay | pipeline_replay, debug_run, audit_replay |

## 4. Data Flow

### 4.1 Bootstrap Lifecycle

```
Boot
  |
[1] Container.init()
  |
[2] Self-Registration: stages, observers, profiles register themselves
  |
[3] RegistryLifecycle -> REGISTERING
  |
[4] DependencyResolver.resolve() + detectCrossModuleCycles()
  |
[5] CapabilityNegotiator.negotiate()
  |
[6] PipelineGraphRegistry.build() + validate()
  |
[7] RegistryLifecycle -> VALIDATING
  |
[8] RuntimeGovernance.validateAll() (7 validators)
  |   IF ANY FAILS -> ROLLBACK
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

### 4.2 Pipeline Execution Flow

```
Trigger fires (event_bus | scheduler | webhook | api | founder | cli | cron)
    |
TriggerEngine.fire(triggerId, payload)
    |
PipelineResolver.resolve(intent, ctx) -> graphId
    |
PipelineEngine.execute(graphId, ctx)
    |
    FOR each stageId IN order:
    |   PipelineStageRegistry.get(stageId) -> StageDefinition
    |   stage.execute(ctx) -> ContextDelta (stage NEVER mutates ctx directly)
    |   ctx.apply(delta) (Runtime merges delta)
    |
    ObserverEngine.dispatch({ type: "stage.completed", ... })
    |   Observers sorted by priority with QoS delivery modes
    |
    Return ExecutionResult
```

## 5. Key Architecture Rules

### 5.1 Core Runtime Purity
- Core Runtime must NOT know component implementations
- Core Runtime must NOT have hardcoded metadata strings
- Core Runtime must NOT have hardcoded configuration numbers
- Core Runtime must ONLY know Registry interfaces

### 5.2 Contract Immutability
- contracts/ is the ONLY stable interface layer
- contracts/ must NEVER change after Architecture Frozen status
- New features via new contracts, not modifying existing ones

### 5.3 Import Rules
- internal/ must never be imported by public/
- Components must only import contracts/ and public/RuntimeFacade
- Plugins and Executive Runtime must only import contracts/
- Architecture tests validate these rules automatically

### 5.4 Registry Integrity
- All registries are append-only (no delete or unregister)
- Component status: ACTIVE -> DEPRECATED -> DISABLED
- All registries are FROZEN before Runtime enters RUNNING state
- Post-freeze mutations throw RegistryFrozenError

### 5.5 Bootstrap Integrity
- Bootstrap is transactional with execute() + rollback() per step
- If any step fails, all prior steps rollback in reverse order
- Runtime must NEVER enter RUNNING if governance validation fails

## 6. Runtime Health

RuntimeHealth maintains time-series health records with:
- Overall score (aggregated from 8 dimensions)
- Per-dimension scores: registries, plugins, pipeline, memory, eventBus, dependencies, governance, scheduler
- Trend analysis (improving/declining/stable)
- Anomaly tracking

## 7. Trigger System

Supports 11 trigger types:
event_bus, scheduler, founder, manual, webhook, rest_api, cron, replay, simulation, testing, cli

Each trigger has: id, description, condition, enabled flag, priority, intent mapping.

## 8. Enhancement Libraries (existing, unmodified)

decision-context, north-star, strategy-simulator, workflow-runtime, executive-memory,
digital-twin, self-evolution, plugin-architecture, event-schema, executive-council/learning

All existing enhancement libraries remain as pure libraries — no orchestration logic.
