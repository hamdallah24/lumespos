# T15 — Lifecycle Audit

## What Was Checked
Whether `MemoryLifecycleEngine.transition()` is ever called to progress memories through:
NEW → VALIDATED → WORKING → CONSOLIDATED → LONG_TERM → ARCHIVED → FORGOTTEN

## Finding: ❌ NOT ADOPTED

### Evidence

**1. MemoryLifecycleEngine is instantiated but never reached**
- `MemoryEngine.ts:36` — `private lifecycle = new MemoryLifecycleEngine()`
- `transition()` is called at `MemoryEngine.ts:47` inside `MemoryEngine.validateMemory()` and `MemoryEngine.ts:144`
- `validateMemory()` is a public method but has **zero callers** outside the test file

**2. The write path that triggers lifecycle is dead**
- `MemoryEngine.write()` calls `this.lifecycle.validate()` — never reached
- `MemoryEngine.validateMemory()` calls `this.lifecycle.transition()` — never reached
- No cron job, scheduler, or runtime hook calls any lifecycle method

**3. All memories remain in NEW state forever**
- Since `write()` is never called, no MemoryRecord is created
- Since `validateMemory()` is never called, no NEW→VALIDATED transition occurs
- Since `promoteAll()` is never called, no VALIDATED→WORKING or WORKING→CONSOLIDATED transitions occur

### State Machine (Unused)
```
NEW ──[validateMemory()]──→ VALIDATED ──[promoteAll()]──→ WORKING
                                                              │
                                                    [consolidateAll()]
                                                              │
                                                              ▼
                                                         CONSOLIDATED
                                                              │
                                                    [promoteAll()]──→ LONG_TERM
                                                                         │
                                                              [forgetAll()]──→ ARCHIVED → FORGOTTEN
```

No arrow in this diagram is ever traversed in production.

### Dead Methods
| Method | Defined In | Production Calls |
|--------|-----------|-----------------|
| `MemoryLifecycleEngine.transition()` | `MemoryLifecycle.ts:7` | 0 |
| `MemoryLifecycleEngine.validate()` | `MemoryLifecycle.ts:22` | 0 |
| `MemoryLifecycleEngine.forget()` | `MemoryLifecycle.ts:41` | 0 |
| `MemoryEngine.validateMemory()` | `MemoryEngine.ts:141` | 0 |

## Verdict
**Lifecycle transitions: IMPLEMENTED BUT NOT ADOPTED.** The full 7-state machine exists but no memory has ever transitioned between states in production.
