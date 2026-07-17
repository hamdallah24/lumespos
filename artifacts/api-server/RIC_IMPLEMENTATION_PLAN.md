# RIC Implementation Plan — Phased Roadmap

**Status**: Proposed

**Date**: 2026-07-16

**Total estimated duration**: 14-22 days (1 engineer full-time)

---

## Overview

The implementation is organized into **15 phases** (T9.2 adds RuntimeContract, Trace, Evidence, Budget, Degraded Mode, Multi-Model, Capability Graph, Diagnostics). Each phase produces working, testable code. No phase breaks the build.

```
Phase 1:  Foundation                  (1-2 days)
Phase 2:  Repository Metadata         (2-3 days)
Phase 3:  Understanding + Reasoning   (2-3 days)
Phase 4:  Retrieval Planner           (2-3 days)
Phase 5:  Grounding Layer             (2-3 days)
Phase 6:  Verification Engine         (2-3 days)
Phase 7:  Context Builder             (1 day)
Phase 8:  Tool Catalog                (1-2 days)
Phase 9:  RuntimeContract             (2-3 days)  ← NEW (T9.2)
Phase 10: RuntimeTrace + Evidence     (2-3 days)  ← NEW (T9.2)
Phase 11: Budget + Degraded Mode      (1-2 days)  ← NEW (T9.2)
Phase 12: ReasoningProvider           (1-2 days)  ← NEW (T9.2)
Phase 13: Capability Graph            (1-2 days)  ← NEW (T9.2)
Phase 14: Diagnostics API             (1 day)     ← NEW (T9.2)
Phase 15: Integration + Removal       (2-3 days)
```

---

## Phase 1: Foundation

**Goal**: Set up directory structure, types, and interfaces with zero behavioral changes.

### Tasks

1. Create directory structure:
   ```
   src/runtime-intelligence-core/
   ├── understanding/
   ├── planning/
   ├── grounding/providers/
   ├── verification/rules/           ← NEW
   ├── builder/
   ├── registry/
   ├── confidence/
   └── fallback/
   ```

2. Create `types.ts` with all shared interfaces:
   - `RuntimeContext` (v2 schema, includes explainability + verification results)
   - `UnderstandingResult` (includes reasoning rationale)
   - `RetrievalPlan` (includes timing and detail levels)
   - `GroundingResult`
   - `VerificationResult` + `CheckResult` + `Contradiction` (NEW)
   - `OverallConfidence` (multi-factor: reasoning × grounding × verification)
   - `Entity`, `ExecutionStep`, `TraceEntry`
   - All provider interfaces
   - All configuration types

3. Create `index.ts` barrel exports.

4. Create `RuntimeIntelligenceCore.ts` skeleton:
   - `assemble()` method with placeholder pipeline
   - Inline comments documenting the flow

### Deliverables

- `types.ts` — all interfaces defined and exportable
- `index.ts` — exports all public symbols
- `RuntimeIntelligenceCore.ts` — skeleton with pipeline comments
- **Test**: `npm run build` passes
- **Test**: TypeScript compilation of all new types

### Risk

None — purely additive, no existing code changed.

---

## Phase 2: Repository Metadata Generator

**Goal**: Replace the hardcoded 25-file index with auto-generated metadata.

### Tasks

1. Create `registry/RepositoryMetadataGenerator.ts`:
   - Scan `src/` directory recursively
   - For each `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md` file:
     - Extract description from file header comments or first JSDoc
     - Extract exports (named + default)
     - Infer tags from path segments and content keywords
     - Infer owner from path convention (e.g., `executives/` → `executive`)
     - Calculate importance based on usage frequency and centrality
     - Parse imports for dependency tracking
   - Cache metadata in memory
   - Update on file change events (chokidar watcher)

2. Create `registry/RepositoryMetadata.ts`:
   - `RepositoryMetadata` interface
   - Cache implementation

3. Create `registry/index.ts`:

4. Wire into `RuntimeIntelligenceCore.ts`:
   - Call `generate()` at startup
   - Pass to Retrieval Planner during `assemble()`

### Deliverables

- `RepositoryMetadataGenerator.ts` — scans, extracts, indexes
- All `src/` files discoverable via metadata query
- **Test**: `generate()` returns metadata for all project files
- **Test**: Metadata contains description, exports, tags, owner, importance

### Risk

Medium — filesystem scanning at startup may be slow for large projects. Mitigation: lazy generation, background worker.

---

## Phase 3: Understanding + Thinking Engine

**Goal**: Build Cognitive Block 1 (steps 1+2 of the five responsibilities — Understand + Reason) — single LLM call that simultaneously analyzes three dimensions (user intent, business state, system state), produces semantic reasoning, and extracts intent, domain, entities, thinking mode, urgency, risk, and confidence.

### Tasks

1. Create `understanding/prompts/understanding-prompt.ts`:
   - System prompt instructing LLM to analyze **three dimensions** simultaneously:
     a) User Intent — what does the user want?
     b) Business State — which domains are relevant and available?
     c) System State — what capabilities will be needed?
   - Output schema specification including `reasoning` field (rationale for each decision)
   - Examples for common query types
   - Instructions for confidence scoring
   - Strict JSON-only output requirement

2. Create `understanding/UnderstandingEngine.ts`:
   - `analyze(message, context): Promise<UnderstandingResult>`
   - Call LLM with system prompt + user message
   - Parse JSON response
   - Validate against `UnderstandingResult` schema (Zod)
   - Handle JSON parse errors (max 2 retries)
   - Handle LLM errors (timeout, rate limit, unavailable)
   - Return `UnderstandingResult` with `reasoning` field populated

3. Create `understanding/UnderstandingFallback.ts`:
   - Simplified regex patterns (5-10, not 52)
   - Used when LLM confidence < 0.60 or LLM unavailable
   - Returns degraded `UnderstandingResult` with low confidence, no reasoning

4. Create `understanding/index.ts`

### System Prompt (Outline)

```
You are the Understanding + Thinking Engine of an AI Operating System.

Your responsibilities:
1. UNDERSTAND — Analyze across three dimensions:
   a) User Intent: What does the user want to achieve?
   b) Business State: Which business domains are relevant?
   c) System State: What capabilities will be needed?

2. THINK — Produce semantic reasoning for each decision.

Determine:
1. Goal — what does the user want to achieve?
2. Intent — inquiry, analysis, report, action, decision, learning, troubleshooting
3. SubIntent — more specific classification
4. Domain — primary + secondary business domains
5. Entities — extract named entities with types
6. Reasoning — explain your semantic reasoning (why this intent, domain, entities?)
7. ThinkingMode — fast / balanced / deep
8. Urgency — low / medium / high
9. Risk — low / medium / high
10. Confidence — 0.0 to 1.0

Business domains: sales, inventory, finance, hr, marketing, operations,
engineering, executive, customer, product, strategy, legal

Entity types: branch, product, employee, date, amount, project, outlet,
menu, recipe, organization, executive, workflow, repository, component,
person, location, identifier

Output ONLY valid JSON.
```

### Deliverables

- `UnderstandingEngine.ts` — full implementation with 3-dimension analysis + reasoning
- `UnderstandingFallback.ts` — regex fallback (<10 patterns)
- `understanding-prompt.ts` — optimized system prompt
- **Test**: LLM call returns valid JSON for 10 representative messages
- **Test**: Fallback returns degraded result when LLM fails
- **Test**: Confidence < 0.60 triggers fallback
- **Test**: Reasoning field populated and non-empty for high-confidence results

### Risk

Medium — LLM dependency introduced at the front of every request. Mitigation: retry logic, timeout handling, fallback mode.

---

## Phase 4: Retrieval Planner

**Goal**: Build Cognitive Block 2 — single LLM call that determines what data is needed and the execution plan.

### Tasks

1. Create `planning/prompts/planning-prompt.ts`:
   - System prompt instructing LLM on retrieval planning
   - Includes repository metadata (from Phase 2) and tool catalog (from Phase 7, stub initially)
   - Output schema specification
   - Emphasis on "determine what is needed, not how to get it"

2. Create `planning/RetrievalPlanner.ts`:
   - `plan(understanding, metadata, tools): Promise<RetrievalPlan>`
   - Call LLM with system prompt + understanding result + metadata + tool catalog
   - Parse JSON response
   - Validate against `RetrievalPlan` schema (Zod)
   - Handle errors (max 2 retries)
   - Return `RetrievalPlan`

3. Create `planning/index.ts`

### System Prompt (Outline)

```
You are the Retrieval Planner.
Given the Understanding Result, repository index, and tool catalog:

Determine what information is needed to fulfill this request:

1. KNOWLEDGE NEEDS — What business knowledge is required?
2. REPOSITORY NEEDS — Which files should be retrieved?
3. METADATA NEEDS — Which EIOS graph nodes are relevant?
4. MEMORY NEEDS — What type of memory should be consulted?
5. OPERATIONAL NEEDS — What real-time data is required?
6. TOOL NEEDS — What capabilities are needed?
7. EXECUTION GRAPH — Step-by-step plan for the executive

Repository index (file metadata) is provided.
Tool catalog (capabilities) is provided.

For each need, specify: description, priority (required/optional/fallback),
and any filters or parameters.

Output ONLY valid JSON.
```

### Deliverables

- `RetrievalPlanner.ts` — full implementation
- `planning-prompt.ts` — optimized system prompt
- **Test**: Planner generates correct retrieval needs for 5 scenarios
- **Test**: Planner selects appropriate files from metadata

### Risk

Medium — LLM may hallucinate file paths or tool needs. Mitigation: Grounding Layer validates existence before retrieval; Tool Catalog constrains valid options.

---

## Phase 5: Grounding Layer

**Goal**: Build the deterministic data access layer — zero AI, zero reasoning.

### Tasks

1. Create `grounding/providers/OperationalTruthProvider.ts`:
   - Wraps existing `OperationalTruthProvider` (already deterministic)
   - Implements `GroundingProvider<OperationalRequest, OperationalData>`

2. Create `grounding/providers/MemoryProvider.ts`:
   - Maps `MemoryRequest.type` to the appropriate memory store
   - Delegates to existing memory infrastructure
   - Returns `MemoryEntry[]`

3. Create `grounding/providers/KnowledgeProvider.ts`:
   - Wraps existing `UnifiedLearningLayer`
   - Returns `KnowledgeBlock[]`

4. Create `grounding/providers/MetadataProvider.ts`:
   - Replaces current `MetadataIntelligence` (which used `startsWith`)
   - Queries EIOS graph by node type + filters
   - Returns `MetadataNode[]`

5. Create `grounding/providers/RepositoryProvider.ts`:
   - Reads files by path (from RepositoryRequest)
   - Returns `FileContent[]` with content + path + metadata
   - File size limits, binary file exclusion

6. Create `grounding/GroundingLayer.ts`:
   - Orchestrates all providers
   - `execute(plan: RetrievalPlan): Promise<GroundingResult>`
   - Runs all retrievals in parallel (Promise.all)
   - Collects errors without throwing
   - Measures execution time per provider

7. Create `grounding/types.ts`:
   - Provider interfaces
   - `GroundingResult` type

8. Create `grounding/index.ts`

### Provider Interface

```typescript
interface GroundingProvider<TNeed, TResult> {
  read(needs: TNeed[]): Promise<TResult[]>;
  health(): Promise<{ ok: boolean; latency: number }>;
}
```

### Guarantees

- Deterministic: same needs → same results (modulo real-time data)
- Parallel execution: all providers run simultaneously
- Error isolation: one provider failure does not affect others
- No AI: zero LLM calls, zero regex, zero classification
- Audit trail: execution time and errors recorded

### Deliverables

- 6 provider implementations
- `GroundingLayer.ts` — parallel orchestrator
- **Test**: Each provider returns correct data for known inputs
- **Test**: All providers run in parallel
- **Test**: Provider failure doesn't crash other providers

### Risk

Low — all providers wrap existing deterministic infrastructure. New code is orchestration only.

---

## Phase 6: Verification Engine (T9.1A)

**Goal**: Build the Verification Engine — deterministic component that validates reasoning against grounded evidence before it enters RuntimeContext.

### Rationale

The T9.1A philosophy mandates that verification is a first-class responsibility. Reasoning without verification creates hallucination. Every reasoning output from Cognitive Blocks 1 and 2 must be validated against the factual data retrieved by the Grounding Layer.

### Tasks

1. Create `verification/VerificationEngine.ts`:
   - `verify(understanding, planning, grounding): VerificationResult`
   - Run all verification rules against the three inputs
   - Calculate verification confidence (passed checks / total checks)
   - Identify contradictions between reasoning and evidence
   - Return `VerificationResult`

2. Create `verification/rules/DomainVerificationRule.ts`:
   - Check: does the selected domain have available data?
   - Input: `understanding.domain` + `grounding.errors`
   - Output: `CheckResult` with confidence adjustment

3. Create `verification/rules/EntityVerificationRule.ts`:
   - Check: can extracted entities be found in retrieved data?
   - Input: `understanding.entities` + `grounding.operationalData`
   - Output: `CheckResult` with confidence per entity

4. Create `verification/rules/FileVerificationRule.ts`:
   - Check: do requested repository files exist?
   - Input: `planning.repositoryNeeds` + `grounding.fileContents`
   - Output: `CheckResult` with file existence status

5. Create `verification/rules/ToolVerificationRule.ts`:
   - Check: do requested tool capabilities exist in Tool Catalog?
   - Input: `planning.toolNeeds` + `ToolCatalog`
   - Output: `CheckResult` with capability availability

6. Create `verification/rules/MemoryVerificationRule.ts`:
   - Check: are requested memory stores online?
   - Input: `planning.memoryNeeds` + `MemoryProvider.health()`
   - Output: `CheckResult` with store availability

7. Create `verification/rules/OperationalVerificationRule.ts`:
   - Check: was operational data successfully retrieved?
   - Input: `planning.operationalNeeds` + `grounding.operationalData`
   - Output: `CheckResult` with data completeness

8. Create `verification/index.ts`

### Verification Algorithm

```typescript
class VerificationEngine {
  verify(input: VerificationInput): VerificationResult {
    const rules = [
      new DomainVerificationRule(),
      new EntityVerificationRule(),
      new FileVerificationRule(),
      new ToolVerificationRule(),
      new MemoryVerificationRule(),
      new OperationalVerificationRule(),
    ];

    const checks = rules.map(rule => rule.execute(input));
    const passed = checks.filter(c => c.passed).length;
    const contradictions = checks
      .filter(c => !c.passed && c.severity === 'high')
      .map(c => ({
        reasoningOutput: c.expected,
        evidence: c.actual,
        severity: c.severity,
      }));

    return {
      checks,
      overallPassed: passed === checks.length,
      verificationConfidence: passed / checks.length,
      contradictions,
    };
  }
}
```

### Deliverables

- `VerificationEngine.ts` — orchestrator for all verification rules
- 6 verification rule implementations
- `verification/index.ts` — barrel exports
- **Test**: All checks pass when reasoning matches evidence
- **Test**: Domain mismatch correctly reduces confidence
- **Test**: Entity not found correctly flagged
- **Test**: Missing files correctly detected
- **Test**: Tool unavailability correctly identified
- **Test**: Contradictions properly reported

### Risk

Low — purely deterministic, no AI, no IO. All rules are data comparisons.

---

## Phase 7: Runtime Context Builder

**Goal**: Assemble Understanding + Planning + Grounding + Verification into unified `RuntimeContext` satisfying the Runtime Contract.

### Tasks

1. Create `builder/RuntimeContextBuilder.ts`:
   - `build(understanding, planning, grounding, verification): RuntimeContext`
   - Merge all results into a single context object
   - Identify missing truth (required but not retrieved)
   - Populate explainability fields (whyDomain, whyTool, whyRepository, etc.)
   - Build reasoning trace from all phases
   - Calculate multi-factor confidence

2. Create `confidence/ConfidenceAggregator.ts`:
   - `aggregate(understanding, grounding, verification): OverallConfidence`
   - Formula: `overall = reasoning * grounding * verification`
     - `reasoning` = UnderstandingEngine.confidence
     - `grounding` = retrievedCount / requestedCount
     - `verification` = passedChecks / totalChecks
   - Identify weak areas (lowest factor)
   - Determine `safeToExecute` (overall > 0.5 threshold)

3. Create `builder/index.ts`
4. Create `confidence/index.ts`

### Deliverables

- `RuntimeContextBuilder.ts` — full assembly with explainability
- `ConfidenceAggregator.ts` — multi-factor confidence calculation
- **Test**: RuntimeContext contains all required fields (per Runtime Contract)
- **Test**: Explainability fields populated for all decisions
- **Test**: Missing truth correctly identified
- **Test**: Multi-factor confidence correctly computed

### Risk

Low — pure data transformation, no IO, no AI.

---

## Phase 8: Tool Catalog

**Goal**: Build the tool registry and selection infrastructure.

### Tasks

1. Create `registry/ToolCatalog.ts`:
   - `ToolDescriptor` interface
   - `ToolCatalog` class with register, search, get methods
   - Tools registered at startup via configuration or code

2. Create `registry/ToolCatalogEntry.ts`:
   - Extracts tool descriptors from existing tool implementations
   - Infers capabilities from tool metadata (or explicit registration)

3. Create fallback tool mappings:
   - Simple domain→tool map as lowest-priority fallback
   - Used only if LLM-based selection fails

### Tool Descriptor Schema

```typescript
interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  cost: 'low' | 'medium' | 'high';
  latency: 'low' | 'medium' | 'high';
  permissions: string[];
  enabled: boolean;
}
```

### Deliverables

- `ToolCatalog.ts` — full registry implementation
- Tool descriptors for all existing tools
- **Test**: Tools can be registered and retrieved by capability
- **Test**: Search by description returns relevant tools

### Risk

Low — additive, does not change existing tool implementations.

---

## Phase 9: RuntimeContract (T9.2)

**Goal**: Build the RuntimeContract layer — the only interface executives depend on.

### Tasks

1. Create `contract/RuntimeContract.ts`:
   - `RuntimeContract` interface with version, contractId, createdAt, degraded flag
   - `freezeContract()` — deep-freeze the contract before passing to executives
   - `deriveContract()` — create a new contract version from an existing one (for executive modifications)

2. Implement versioning:
   - Semantic version tracking (`1.0`, `1.1`, `2.0`)
   - Version compatibility check: `isCompatible(executiveVersion, contractVersion)`
   - Migration path for major version bumps

3. Create `contract/index.ts`

### Deliverables

- `RuntimeContract.ts` — contract assembly + freeze + versioning
- **Test**: Contract is immutable after freeze
- **Test**: Version compatibility correctly evaluated
- **Test**: Derivation creates new version without mutating original

### Risk

Low — pure data transformation, no IO, no AI.

---

## Phase 10: RuntimeTrace + Evidence (T9.2)

**Goal**: Add per-stage tracing and evidence provenance to RIC pipeline.

### Tasks

1. Add tracing to each pipeline stage:
   - Wrap each stage (understand, reason, plan, ground, verify, assemble) with tracing
   - Record: duration, confidence, provider name, model name, token count, status
   - Accumulate into `RuntimeTrace` object

2. Create `RuntimeTrace` types:
   - `RuntimeTrace`, `TraceStage`, `TraceStatus`

3. Add evidence tracking to Grounding Layer:
   - Each provider call records: source, query, result, rowCount, timestamp, duration, confidence
   - Accumulate into `Evidence[]` array

4. Wire trace + evidence into RuntimeContextBuilder:
   - `build()` accepts trace and evidence from the pipeline
   - Populates `RuntimeContext.trace` and `RuntimeContext.evidence`

### Deliverables

- Tracing instrumentation across all 6 pipeline stages
- Evidence collection in all grounding providers
- **Test**: Trace correctly records all 6 stages with duration and confidence
- **Test**: Evidence correctly links back to provider source
- **Test**: Trace + evidence survive contract freeze

### Risk

Low — additive instrumentation, no behavioral changes.

---

## Phase 11: Budget Enforcement + Degraded Mode (T9.2)

**Goal**: Add time budgets per pipeline stage and formal degraded mode.

### Tasks

1. Create `budget/BudgetEnforcer.ts`:
   - `executeWithBudget(stage, fn, budgetMs)` — wraps async function with timeout
   - Configurable budgets per thinking mode (fast/balanced/deep)
   - Returns `{ result, durationMs, timedOut }`

2. Integrate budget into pipeline:
   - Each stage call wrapped with budget enforcer
   - On timeout: log warning, return null, mark stage as failed

3. Implement degraded mode:
   - `RuntimeContext.degraded = true` when any critical stage fails
   - `degradedReason` populated with description of what failed
   - Degradation levels: `degraded` vs `degraded:critical`

4. Add budget config:
   - `config/budgets.ts` — default budgets per thinking mode
   - Overridable via environment variables or runtime config

### Deliverables

- `BudgetEnforcer.ts` — timeout wrapper
- Pipeline integration — all stages budget-protected
- Degraded mode detection + propagation
- **Test**: Budget timeout correctly triggers degraded mode
- **Test**: Normal operation does not trigger timeout
- **Test**: Degraded reason accurately describes what failed

### Risk

Low — additive, no behavioral changes in normal operation.

---

## Phase 12: ReasoningProvider Abstraction (T9.2)

**Goal**: Abstract LLM dependency behind `ReasoningProvider` interface for multi-model support.

### Tasks

1. Create `providers/ReasoningProvider.ts`:
   - `ReasoningProvider` interface: `reason<T>(prompt, schema, options): ReasoningResult<T>`
   - `ReasoningOptions`: model, temperature, maxTokens, thinkingMode
   - `ReasoningResult`: data, provider, model, latencyMs, tokens, confidence

2. Create `providers/DeepSeekProvider.ts`:
   - Implements `ReasoningProvider` for DeepSeek
   - Uses existing LLM client

3. Create `providers/OpenAIProvider.ts`:
   - Implements `ReasoningProvider` for OpenAI
   - Structured output mode for guaranteed JSON

4. Create `providers/AnthropicProvider.ts`:
   - Implements `ReasoningProvider` for Claude
   - Tool-use mode for guaranteed structured output

5. Create `providers/RegexFallbackProvider.ts`:
   - Implements `ReasoningProvider` for when LLM is unavailable
   - Returns degraded results with low confidence

6. Update Understanding + Reasoning Engine to use `ReasoningProvider`:
   - Inject provider via constructor or config
   - Select provider based on thinking mode

7. Create `providers/index.ts`

### Deliverables

- `ReasoningProvider.ts` — abstraction interface
- At least 2 provider implementations (e.g., DeepSeek + OpenAI)
- `RegexFallbackProvider.ts` — offline fallback
- **Test**: Same prompt produces same schema-compliant output across providers
- **Test**: Provider fallback chain works correctly
- **Test**: Thinking mode selects appropriate provider

### Risk

Medium — introducing abstraction over existing LLM calls. Mitigation: thorough integration testing with each provider.

---

## Phase 13: Capability Graph (T9.2)

**Goal**: Build the system capability registry so RIC knows what the system can do.

### Tasks

1. Create `capability/CapabilityGraph.ts`:
   - `CapabilityNode` interface: name, domain, description, groundingProviders, tools, executives, status
   - `CapabilityGraph` class: register, query, find

2. Populate capability graph at startup:
   - Scan registered tools → infer capabilities
   - Scan registered grounding providers → infer capabilities
   - Scan registered executives → map to capabilities
   - Allow manual capability registration for custom scenarios

3. Wire into Retrieval Planner:
   - Planner can check `CapabilityGraph.isCapabilitySupported()` before planning
   - If capability not supported → set `planningStrategy.type = 'not_supported'`
   - If capability degraded → reduce confidence

4. Create `capability/index.ts`

### Deliverables

- `CapabilityGraph.ts` — full capability registry
- Startup population from existing registrations
- **Test**: Graph correctly returns capabilities by domain
- **Test**: Graph correctly returns capabilities by executive
- **Test**: Unsupported capability detected and returns "Not Supported"

### Risk

Low — additive, no behavioral changes to existing pipeline.

---

## Phase 14: Runtime Diagnostics API (T9.2)

**Goal**: Expose internal RIC diagnostics for debugging and observability.

### Tasks

1. Create `diagnostics/RuntimeDiagnosticsAPI.ts`:
   - `GET /api/internal/ric/diagnostics` endpoint
   - Returns: status, version, uptime, last contract trace, budget status, provider health, capability summary

2. Data collection:
   - Pipeline stage results stored in circular buffer (last N contracts)
   - Provider health status collected via `health()` method on each provider
   - Budget enforcement results recorded per request

3. Create `diagnostics/index.ts`

### Deliverables

- `RuntimeDiagnosticsAPI.ts` — diagnostics endpoint
- Provider health aggregation
- **Test**: Endpoint returns valid JSON
- **Test**: All provider statuses correctly reported
- **Test**: Last contract trace available

### Risk

Low — additive, no behavioral changes.

---

## Phase 15: Integration + Removal

**Goal**: Wire RIC into the Executive Runtime flow.

### Tasks

1. Update `RuntimeIntelligenceCore.ts`:
   - Full `assemble()` implementation:
     ```
     1. Understanding Engine → UnderstandingResult
     2. Retrieval Planner → RetrievalPlan
     3. Grounding Layer → GroundingResult
     4. Context Builder → RuntimeContext
     5. Return RuntimeContext
     ```
   - Error handling at each stage
   - Performance tracking per stage
   - Cache layer for identical queries (optional)

2. Update `application-runtime-adapter.ts`:
   - Replace `RuntimeIntelligence.assemble()` call with `RuntimeIntelligenceCore.assemble()`
   - Keep both available during migration (flag-based)

3. Test all 7 executives:
   - CEO, CTO, CFO, COO, CMO, CHRO, CAIO
   - Each with RIE mode (reads RuntimeContext)
   - Verify no executive tries to do its own classification

4. Performance benchmark:
   - Baseline: current RIE (heuristic)
   - Target: RIC (semantic)
   - Measure: latency p50, p95, p99 per executive

### Deliverables

- `RuntimeIntelligenceCore.ts` — full pipeline
- `application-runtime-adapter.ts` — updated to use RIC
- **Test**: All 7 executives produce correct responses with RIC RuntimeContext
- **Test**: Performance benchmark results

### Risk

High — integration point with existing executives. Mitigation: parallel-run mode, gradual rollout, feature flag.

---

## Phase 16: Removal of Old RIE Modules

**Goal**: Delete deprecated RIE modules and rename the directory.

### Tasks

1. Verify zero remaining usage of old modules:
   - `intent/IntentIntelligence.ts`
   - `domain/DomainIntelligence.ts`
   - Old `repository/RepositoryIntelligence.ts`
   - Old `tool/ToolIntelligence.ts`
   - Old `planning/PlanningIntelligence.ts`
   - Old `memory/MemoryIntelligence.ts`
   - Old `metadata/MetadataIntelligence.ts`

2. Delete old module directories:
   - Remove `intent/`, `domain/`
   - Overwrite `repository/`, `tool/`, `planning/`, `memory/`, `metadata/` with new implementations

3. Update `src/runtime-intelligence/index.ts`:
   - Export new modules (RIC)
   - Remove old module exports

4. Remove old `ConfidenceEngine.ts` — completely rewritten in `confidence/ConfidenceAggregator.ts`

5. Update imports across the codebase:
   - All imports from `runtime-intelligence/` remain valid (same directory)
   - Check for any direct imports of deleted modules

6. `npm run build` — must pass

7. Run full test suite

8. Delete directory structure:
   - Rename `src/runtime-intelligence/` → `src/runtime-intelligence-core/` (optional, can be done separately)

### Deliverables

- All old module code removed
- All imports updated
- Build passes
- Test suite passes

### Risk

High — deletion has no undo. Mitigation: thorough verification before deletion, branch-based deletion (can be reverted).

---

## Summary Timeline

```
Phase 1:  Foundation                  │██████                       │ 1-2 days
Phase 2:  Repository Metadata         │    ████████████             │ 2-3 days
Phase 3:  Understanding + Reasoning   │        ████████████         │ 2-3 days
Phase 4:  Retrieval Planner           │            ████████████     │ 2-3 days
Phase 5:  Grounding Layer             │                ████████████ │ 2-3 days
Phase 6:  Verification Engine         │                    ████████ │ 2-3 days
Phase 7:  Context Builder             │                    ██████   │ 1 day
Phase 8:  Tool Catalog                │                    ████████ │ 1-2 days
Phase 9:  RuntimeContract             │                       ████████████ │ 2-3 days
Phase 10: RuntimeTrace + Evidence     │                       ████████████ │ 2-3 days
Phase 11: Budget + Degraded Mode      │                       ████████   │ 1-2 days
Phase 12: ReasoningProvider           │                       ████████   │ 1-2 days
Phase 13: Capability Graph            │                       ████████   │ 1-2 days
Phase 14: Diagnostics API             │                           ████   │ 1 day
Phase 15: Integration                 │                           ██████████████ │ 2-3 days
Phase 16: Removal                     │                               ██████████ │ 1-2 days
                                      │───────────────────────────────────────────┤
                                      │ 25-38 days total                          │
```

Phases 2-8 can be parallelized (foundation). Phases 9-14 can be parallelized (T9.2 additions). Phase 15 requires all prior phases.

### Parallelization Options

| Track | Phases | Engineer |
|---|---|---|
| Core AI | Phase 3 → Phase 4 + Phase 12 (ReasoningProvider) | AI Engineer |
| Infrastructure | Phase 2 → Phase 5 → Phase 6 → Phase 8 + Phase 13 (Capability Graph) | Backend Engineer |
| Contract | Phase 1 → Phase 7 → Phase 9 → Phase 10 → Phase 11 + Phase 14 (Diagnostics) | Integration Engineer |

With 3 engineers: **18-25 days**.
