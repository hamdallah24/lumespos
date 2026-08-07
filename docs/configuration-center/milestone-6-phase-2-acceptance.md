# Milestone 6 — Phase 2: Impact Provider SDK (ACCEPTANCE)

**Status:** READY FOR REVIEW
**Scope:** `registerImpactProvider()`, Simulation Extension, Impact Contract, Capability Discovery.
**Contract:** additive, consumer-only. Golden config contract unchanged (see §5).

---

## 1. Objective

Phase 1 delivered the Plugin SDK as the **ecosystem host surface**. Phase 2 turns
editing-time estimation into an **extensible Impact Provider SDK**: subsystems (and,
later, marketplace packages) register impact providers that assess what a config
change *does*, expanding the pipeline's metadata-driven SIMULATION/IMPACT stages with
subsystem-aware, severity-rated estimates.

Because `pipeline.ts` is **LOCKED**, the Impact SDK is a strict **consumer**: it reads
the pipeline's read-only `plan()` (before/after/preview + baseline simulation +
impact), asks registered providers to assess each changed key, and returns an
enriched `ImpactReport`. It **never** calls `run()` and never creates a revision.

---

## 2. Delivered Surface (`src/settings/impact/`)

### 2.1 Impact Contract (`types.ts`)
- `ImpactChange` — the unit of analysis: `{ key, before, after, meta, scopeType }`.
- `ImpactEstimate` — `{ key, provider, severity (none..critical), summary, detail, subsystems[] }`.
- `ImpactProviderDefinition` — `{ id, name, version, categories?/keys?, capabilities?,
  estimate(change) }`.
- `ImpactReport` / `ImpactAnalyzeInput` — the enriched report + plan-slice input.

### 2.2 Provider Registry + Capability Discovery (`providers.ts`)
- `registerImpactProvider(registry, provider)` — global idempotent registration
  (duplicate id throws); `unregisterImpactProvider(id)`.
- Eligibility matching against a changed key by **metadata category**, **key**, or
  **restart strategy** (declared-then-discovered, no hardcoding).
- `capabilitiesOf(required)` — Capability Discovery over provider-declared caps.

### 2.3 Impact Analyzer (`analyzer.ts`) — Simulation Extension
- `analyze({actor, scope, changes})` → `pipeline.plan()` (read-only) → `analyzePlan()`.
- For each changed key: find eligible providers, collect estimates, union their
  `subsystems` into the impacted set, aggregate participants.
- Pure `analyzePlan(input)` — deterministic, side-effect-free.

### 2.4 Barrel (`index.ts`)
Exports registry, `registerImpactProvider`/`unregister`, analyzer, and all types.

---

## 3. Locked / untouched contracts

- `src/settings/{registry,store,resolver,sdk,pipeline,defaults,health,events,metrics,capabilities}.ts`
- `src/settings/api/*`, `automation/*`, `governance/*`, `plugins/*`
- M5 P1–P3, M6 P1 acceptance contracts

The Impact SDK is purely additive under `src/settings/impact/`; **no existing file
modified**, including the locked Pipeline (whose `SIMULATION`/`IMPACT` stages remain
the metadata-driven baseline — providers enrich a copy, never alter the source of truth).

---

## 4. Verification

**Typecheck:** `npx tsc -p tsconfig.json --noEmit` clean for `src/settings`.

**Tests** — `tests/unit/settings/config-impact-sdk.test.ts` (7 added):
- register/unregister + duplicate rejection; eligibility by key vs unknown key.
- Capability discovery over `capabilitiesOf`.
- Analyzer enriches estimates + expands subsystes + **no new revision** (consumer guard).
- Baseline simulation preserved alongside estimates.
- Provider return `null` (decline) → no estimate, no throw.
- Multiple providers on the same key aggregate.

**Run:**
```
npx vitest run tests/unit/settings tests/architecture/config-registry-golden.test.ts tests/architecture/config-sdk-boundaries.test.ts
Test Files  16 passed (16)
Tests      192 passed (192)     [185 prior + 7 new]
```

**Golden contract:** `tests/architecture/config-registry-golden.test.ts` — 4/4;
checksum `-277bfa6c205e0594`, version 1, 44 fields. Unchanged.

Pre-existing unrelated failures (outside Configuration Center) remain:
`tests/architecture/import-boundaries.test.ts`; `src/business-os/council/*` tsc.

---

## 5. Next

- Phase 3 — Marketplace Foundation (Package Manifest, Package Registry, Dependency
  Graph, Checksum Validation, Installation, Removal).
- Phase 4 — Ecosystem Operations (Plugin Health/Metrics/Isolation/Compatibility Report).

Please review and declare **APPROVED** / **requested changes**.