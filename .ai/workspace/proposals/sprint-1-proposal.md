# Sprint 1 — Implementation Proposal

---
status: Proposal
owner: CTO
version: 0.1.0
requested: 2026-06-29
approval: Pending
---

## Proposal: Sprint 1 — Validator + Memory Bridge Completion

### Problem

Current state from PROJECT_CONTEXT.md priorities:
1. **Context preservation across sessions** — history feeds raw tool outputs back to model (getHistory loads full assistant messages)
2. **Memory contamination** — shell commands and garbled text persist across sessions
3. **Prompt consistency** — Validator exists partially (stripDSML, parseDSMLToolCalls) but lacks completion checks and contamination detection
4. **Production readiness** — codebase has 4 P1 items from Runtime Architecture that are partially implemented

From `ENGINEERING_RUNTIME_ARCHITECTURE.md`:
| Priority | Component | Current State |
|----------|-----------|---------------|
| **P0** | LLM Gateway | ✅ Stable — `callDeepSeekWithTools` |
| **P0** | Response Renderer | ✅ Stable — `fakeStream` + `emitStatus` |
| **P0** | Tool Executor | ✅ Stable — `executeToolCall` + validation |
| **P1** | **Validator** | ⚠️ Partial — has DSML strip/parse, missing: completion checks, contamination detection, output format validation |
| **P1** | **Memory Bridge** | ⚠️ Partial — has getHistory/remember, missing: history truncation parameter, contamination filter, shared context improvements |

### Solution

Sprint 1 completes P1 components to production-ready state. No new files — enhancement of existing code only.

#### Component A: Validator Enhancement (`ai-helpers.ts`)

**File:** `artifacts/api-server/src/routes/ai-helpers.ts`

**Changes:**
1. Add `validateResponse(text: string): ValidationResult` — checks completion, detects contamination, validates output format
2. Add contamination patterns: shell commands (`cd ~/`, `wc -l`, `grep -rn`, `pm2`, `\|`, `&&`), DSML fragments, garbled characters
3. Integrate into `callDeepSeekWithTools` return path — validate before returning final text
4. Log warnings when validation fails

**ValidationResult interface:**
```typescript
interface ValidationResult {
  isValid: boolean;
  cleanedText: string;
  warnings: string[];
}
```

**Contamination detection patterns:**
- `/^(cd |grep |wc |find |ls |cat |head |tail |pm2 |ssh |scp |sudo )/m` — shell commands
- `/\|/` — pipe character in text
- `/&&/` — command chaining
- `/2>\/dev\/null/` — stderr redirect
- `/undefined/garbled/` — common corruption markers

#### Component B: Memory Bridge Enhancement (`ai-helpers.ts`)

**File:** `artifacts/api-server/src/routes/ai-helpers.ts`

**Changes:**
1. `getHistory()` — apply `maxContentLength: 400` by default in `callDeepSeekWithTools` calls (already partially done — verify it's applied)
2. Add `filterContamination(history: ChatMsg[]): ChatMsg[]` — strip assistant messages containing shell commands or garbled text
3. Add `detectContamination(history: ChatMsg[]): string[]` — returns list of contamination warnings

### Affected Assets

| Asset | Impact |
|-------|--------|
| `ai-helpers.ts` (822 lines) | +60 lines: Validator functions, contamination filter, Memory Bridge enhancements |
| `ai.ts` (595 lines) | +5 lines: call Validator before fakeStream, call contamination filter on history load |
| `ai-prompts.ts` | No change |
| Foundation docs | No change |
| Runtime architecture | P1 → ✅ Done |

### Rationale

**Why Sprint 1 = P1 first (not P2-P4):**

1. **Directly addresses current bugs:** The history contamination bug (CTO echoing shell commands) is caused by Memory Bridge loading contaminated history. The 400 errors at final round are partially caused by Validator not catching malformed responses before they're saved.

2. **No architecture risk:** P1 components are enhancements to existing, stable code. No new files, no new interfaces, no new dependencies. Zero risk of breaking P0.

3. **Immediate user impact:** Validator + Memory Bridge completion means: (a) CTO stops echoing shell commands in responses, (b) history doesn't get corrupted across sessions, (c) 400 errors at final round are caught and diagnosed instead of silently breaking.

4. **Unblocks P2:** Prompt Assembler (P2) needs clean history. Knowledge Loader (P2) needs validated output. Both depend on P1 being complete.

**Why not P2-P4 now:**

- Prompt Assembler (P2): Requires extraction from ai.ts — significant refactor. Needs P1 stable first.
- Knowledge Loader (P2): Requires `loading_strategy` implementation — new engine entirely. Needs Event Bus (not yet built).
- Planner (P3): Requires Event Bus. Large new component.
- Intent Classifier (P3): Formalizes existing code. Low urgency.
- Knowledge Evolution Engine (P4): Depends on P1-P3 being complete.

### Completed Foundation Compliance

This Sprint aligns with these Foundation directives:

| Directive | Compliance |
|-----------|-----------|
| `CONSTITUTION.md` Chapter 4: "Never Assume. Always Verify." | Validator enforces this programmatically |
| `CONSTITUTION.md` Chapter 4: "Always Preserve Context." | Memory Bridge prevents context corruption |
| `CTO_EXECUTIVE_DIRECTIVE.md`: "History Truncation" constraint | Applied: `getHistory(userId, mode, 400)` |
| `CTO_EXECUTIVE_DIRECTIVE.md`: "Sanitize + Validate" constraint | Enhanced: Validator now checks output, not just input |
| `NORTH_STAR.md`: "Context is the most expensive resource" | This sprint directly preserves context integrity |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Contamination filter false-positives (valid text flagged as contamination) | Low | Medium | Conservative patterns — only flag unambiguous shell commands. Add allowlist for code blocks. |
| Validator rejects valid DeepSeek responses | Low | Medium | ValidationResult includes original text fallback. When in doubt, pass through with warning. |
| Performance overhead from validation | Very Low | Low | Validation is string-matching (O(n), n=response length). Adding <5ms to total pipeline. |
| Existing tests break | None | None | No tests exist for these functions. P1 does not introduce regression risk. |

### Rollback Strategy

If any component breaks production:
1. `Validator` — provides `cleanedText` as fallback. If it incorrectly flags content, disable contamination check (1 line: `if (false) checkContamination(text)`).
2. `Memory Bridge` — `maxContentLength` parameter is optional. Remove the parameter to revert to full history loading (1 line change).
3. Both components are additive — no structural changes to the pipeline.

### Confidence

**High (90%)** — These are targeted enhancements to existing, battle-tested code. The Validator extends the already-stable DSML parser. The Memory Bridge formalizes the truncation that we've already manually confirmed works. 10% uncertainty: edge cases in contamination pattern matching.

### Deliverables

1. `ai-helpers.ts`: +60 lines (Validator, contamination filter, maxContentLength enforcement)
2. `ai.ts`: +5 lines (Validator call before fakeStream, contamination check on history load)
3. No new files
4. No schema changes
5. No frontend changes
6. No new npm dependencies

### Approval Requested
[ ] Approve
[ ] Reject
[ ] Revise (comment below)
