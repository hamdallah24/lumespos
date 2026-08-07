# Milestone 6 — Phase 3: Marketplace Foundation (ACCEPTANCE)

**Status:** READY FOR REVIEW
**Scope:** Package Manifest, Package Registry, Dependency Graph, Checksum/Integrity, Install/Remove Lifecycle.
**Contract:** additive, consumer-only, isolated. Golden config contract unchanged (see §11). This phase **does not** run Phase 4 without an explicit acceptance verdict.

---

## 1. Scope

Deliver the **Marketplace Foundation** surface — a versioned, integrity-checked,
dependency-aware package layer that sits *beside* the locked Configuration Center
core. Five sub-deliverables:

1. **Package Manifest** — deterministic, versioned manifest contract.
2. **Package Registry** — a registry *separate* from the Configuration Registry.
3. **Dependency Graph** — direct/transitive, existence, duplicate/conflict, cycle, topological order.
4. **Checksum / Integrity** — canonical representation → FNV-1a checksum over manifest, metadata, and payload.
5. **Lifecycle** — `DISCOVERED → VALIDATED → RESOLVED → INSTALLED → ACTIVE`; removal `ACTIVE → DEPENDENCY CHECK → REMOVED`.
6. **Architecture boundary tests** proving the marketplace never reaches into Store/commit/governance/resolver/pipeline.

---

## 2. Architecture changes

### 2.1 New directories (purely additive)
- `src/settings/marketplace/{manifest,dependencies,registry,lifecycle,index}.ts`

### 2.2 Reused locked code (read-only)
- `src/settings/api/snapshot/checksum.ts` — `fnv1a`, `canonicalize` (same FNV-1a algorithm as the registry fingerprint).
- `src/settings/plugins/semver.ts` — `satisfiesVersion`, semver parsing for range resolution.

### 2.3 No modifications to existing files
Locked core (`registry,store,resolver,sdk,pipeline,defaults,health,events,metrics,capabilities`), `api/*`,
`automation/*`, `governance/*`, `plugins/*`, `impact/*` are untouched.

### 2.4 Boundary guarantee
The marketplace is a **passive catalog + installer**. It never:
- creates or mutates Store state / revisions / config commits;
- makes or overrides governance decisions;
- exercises resolver or pipeline authority;
- registers or renames Configuration Registry keys;
- introduces DB, remote hosting, or network I/O.

---

## 3. Package Manifest contract (`manifest.ts`)

- `PACKAGE_MANIFEST_VERSION = "1.0.0"`.
- `PackageType = "config" | "plugin" | "impact" | "integrations"`.
- `PackageManifest` fields: `name, version, type, manifestVersion, description?, author?({name,email?,url?}),
  dependencies?, peerDependencies?, provides?, requires?, configExtensions?, compatibility?, checksum?, checksumAlgorithm?`.
- `PackageDependency = { name, range, resolved? }`; `PackageCompatibility = { sdk?, api?, registry? }`;
  `PackageConfigExtension = { key, title, type, defaultValue }`.
- `validatePackageManifest(input)` — deterministic, non-throwing, returns
  `{ ok, issues: [{ path, message }], manifest? }` (structured issue list) and a *sanitized* manifest.
  Rejects malformed name/version, unknown `type`, bad `manifestVersion`, malformed deps/configExtensions.
- Deterministic canonicalization: `canonicalManifest(manifest)` drops the `checksum`/`checksumAlgorithm`
  fields, then sorts object keys recursively via the shared `canonicalize`. Two manifests that differ only in
  key insertion order produce the same canonical form.

---

## 3. Package Registry contract (`registry.ts`)

`PackageRegistry` — a class **independent** of `src/settings/registry.ts`.

- Statuses: `discovered | validated | resolved | installed | active | removed`.
- Multi-version across a name: `get(name)[0]` = *highest* version; `getVersion(name, version)` for a specific version (deterministic).
- `register` replaces an identical `name+version`; otherwise appends the new version deterministically by `byName` insertion order.
- `resolve(name, range?)` sorts available versions descending, returns the first satisfying `range` (via `satisfiesVersion`) — or `null`.
- `unregister(name, version?)` — removes an entire package (all versions) or a specific version.
- `discoverCapabilities(required)` → `[{ name, version, provided }]` per registered package.
- Does **not** create DB tables, does **not** write the Store, does **not** modify configuration keys.

---

## 4. Dependency graph (`dependencies.ts`)

`resolveDependencyGraph(packages: Map<string, PackageManifest>)` → `{ ok, issues[{kind,message}], installOrder, removalOrder, direct[], transitive[] }`.

- `direct` = one-hop dependency edges; `transitive` = closure edges.
- `missing` — dependency unregistered **or** its declared range unsatisfied by the target's version.
- `duplicate` — same dependency declared more than once with the same range.
- `conflict` — same dependency declared with different (contradictory) ranges.
- `cycle` — DFS detection (visiting-set). Returns `ok=false`, empty `installOrder`.
- `installOrder` — post-order **DFS** topological sort (deterministic, dependency-first: a dependency is emitted before every dependent).
- `removalOrder` — reverse of install order (dependents before dependencies).

---

## 4. Checksum / integrity model (`manifest.ts`)

- `manifestChecksum(manifest)` = `fnv1a(canonicalManifest(manifest))` — covers manifest + metadata + dependency declarations.
- `payloadChecksum(payload)` = `fnv1a(canonicalize(payload))` — covers registered payload identity.
- `artifactChecksum(manifest, payload)` = `fnv1a(manifestChecksum(manifest) + "\n" + payloadChecksum(payload))` — folds both.
- `PackageManager.discover()`: computes the checksum (manifest-only, or artifact when a payload is supplied) and stores it; if the incoming raw manifest *declares* a `checksum`, it verifies the declaration equals the computed value — a mismatch fails registration with `"manifest checksum mismatch"`.
- `PackageManager.validate()` re-checks recomputed checksum on stored manifests → `"checksum invalid"`.
- Purpose: detect corrupted/manipulated manifest or payload and serve as an **artifact identity** fingerprint. Provenance only; **not** a trust or authenticity proof (no publisher signature in this phase).

---

## 5. Install/Remove lifecycle (`lifecycle.ts`)

- `inspect(input)` — structural validate, does **not** register.
- `discover(raw, payload?)` — validate + integrity check + register → `DISCOVERED`.
- `validate(name, version?)` — re-run manifest/checksum checks → `VALIDATED` (fails `"manifest invalid"` / `"checksum invalid"`).
- `install(name, version?)` — resolves the graph; fails fast on invalid manifest, missing/conflict/cycle dependency, or unreachable target. Otherwise transitions the whole graph to `RESOLVED → INSTALLED → ACTIVE` in `installOrder`, stamping `installedAt`.
- `remove(name, version?, policy?)`:
  - `blocking` (default): scans active/installed/resolved dependents that reference `name` — if any exist, returns `"blocked by dependents: ..."` and refuses.
  - `force`: bypasses the dependent check.
  - On success: sets `REMOVED`, unregisters the version, returns `removalOrder` (dependents first).
- No global singleton state; every `PackageManager` owns its own `PackageRegistry`.

---

## 5. Security boundaries

- Checksum proves **identity/immutability only** — it is **not** a trust score or authenticity check (that is explicitly a later phase: publisher signature, PKI, CA).
- No arbitrary code execution, no sandbox escape surface, no network/remote artifact fetch in this phase.
- The marketplace cannot escalate config or governance authority (boundary tests enforce this).
- All validation is deterministic and non-throwing; illegal lifecycle transitions and malformed input surface as structured `ok:false` results, never silent corruption.

---

## 6. Explicitly deferred (out of Phase 3 scope)

- Publisher signature / PKI / CA; trust score; reputation.
- Sandboxing / code-execution isolation.
- Payment / billing / license enforcement.
- Public marketplace; remote hosting; registry federation.
- Multi-tenant isolation; replication; Kafka event pipeline.
- Any config-commit, governance-decision, revision, or resolver authority.

---

## 7. Test results

**New file:** `tests/unit/settings/config-marketplace-sdk.test.ts` (**20 tests added**)

- Manifest: valid accepted; invalid name / malformed version / unknown type / bad manifestVersion rejected with structured issues; deterministic canonicalization (key order independent); checksum changes with version; `artifactChecksum` folds payload identity.
- Registry: multi-version registration, `has/get/getVersion`, duplicate-name+version replace, `resolve("^1.0.0")` → `1.1.0` / unresolvable → `null`; unregister + double-unregister; capability discovery.
- Dependency graph: direct + transitive edges resolved; `a→(b,c)`, `b→d` produces install order with `a` last and `d` before `b`; missing/version-mismatch flagged; cycle → topology **empty**; duplicate + conflict flagged.
- Integrity: checksum-consistent discover accepted; declared-vs-computed mismatch rejected.
- Lifecycle: install → ACTIVE; install fails on missing dependency; install fails on invalid (corrupted stored) manifest; removal blocked by active dependent then `force` succeeds; clean removal succeeds and unregisters.
- Boundary / consumer guard: after discover+install, the Configuration Store `revisionCount` is unchanged (marketplace never commits a revision).

**Run:**
```
npx vitest run tests/unit/settings tests/architecture/config-registry-golden.test.ts tests/architecture/config-sdk-boundaries.test.ts
Test Files  17 passed (17)
Tests      212 passed (212)     [192 prior + 20 new]
```

**Typecheck:** `npx tsc -p tsconfig.json --noEmit` — clean for `src/settings`.

---

## 8. Verification (locked contracts)

- Golden registry test (`config-registry-golden.test.ts`) — 4/4 passed.
  checksum **`-277bfa6c205e0594`**, `configVersion` 1, **44** fields — **unchanged**.
- `config-sdk-boundaries.test.ts` — passes (consumer-only invited registry/sdk/pipeline boundaries respected).

---

## 9. Locked-file verification

- Only new additive files written: `src/settings/marketplace/{manifest,dependencies,registry,lifecycle,index}.ts` and `tests/unit/settings/config-marketplace-sdk.test.ts`.
- No edits made to `src/settings/{registry,store,resolver,sdk,pipeline,defaults,health,events,metrics,capabilities}.ts`, `api/*`, `automation/*`, `governance/*`, `plugins/*`, `impact/*`.

---

## 10. Pre-existing failures (unchanged, unrelated)

- `tests/architecture/import-boundaries.test.ts` — 2 failures (`public/` importing `internal/`, `executives/` importing non-contracts). Configuration Center is not involved.
- `src/business-os/council/*` — tsc errors. Not introduced by Phase 3.

---

## 11. Golden contract

- checksum **`-277bfa6c205e0594`**, `configVersion` **1**, **44 fields**.
- Configuration catalog, default config, scopes, metadata — all unchanged.

---

## 12. Final status: **READY FOR REVIEW**

Phase 3 Marketplace Foundation implements the full requested surface additively and
isolated, with the golden contract, efficiency invariants, and pre-existing failures
all verified. Phase 4 (Ecosystem Operations) is **not** started and awaits an explicit
acceptance verdict on this phase.

Please review and declare **APPROVED** / **requested changes**.