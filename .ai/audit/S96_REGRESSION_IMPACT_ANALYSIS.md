# Regression Impact Analysis
## EPIC S.9.6 — Phase 7: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## P0-1: DGPS Directory Mismatch (`runtime/` vs `executive/`)

### What is broken?
| Item | Status | Detail |
|------|--------|--------|
| Directive loading for ALL 8 executives | ❌ **BROKEN** | 0 of 8 directives loaded at runtime |
| `getAssetContent("ceo-directive")` | ❌ **BROKEN** | Returns `""` for all 8 IDs |
| Prompt assembly directive block | ❌ **BLANK** | `assemble()` gets empty directive string |
| LLM system prompt directive section | ❌ **MISSING** | No role-specific SYSTEM_PROMPT.md content |

### What still works?
| Item | Status | Detail |
|------|--------|--------|
| Foundation assets (17) | ✅ **WORKS** | Constitution, policies loaded correctly |
| Knowledge assets (50) | ✅ **WORKS** | All knowledge assets available |
| Prompt assets (2) | ✅ **WORKS** | Global prompt loaded |
| ADR assets (9) | ✅ **WORKS** | Architecture decisions loaded |
| FoundationLoader itself | ✅ **WORKS** | Silently skips, doesn't crash |
| FoundationCache | ✅ **WORKS** | Caches assets that were loaded |
| FoundationContext building | ✅ **WORKS** | Still builds from foundation + knowledge |
| PromptAssembler identity block | ✅ **WORKS** | Identity is hardcoded in `identity.ts` |
| Executive decision logic | ✅ **WORKS** | COO, CFO, CMO, CAIO, CHRO logic intact |
| Runtime cache (KnowledgeRepo) | ✅ **WORKS** | Caching layer unaffected |
| OrganizationEngine | ✅ **WORKS** | Delegation routing uses built-in defaults |
| All API routes | ✅ **WORKS** | No crashes reported |

### Is the Executive Runtime truly broken?
**Partially.** The runtime does NOT crash — it gracefully degrades:
- FoundationLoader silently skips missing directory (line 161: `continue`)
- `getAssetContent()` returns `""` when asset not loaded
- Each executive's `getDirective()` has fallback: `return content || "";`
- PromptAssembler handles empty directive gracefully

**What's missing from prompts:**
- Role-specific SYSTEM_PROMPT.md content (responsibilities, constraints, behaviors)
- EXECUTIVE_SPEC.md content (mission, vision, objectives)
- PLAYBOOK.md content (standard operating procedures, workflows)

**The executives operate on identity (role name) and foundation knowledge only, without their role-specific guidance from the directive compilation.**

### Does fallback happen?
**No explicit fallback.** The code uses empty string as implicit fallback:
- `runtime-domain.ts:31-32`: `const content = getAssetContent(docId); if (!content) return null;`
- `CHROProgram.ts:29`: `return content || "";`
- Other executives handle empty directive gracefully in prompt assembly

### Does runtime crash?
**No.** No crashes. No thrown exceptions. The FoundationLoader's `continue` statement at line 161 is a clean skip with zero side effects. The runtime degrades gracefully.

---

## P0-2: CHRO Missing from ROLE_DIRECTIVE_MAP

### What is broken?
| Item | Status | Detail |
|------|--------|--------|
| CHRO directive resolution | ❌ **BROKEN** | `ROLE_DIRECTIVE_MAP["CHRO"]` returns undefined |
| `getDirective("CHRO")` return | ❌ **BROKEN** | Returns `null` at runtime-domain.ts:28 |
| CHRO prompt directive block | ❌ **MISSING** | Always empty even if dir mismatch is fixed |

### What still works?
| Item | Status | Detail |
|------|--------|--------|
| All 7 other executives | ✅ **WORKS** | Their ROLE_DIRECTIVE_MAP entries exist |
| CHROProgram.ts | ✅ **WORKS** | Graceful fallback: `return content || ""` |
| CHRO identity loading | ✅ **WORKS** | `getIdentity("CHRO")` works (identity.ts) |
| CHRO prompt assembly | ✅ **WORKS** | `assemble()` handles empty directive |
| CHRO cognitive engine | ✅ **WORKS** | Pipeline continues normally |
| CHRO execution pipeline | ✅ **WORKS** | LLM payload still sent |

### Is CHRO truly broken?
**The directive is missing, but CHRO is not broken in a crash sense.** CHRO:
1. Gets identity from `getIdentity("CHRO")` → works (hardcoded in `identity.ts`)
2. Gets directive `/= `` ` from `getDirective()` → empty, but doesn't crash
3. Assembles prompt via `assemble()` → works with empty directive
4. Sends payload to LLM → works

**Impact on CHRO output quality:** Same as P0-1 — CHRO lacks its role-specific SYSTEM_PROMPT.md content in the prompt.

### Double impact for CHRO:
- P0-1 (dir mismatch): prevents directive loading → CHRO would have no directive EVEN if mapped
- P0-2 (missing map): prevents directive resolution → CHRO specifically has this extra failure
- **CHRO needs both fixes** to get its directive

---

## P1-A: ConsultantProvider reads docs/

### What is broken?
| Item | Status | Detail |
|------|--------|--------|
| Runtime purity principle | ❌ **VIOLATED** | Bypasses FoundationLoader |
| FoundationLoader usage | ❌ **BYPASSED** | Direct filesystem reads |
| `.ai/PROJECT_CONTEXT.md` reading | ❌ **BYPASS** | Direct read from markdown |

### What still works?
| Item | Status | Detail |
|------|--------|--------|
| CKO advisory functionality | ✅ **WORKS** | Still reads context from files |
| CEO question processing | ✅ **WORKS** | No crash |
| Filesystem fallback | ✅ **WORKS** | `existsSync` guards against missing files |

### Is this truly a runtime path?
**YES.** `CEOProgram.ts` calls `consultantRuntime.translateToTargets()` which calls `getRootProjectContext()`. This happens during CEO question processing — a critical runtime path.

### Regression risk if fixed:
- Low risk — moving reads from `readFileSync` to `foundationLoader.load()` replaces file I/O with cached asset access
- Content might differ if PROJECT_CONTEXT.md wasn't compiled by DGPS (it currently isn't — it would need to be added to the DGPS scanner)

---

## P1-B: ConsultantDiscovery scans docs/

### What is broken?
| Item | Status | Detail |
|------|--------|--------|
| Runtime purity principle | ❌ **VIOLATED** | Scans entire docs/ directory |

### What still works?
| Item | Status | Detail |
|------|--------|--------|
| File map generation | ✅ **WORKS** | Still builds `cko-file-map.json` |
| CKO keyword search | ✅ **WORKS** | Uses generated file map |

### Is this truly a runtime path?
**NO (partially).** ConsultantDiscovery runs:
1. On startup (constructor initialization)
2. On demand (via `consultantRuntime.refresh()`)
3. Via nightly scheduler

It is NOT per-question. The file map it generates IS used per-question by ConsultantProvider. But the scan itself is batch/pre-process.

### Severity consideration:
- Lower than P1-A because it's a batch job, not per-request
- Still violates the "no docs/ read" principle
- The scan generates a file map cache; if `docs/` is removed from SCAN_DIRS, the file map would not include docs/ files for keyword matching

---

## P1-C: MissionContextRegistry scans docs/

### What is broken?
| Item | Status | Detail |
|------|--------|--------|
| Runtime purity principle | ❌ **VIOLATED** | `docs/` whitelisted for scanning |

### What still works?
| Item | Status | Detail |
|------|--------|--------|
| GitHub API (primary path) | ✅ **WORKS** | Primary data source |
| `.ai/` directory scanning | ✅ **WORKS** | Still available via whitelist |
| `src/` and `artifacts/` scanning | ✅ **WORKS** | Still available |

### Is this truly a runtime path?
**NO (fallback only).** `MissionContextRegistry`:
1. Primary: uses GitHub API (`searchRepoFiles`)
2. Fallback: `scanLocalFiles()` only when GitHub API returns no results
3. Content: `getContent()` is called on-demand

It's a fallback path, not the primary runtime graph.

---

## Impact Summary Matrix

| Finding | Runtime Crash? | Data Missing? | Graceful Degradation? | Affected Executives |
|---------|:--------------:|:-------------:|:---------------------:|:-------------------:|
| P0-1: Dir mismatch | ❌ No | ✅ All directives | ✅ Empty string fallback | ALL 8 |
| P0-2: CHRO map | ❌ No | ✅ CHRO directive | ✅ Empty string fallback | CHRO only |
| P1-A: Consultant reads docs/ | ❌ No | N/A | ✅ File existence check | CEO (indirect) |
| P1-B: ConsultantDiscovery | ❌ No | N/A | ✅ Directory existence check | CKO (indirect) |
| P1-C: MissionContextRegistry | ❌ No | N/A | ✅ GitHub API fallback | None directly |

### Bottom Line:
- **No runtime crashes** from any P0 or P1 finding
- **All 8 executives run** but with degraded prompts (missing directive content)
- **Graceful degradation** at every level — empty strings, silent skips, fallback defaults
- **The system is functional but suboptimal** — executives lack their role-specific guidance
- **Foundation + Knowledge + Prompt assembly structure all work correctly**
- **Only the directive/executive asset type** is affected by the P0 bugs
