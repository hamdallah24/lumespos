# Milestone 6 — Phase 1: Plugin SDK (ACCEPTANCE)

**Status:** READY FOR REVIEW
**Scope:** Plugin Manifest, Plugin Lifecycle, Capability Registration, Dependency Validation, Version Compatibility.
**Contract:** additive, consumer-only. Golden config contract unchanged (see §5).

---

## 1. Objective

Milestone 6 opens the **Ecosystem & Plugin SDK**. Phase 1 delivers the plugin
surface that everything downstream (Impact Provider SDK, Marketplace, Ecosystem Ops)
will build on:

1. **Plugin Manifest** — a declarative contract of every plugin.
2. **Plugin Lifecycle** — a guarded state machine for safe runtime transitions.
3. **Capability Registration** — plugins declare what they provide and require.
4. **Dependency Validation** — plugin-to-plugin deps (presence, semver range, cycles, start order).
5. **Version Compatibility** — plugin ↔ host API/SDK compatibility at registration.

Every constraint from M5 stays locked: the plugin surface is **consumer-only**, reads
flow through the **SDK reader**, notifications flow through the **locked
`ConfigEventBus`** (plugins never receive config values), and no plugin can acquire
write authority over the Store, Pipeline, or Registry.

---

## 2. Delivered Surface (`src/settings/plugins/`)

### 2.1 Types (`types.ts`)
- `PluginManifest` — id, name, version, `apiVersion` (plugin-SDK API targeted),
  `requiresSdk` (semver range of host config-sdk), `hooks`, `capabilities`,
  `requiresCapabilities`, `dependencies`.
- `PluginImplementation` — optional `init/start/stop/onConfigurationChanged`.
- `PluginRuntimeContext` — plugin id + a `ConfigReader` (read-only) + logger.
- `PluginRegistration` / `PluginReport` — status snapshot + host summary.

### 2.2 Semver (`semver.ts`)
Self-contained semver parser + comparator + range matching (`=`, `^`, `~`, `>=`,
`<=`, `>`, `<`, `x`/`*` partials, `||` OR groups, pre-release handling). No external
dependency.

### 2.3 Manifest validation (`manifest.ts`)
`validatePluginManifest()` is deterministic, non-throwing, returns structured
`{ ok, issues: [{path,message}] }` and a sanitized manifest. Rejects bad ids,
malformed versions, unknown hooks, bad capability/requiresCapabilities/dependency
entries.

### 2.4 Version Compatibility (`compatibility.ts`)
`VersionCompatibility.check(manifest)`:
- plugin `apiVersion.major` must equal host `apiVersion.major`, and plugin API ≤ host API;
- host `sdkVersion` must satisfy plugin `requiresSdk` (semver range).

### 2.5 Capability Registration (`capabilities.ts`)
`CapabilityRegistry` seeds host capabilities (`__host__` provider) and registers
plugin-provided capabilities. A capability has exactly **one** provider — duplicate
registration throws. `unregisterAll` releases on uninstall.

### 2.6 Dependency Validation (`dependencies.ts`)
`validateDependencies(manifest, available)`:
- required (non-optional) deps must be registered;
- declared semver `range` must be satisfied by the target's version;
- cycle detection (DFS) over the whole graph;
- topological `order` (dependencies before dependents).

### 2.7 Lifecycle (`lifecycle.ts`)
Explicit legal-edge state machine:
```
registered → initialized → active ⇄ inactive → active
error reachable from any runtime state; error → initialized/active re-attempts.
```
Illegal transitions throw (never silently corrupt state); same-state re-entry is
idempotent.

### 2.8 Registry (`registry.ts`)
Stores implementations, status, subscription handles; exposes
`startOrder()` (dependencies first) and per-plugin subscription bookkeeping.

### 2.9 PluginManager (`manager.ts`)
`register()` runs the full gate in a fixed order — **manifest validate → version
compatibility → capability register → dependency validate → registry put** — and
rolls back capability registration on failure. Lifecycle ops (`init/start/stop/
unregister`) drive the state machine and only invoke the plugin's own hooks.
`on-config-changed` hooks are wired as consumers of the locked `ConfigEventBus`
(notifications only, no values). `report()` returns counts and the capability map.

---

## 3. Locked/untouched contracts

- `src/settings/{registry,store,resolver,sdk,pipeline,defaults,health,events,metrics,capabilities}.ts`
- `src/settings/api/*`, `src/settings/automation/*`, `src/settings/governance/*`
- M5 P1/P2/P3 acceptance contracts

The Plugin SDK is purely additive under `src/settings/plugins/`; no existing file was
modified.

---

## 4. Verification

**Typecheck:** `npx tsc -p tsconfig.json --noEmit` clean for `src/settings`.

**Tests** — `tests/unit/settings/config-plugin-sdk.test.ts` (21 added):
- Manifest: valid accepted; missing id / bad version / unknown hook rejected; bad dep range rejected.
- Semver: parse+order; exact/caret/tilde/comparison matching.
- Compatibility: newer API major rejected; unsatisfied sdk range rejected.
- Dependencies: pass + topo order; missing dep; version mismatch; cycle detection.
- Manager: register/reject invalid/incompatible (with capability rollback)/duplicate.
- Lifecycle: init→start→stop counting + idempotency; hook throw → error; unregister removes.
- Capabilities: host seeding + provider resolution; config-changed notification through the bus.
- Report: registered/active/error counts + host versions.

**Run:**
```
npx vitest run tests/unit/settings tests/architecture/config-registry-golden.test.ts tests/architecture/config-sdk-boundaries.test.ts
Test Files  15 passed (15)
Tests      185 passed (185)     [164 prior + 21 new]
```

**Golden contract:** `tests/architecture/config-registry-golden.test.ts` — 4/4 passed;
checksum `-277bfa6c205e0594`, configVersion 1, 44 fields. Unchanged.

Pre-existing unrelated failures (outside Configuration Center) remain:
`tests/architecture/import-boundaries.test.ts`; `src/business-os/council/*` tsc errors.

---

## 5. Next

- Phase 2 — Impact Provider SDK (`registerImpactProvider()`, Simulation Extension, Impact Contract, Capability Discovery).
- Phase 3 — Marketplace Foundation.
- Phase 4 — Ecosystem Operations (Plugin Health/Metrics/Isolation/Compatibility Report).

Please review and declare **APPROVED** / **requested changes**.