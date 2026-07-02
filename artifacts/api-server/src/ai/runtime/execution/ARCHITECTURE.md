# ECP-019 — Execution Plane Architecture

Status: FROZEN. No structural changes without ADR.

## Architecture

ExecutionGovernor (orchestration only — NO logic)
    ├── Goal Engine          → "Apa yang harus diselesaikan?"
    │     ├── goal-tree.ts          ← decomposition + capability assignment
    │     └── objective-tracker.ts  ← 9 universal states
    ├── Delegation Engine    → "Siapa yang mengerjakan?"
    │     ├── capability-graph.ts   ← Capability → Role
    │     ├── role-graph.ts         ← Role → RuntimeType
    │     ├── runtime-resolver.ts   ← RuntimeType → candidates
    │     └── scheduler.ts          ← candidates → best instance
    ├── Execution Engine     → "Bagaimana cara mengerjakan?"
    │     ├── execution-strategy.ts ← EXPLORE→INVESTIGATE→ANALYZE→CONCLUDE→ESCALATE
    │     └── execution-budget.ts   ← allocation + safety boundary
    └── Evaluation Engine    → "Apakah sudah selesai?"
          ├── completion-policy.ts  ← assignment + execution progress
          ├── execution-metrics.ts  ← evidence, stability, diversity
          └── execution-journal.ts  ← structured artifact

Shared:
    execution-policy.ts      ← budget matrix, anti-loop, scheduler weights
    execution-manifest.ts    ← type definitions

## Dependency Rule

Engines MUST NOT call each other. Governor is the ONLY coordinator.
Circular dependencies between engines are FORBIDDEN.

## Governor Lifecycle

1. init(spec, budget, tools, callbacks)
2. goalTree.build() + tracker.reset()
3. while(shouldContinue()):
    a. beforeCycle() — advance state
    b. infer strategy + get directive
    c. executeCycle() — LLM call + tool execution
    d. afterCycle() — update state, metrics, journal, completion
4. getManifest() — return ExecutionManifest

## What Is Forbidden

- Engines importing each other
- Hardcoded loop limits (MAX_ROUNDS, idleCycles)
- String-based completion heuristics
- Boolean completion checks
- Runtime determining its own execution budget
- Governor containing business logic
- Adding new abstraction layers
- Modifying Runtime pipelines
- Adding persona prompts
- Changing Foundation v2.0

## Implementation Principle

Interfaces are FINAL. Implementations start minimal.
Future evolution only changes algorithm internals, never contracts.
