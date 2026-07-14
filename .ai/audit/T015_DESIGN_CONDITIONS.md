# T.0.1.5 — Phase 1: Design Conditions Lock

## Source
T.0.1 Readiness Certification — 10 Conditions (T01_READINESS_CERTIFICATION.md:48-59)

## Audit

| # | Condition | Current State | Risk | Recommendation | Decision |
|:-:|-----------|---------------|------|----------------|:--------:|
| C1 | CEO's `KnowledgeBackbone.summarizeMemory()` must be verified NOT duplicating with MemoryProvider | `summarizeMemory()` reads ContextManager for CEO. MemoryProvider will also read ContextManager. Overlap is real. | Duplicate context in CEO prompt — wasted tokens, potential contradiction | MemoryProvider REPLACES `summarizeMemory()` for CEO. During T.0.2 transition, run both in parallel for verification, then remove `summarizeMemory()` from CEO's execute(). | **LOCKED** — MemoryProvider is the single source. `summarizeMemory()` will be removed in T.0.2 after parallel verification. |
| C2 | CKO must NOT create feedback loop where CKO's memory decisions affect CKO's next read | CKO both reads and manages memory. If CKO's own past decisions appear in its memory context, circular reasoning occurs. | Self-referential decisions — CKO validates its own past decisions | MemoryProvider filters out CKO's own recent decisions (< 30s old) from CKO's memory context. Also filter decisions where CKO is both subject AND author. | **LOCKED** — Self-feedback guard: ignore decisions by CKO for CKO in last 30s. Design includes in MemoryProvider implementation. |
| C3 | Token budget of 2500 for CEO must be validated with actual LLM calls | CEO budget set at 2500 tokens. Estimated CEO prompt goes from ~4200 to ~6700. | Context window exceeded if LLM model has 8K limit | Budget is validated via load testing in T.0.2 Phase 3. 2500 is safe for 8K window (4200+2500=6700 < 8192). Hard guard at 70% of remaining context. | **LOCKED** — 2500 for CEO, 3000 for CKO, 2000 for CTO/CAIO, 1500 for others. Dynamic guard: min(maxTokens, 30% of remaining context). |
| C4 | Latency budget of 500ms must be validated with real memory stores | MemoryProvider estimated at 510ms total (5ms parse + 500ms parallel + 5ms merge). | Exceeding 500ms delays executive reasoning | L1 cache reduces latency to ~1μs. L2 cache reduces to ~5ms. Full query (cold start) may take 500ms. Acceptable below 1s threshold. | **LOCKED** — Target p95 < 500ms for full query. L1 < 1μs, L2 < 5ms. Validated in T.0.2 Phase 3. Feature flag allows disabling if latency unacceptable. |
| C5 | Parallel read concurrency must be validated | All 6 memory stores queried via Promise.all() in parallel. Fast stores respond first. | Implementation error: sequential querying instead of parallel | Use `Promise.allSettled()` for all 6 stores. Each store has independent timeout. Never sequential. | **LOCKED** — Promise.allSettled() with per-store timeout. Fast stores never blocked by slow stores. |
| C6 | Cache invalidation must be tested end-to-end | Cache invalidated on decision.made, memory.updated, episode.stored events. | Stale cache returns outdated memory context | E2E test: (1) Read memory → cache populated. (2) Record decision → cache invalidated. (3) Read memory again → must show new decision. | **LOCKED** — Event-driven invalidation via EIOS observer. Test in T.0.2 Phase 5. |
| C7 | Circuit breaker per store must be tested with simulated failures | Circuit opens after 5 errors in 30s, retry after 60s. | Circuit stays closed during actual failure cascade | Test: Simulate 5 sequential timeouts from WorkingMemory → circuit OPEN → MemoryProvider skips WorkingMemory → returns partial results from other stores. | **LOCKED** — 5 errors / 30s → OPEN. 60s retry → HALF_OPEN. Test in T.0.2 Phase 6. |
| C8 | All 8 executives must be integrated with 3 E2E tests each | Each executive gets memory context before CognitiveEngine.think(). | One executive integration breaks silently | Each executive: test with memory, test without memory (feature flag off), test with partial memory failure. CEO: 3 tests with memory + 3 without. | **LOCKED** — Required for T.0.2 Phase 8. All 8 executives must pass. |
| C9 | DGPS regression test suite must pass with Memory Read active | Memory Read is advisory-only, no write path, no CognitiveEngine bypass. | DGPS violation: Decision governance bypassed | All DGPS checks must pass. No governance bypass. Memory context is evidence, not decision. | **LOCKED** — Required for T.0.2 Phase 9. DGPS validated after all 8 integrations. |
| C10 | Memory Read must be toggleable without code changes | Feature flag: `memoryRead.enabled` = true/false. | No way to disable memory read in production if issues arise | Environment variable `MEMORY_READ_ENABLED=true/false` (default: true). Flag read once at startup, also live-reloadable. | **LOCKED** — `MEMORY_READ_ENABLED` env var. No code changes needed to toggle. |

## Summary

| Status | Count |
|--------|:-----:|
| **LOCKED** | 10 |
| **REJECTED** | 0 |
| **Total** | 10 |

All 10 conditions from T.0.1 are now **LOCKED**. None rejected — all are valid verification requirements for T.0.2.
