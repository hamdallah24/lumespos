# T.0.1.5 — Phase 10: Security Lock

## Scope

Memory Read security model covers:
- Cross-executive memory isolation
- Tenant isolation (multi-tenant)
- Session isolation
- Namespace separation
- Authorization model

## Threat Model

| Threat | Risk | Source |
|--------|:----:|--------|
| CEO reads CTO's working memory without authorization | Cross-executive leak | ExecutiveMemoryProvider.scope is not enforced |
| CKO reads organizational memory of other tenant | Tenant boundary violation | No tenant context in MemoryProvider |
| Executive reads decisions from a different session | Session confusion | Session ID not validated |
| Unauthorized code bypasses MemoryProvider | Direct store access | No enforcement currently |
| Cache serves stale/incorrect data to wrong executive | Cache poisoning | Cache key includes executive but no auth |

## LOCKED Security Model

### 1. Cross-Executive Isolation

| Rule | Enforcement | Mechanism | LOCKED? |
|------|-------------|-----------|:-------:|
| Executive can only read its OWN decisions | `ExecutiveMemoryProvider.recallForExecutive(executive)` filters by executive | Store-level filtering | **LOCKED** |
| Executive can only read its OWN working memory | `ContextManager.buildMemoryPrompt(executive)` filters by executive | Store-level filtering | **LOCKED** |
| CEO exception: CEO may read CTO/COO decisions | Scope = "organization" → CEO reads all executives | MemoryScope gating | **LOCKED** |
| CKO exception: CKO may read ALL organizational memory | CKO owns knowledge — full access | Executive role check | **LOCKED** |
| Self-feedback guard: CKO cannot read own recent decisions (<30s) | Ignore decisions where author = CKO AND executive = CKO | Temporal filter | **LOCKED** |

### 2. Tenant Isolation

| Aspect | Design | LOCKED? |
|--------|--------|:-------:|
| Tenant context | Current system is single-tenant. No tenant isolation needed. | **LOCKED — NOT APPLICABLE** |
| Future multi-tenant | If multi-tenant added, MemoryQuery would include `tenantId`. All stores would filter by tenant. | **LOCKED — FUTURE** |

### 3. Session Isolation

| Rule | Enforcement | LOCKED? |
|------|-------------|:-------:|
| Memory read is per-session | `CognitiveContext.sessionId` is propagated but not used for read scoping | **LOCKED — accepted** |
| Session boundary | Memory decisions are NOT scoped by session — decisions from ALL sessions are returned (sorted by recency) | **LOCKED** |
| Rationale | Limiting to current session would defeat purpose of memory recall (past decisions from previous sessions) | — |

### 4. Namespace Separation

| Namespace | Key Pattern | Scope |
|-----------|-------------|-------|
| Cache L1 keys | `memory::{executive}::{domain}::{scope}::{hash}` | Per-process |
| Cache L2 keys | `memory:{executive}:{domain}:{scope}:{hash}` | Cross-process |
| Decision records | Internal to ExecutiveMemoryProvider, filtered by executive | Per-executive |
| Working memory | Internal to ContextManager, keyed by executive | Per-executive |
| Semantic memory | Internal to semantic-memory.ts, query-driven | Global (query-based) |
| Organizational memory | Internal to organizational-memory.ts | Global (CKO-managed) |

### 5. Authorization Model

| Action | Who Can Do It? | Authorization Check |
|--------|---------------|---------------------|
| `MemoryProvider.read()` | Any executive | No explicit auth — executive identity is implicit |
| Read working memory | Only the executive it belongs to | ContextManager filters by executive |
| Read decisions | Only the executive who made them (except CEO organization scope) | ExecutiveMemoryProvider filters by executive |
| Read semantic memory | Any executive | No filter (query-based) |
| Read organizational memory | Only CKO (or CEO with scope=organization) | MemoryScope locking |
| Read episodic memory | Any executive | No filter (query-based) |
| Read knowledge graph | Any executive | No filter (domain-based) |
| Read another executive's data | CEO only (scope="organization") | MemoryScope gating |
| Bypass MemoryProvider | NOT ALLOWED | Lint rule (Phase 3) |

### 6. Cache Security

| Concern | Mitigation | LOCKED? |
|---------|------------|:-------:|
| Cache serves wrong executive's data | Cache key includes executive | **LOCKED** |
| Cache serves stale data | TTL + invalidation on decision.made, memory.updated | **LOCKED** |
| Cache poisoning via bad input | Cache key includes SHA256 hash of query — no collusion | **LOCKED** |
| Cache data at rest | In-memory only (not persistent) — no disk | **LOCKED** |
| Cross-process cache leak | Redis keys are namespaced with `memory:` prefix | **LOCKED** |

### 7. No Override Mechanism

| Override | Allowed? | Reason |
|----------|:--------:|--------|
| Feature flag `memoryRead.enabled = false` | **YES** | Operational safety |
| Read another executive's decisions via MemoryQuery | **NO** | ExecutiveMemoryProvider enforces isolation |
| Directly call subsystem APIs | **NO** | Lint rule (Phase 3) prevents imports |
| Bypass MemoryProvider for performance | **NO** | Breaks security, monitoring, caching |
| Skip memory read per-query | **YES** | `maxTokens = 0` returns empty context |

## Security Boundary Diagram

```
EXECUTIVE ──→ MemoryProvider ──→ Memory Subsystems
   │               │                    │
   │               │                    ├── ExecutiveMemoryProvider (per-executive)
   │               │                    ├── ContextManager (per-executive)
   │               │                    ├── semantic-memory (global)
   │               │                    ├── organizational-memory (CKO)
   │               │                    └── knowledge-graph (domain-based)
   │               │
   │               └── Cache (executive-keyed)
   │
   └── CANNOT bypass ──→ Direct subsystem access = BLOCKED by lint rule
```

## Verification

| Check | Status |
|-------|:------:|
| Cross-executive isolation defined? | **PASS** — per-executive store filtering |
| CEO exception documented? | **PASS** — organization scope |
| CKO exception documented? | **PASS** — knowledge authority |
| Self-feedback guard? | **PASS** — CKO cannot read own recent decisions |
| Tenant isolation? | **PASS** — N/A (single tenant), future plan |
| Session isolation? | **PASS** — accepted that memory spans sessions |
| Cache security? | **PASS** — key includes executive, hash prevents poisoning |
| No bypass allowed? | **PASS** — lint rule blocks direct store access |
