# Executive Runtime — Current Situation

**Generated:** 2026-07-14  
**Purpose:** Handoff document for AI context injection

---

## Project
Point-Of-Sale monorepo at `D:\web pos\Point-Of-Sale`.  
Main app: `artifacts/api-server/` (Express + TypeScript + Vitest).  
DB: `lib/db/` (Drizzle + PostgreSQL).

---

## Architecture

### Pipeline (same for all executives)
```
Identity → Directive → SemanticEngine → ExecutionSpec → Verification
  → Governance (CKO Advisory) → CognitiveEngine → Context → PipelineLLM → Result
```

### Multi-Branch Pattern (COO, CFO, CAIO, CMO, CHRO)
- `branchId?: number` in `ExecutiveTask`
- `getBranchContext(branchId)` queries DB → injects into system prompt
- `branchId` propagated in: tags, metadata, `decide()` payload
- Defaults to `branchId=1` when not provided

### EIOS Registration
- `src/executive-runtime/index.ts` — exports all 8 execs + `initializeExecutiveRuntime()`
- `src/eios-runtime/executives/index.ts` — EIOS executive registry (8 execs)
- `src/ai/runtime/application-runtime-adapter.ts` — bridge between routes and runtimes
- `src/index.ts` — bootstraps everything via `ExecutiveDispatchRegistry.register()`

---

## 8 Executives — Status

| Executive | File | Multi-Branch | Tests | EIOS? |
|-----------|------|-------------|-------|-------|
| **CEO** | `CEO/CEOProgram.ts` | ❌ | 10 int ✅ | ✅ |
| **CTO** | `CTO/CTOProgram.ts` | ❌ | 16 int ✅ | ✅ |
| **COO** | `COO/COOProgram.ts` | ✅ (18 actions) | 18 int + 6 e2e ✅ | ✅ |
| **CFO** | `CFO/CFOProgram.ts` | ✅ | 10 int ✅ | ✅ |
| **CAIO** | `CAIO/CAIOProgram.ts` | ✅ | 10 int ✅ | ✅ |
| **CMO** | `CMO/CMOProgram.ts` | ✅ | 18 int ✅ | ✅ |
| **CKO** | `CKO/CKOProgram.ts` | ❌ | int exists | ✅ |
| **CHRO** | `CHRO/CHROProgram.ts` | ✅ (new) | 18 int ✅ | ✅ |

**Total:** 90+ integration tests passing (all 8 execs).  
**Pre-existing failures:** 12 tests (EIOS security/architecture) — unrelated to runtime work.

---

## Key Files

### Executive Runtimes
| Path | Purpose |
|------|---------|
| `src/executive-runtime/executives/COO/COOProgram.ts` | COO — 18 execution actions, `getBranchContext()`, `list_branches`/`migrate_branch` |
| `src/executive-runtime/executives/CFO/CFOProgram.ts` | CFO — Financial analysis + multi-branch |
| `src/executive-runtime/executives/CAIO/CAIOProgram.ts` | CAIO — AI system review + multi-branch |
| `src/executive-runtime/executives/CMO/CMOProgram.ts` | CMO — Market/campaign analysis + multi-branch |
| `src/executive-runtime/executives/CHRO/CHROProgram.ts` | CHRO — Personnel, shifts, HR reports + multi-branch |
| `src/executive-runtime/executives/CHRO/CHRO.config.ts` | CHRO config: role, requiredFacts, forbidden |
| `src/executive-runtime/index.ts` | Registry loader — exports all 8 execs |

### Integration Tests
| File | Tests | Role |
|------|-------|------|
| `tests/coo-integration.test.ts` | 18 | COO multi-branch |
| `tests/cfo-integration.test.ts` | 10 | CFO multi-branch |
| `tests/caio-integration.test.ts` | 10 | CAIO multi-branch |
| `tests/cmo-integration.test.ts` | 18 | CMO multi-branch, 6 realistic user messages |
| `tests/chro-integration.test.ts` | 18 | CHRO from scratch, 6 realistic user messages |
| `tests/e2e/coo-full-cycle.test.ts` | 6 | COO e2e architecture |

### Documentation
| Path | Purpose |
|------|---------|
| `docs/executive-runtime/executives/CHRO/EXECUTIVE_SPEC.md` | CHRO spec — mission, KPIs, delegation |
| `docs/executive-runtime/executives/CHRO/PLAYBOOK.md` | CHRO workflow + decision tree |
| `docs/executive-runtime/executives/CHRO/SYSTEM_PROMPT.md` | CHRO 10-layer EPF prompt |
| `docs/executive-runtime/EXECUTIVE_OPERATING_MODEL.md` | Full operating model (needs CHRO update) |

### EIOS Wiring
| File | Role |
|------|------|
| `src/eios-runtime/executives/index.ts` | EIOS executive registry (8 execs) |
| `src/eios-runtime/public/ExecutiveDispatchRegistry.ts` | Dispatch registry |
| `src/eios-runtime/internal/runtime-governance/ExecutiveIntegrityAuditor.ts` | Audits all execs registered |
| `src/ai/runtime/application-runtime-adapter.ts` | Route→Runtime bridge (8 handlers) |
| `src/index.ts` | Bootstrap — imports + registers all 8 |

### Supporting
| Path | Purpose |
|------|---------|
| `src/ai/runtime/identity.ts` | Identity definitions (all roles including CHRO) |
| `src/ai/runtime/foundation/domains/capability-domain.ts` | Capability→executive mapping |
| `src/governance/governance-types.ts` | Executive role union type |
| `src/routes/ai-business.ts` | Route handler (`list_branches`, `migrate_branch`) |
| `src/executive-runtime/cognition/` | CognitiveEngine shared across execs |
| `src/executive-runtime/core/` | BriefGenerator, ExecutiveBrief types |

---

## Next Steps

1. **CIO Runtime** — Identity exists in `identity.ts` & `capability-domain.ts` but NO program file yet. No integration tests.
2. **EIOS Security Tests** — 12 pre-existing failures in `eios-runtime/security/` and `eios-runtime-governance/` — architecture-level EIOS issues, not executive runtime.
3. **EXECUTIVE_OPERATING_MODEL.md** — Line 33 missing CHRO in dispatch list.
4. **COO E2E** — Only 6 tests, could expand to 8 execs.

---

## Common Patterns

### Adding a new executive
1. Create `executives/ROLE/ROLEProgram.ts` with `execute()`, `decide()`, `health()`
2. Create `executives/ROLE/ROLE.config.ts` with config
3. Create `executives/ROLE/index.ts` exporting the runtime
4. Add `export * from "./executives/ROLE"` to `executive-runtime/index.ts`
5. Add to `eios-runtime/executives/index.ts` registry
6. Add to `ExecutiveIntegrityAuditor.ts` expected roles
7. Add import + register to `application-runtime-adapter.ts`
8. Add import + `ExecutiveDispatchRegistry.register()` to `src/index.ts`
9. Create docs in `docs/executive-runtime/executives/ROLE/`
10. Create integration tests

### Multi-branch for an executive
- Add `branchId?: number` to `ExecutiveTask`
- Add `getBranchContext(branchId)` — queries `branchesTable`, formats context string
- Inject `branchContext` into system prompt
- Add `branchId` to tags, metadata, `decide()` payload
- Default to `branchId=1`
