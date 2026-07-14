# T.0.1.5 — Phase 4: Runtime Boundary Lock

## Source
T.0.1 Runtime Integration Point (T01_RUNTIME_INTEGRATION.md)

## Boundary Definition

```
┌──────────────────────────────────────────────────────┐
│                  EXECUTIVE RUNTIME                    │
│  Identity → Foundation → Knowledge → Cognitive → LLM │
│                                      │               │
│  Memory Read call:                  │               │
│  MemoryProvider.read() ─────────────┤               │
│                                      │               │
└──────────────────────────────────────┘               │
         │                                              │
         ▼                                              │
┌──────────────────────────────────────────────────────┐│
│                 MEMORY PROVIDER                       ││
│  ┌──────────┬──────────┬──────────┬──────────┐       ││
│  │ Working  │ Decision │ Semantic │ Episodic │       ││
│  │ Memory   │ Memory   │ Memory   │ Memory   │       ││
│  └──────────┴──────────┴──────────┴──────────┘       ││
│  ┌──────────┬──────────┬──────────┬──────────┐       ││
│  │ Know-    │ Organiza-│ Cache    │ Circuit  │       ││
│  │ ledge    │ tional   │ (L1+L2)  │ Breaker  │       ││
│  └──────────┴──────────┴──────────┴──────────┘       ││
└──────────────────────────────────────────────────────┘│
         │                                              │
         ▼                                              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ MEMORY SUBSYSTEMS │  │                  │  │                  │
│ ContextManager   │  │ semantic-memory  │  │ ai-memory-service│
│ DecisionRecorder │  │ knowledge-graph  │  │ organizational   │
│ MemoryRecallEng  │  │ learning/        │  │ memory           │
│ RedisService     │  │ retrieval-engine │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Boundary Rules (LOCKED)

| Rule | Description | Violation Risk |
|------|-------------|:--------------:|
| **R1** | Executive Runtime calls `MemoryProvider.read()` ONLY | CEO currently violates via `KnowledgeBackbone.summarizeMemory()` — LOCKED: will be removed in T.0.2 |
| **R2** | Executive Runtime NEVER calls memory subsystems directly | Currently no violation except CEO (see R1) |
| **R3** | MemoryProvider NEVER calls Executive Runtime | No reverse dependency — MemoryProvider is stateless facade |
| **R4** | MemoryProvider calls Memory Subsystems only via their public APIs | Each subsystem has its own public interface; MemoryProvider does not access internals |
| **R5** | Memory Subsystems NEVER call MemoryProvider | Subsystems are providers of data, not consumers |
| **R6** | MemoryProvider NEVER modifies Executive Runtime state | Read-only: no side effects on Identity, Foundation, Knowledge, Cognitive contexts |
| **R7** | MemoryProvider NEVER modifies Memory Subsystems state | Read-only: no writes during read path. Writes happen via EIOS observers (separate path) |
| **R8** | Caching (L1 + L2) is internal to MemoryProvider | Executives and subsystems never interact with cache directly |

## Boundary Enforcement (T.0.2)

| Enforcement | Mechanism |
|-------------|-----------|
| Import restriction | `MemoryProvider` is the ONLY export from `memory-provider/` package |
| No direct imports | Lint rule: forbid imports from `executive-memory/`, `memory/`, `ai/runtime/semantic-memory`, `services/ai-memory-service` in executive code |
| Only `memory-provider/` allowed | Executives can only import from `memory-provider/` for memory access |
| CEO exception | `KnowledgeBackbone.summarizeMemory()` will be removed — CEO follows the same rule |

## Dependency Direction (LOCKED)

```
Executive Runtime  ──────→  MemoryProvider  ──────→  Memory Subsystems
     (caller)                   (orchestrator)            (data stores)
     
     NO ←─── direction
     NO direct executive → subsystem
     NO subsystem → MemoryProvider
     NO MemoryProvider → Executive Runtime
```

## Impact Analysis

| Component | Boundary Change from Current? | Status |
|-----------|------------------------------|:------:|
| CEO Program | YES — removes `KnowledgeBackbone.summarizeMemory()` | **LOCKED** — Planned for T.0.2 |
| CTO Program | NO — no memory dependency today, adds MemoryProvider | Additive only |
| COO/CFO/CMO/CAIO/CHRO | NO — no memory dependency today, adds MemoryProvider | Additive only |
| CKO Program | NO — no memory dependency today, adds MemoryProvider | Additive only |
| CognitiveEngine | NO — unchanged | **FROZEN** |
| CognitivePipeline | NO — unchanged | **FROZEN** |
| PromptAssembler | NO — unchanged | **FROZEN** |
| RuntimeFacade | NO — unchanged | **FROZEN** |
| ExecutiveProgram base class | NO — unchanged | **FROZEN** |
| Memory Subsystems | NO — unchanged (existing APIs reused) | **FROZEN** |
