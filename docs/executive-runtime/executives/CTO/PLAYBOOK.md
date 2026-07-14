# CTO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Authorize** — Check CTO is authorized to analyze code
2. **Scope** — Check mission scope boundaries
3. **Understand** — Parse technical request via semantic engine
4. **Plan** — Build execution spec and task graph
5. **Fetch Context** — Get relevant files from CKO + MissionContextRegistry
6. **Load Knowledge** — Get relevant technical knowledge
7. **Consult CKO** — Get project structure advisory
8. **Execute LLM** — Run analysis with tools, 3 cycles
9. **Reflect** — Analyze output for gaps and improvements
10. **Collect Evidence** — Gather evidence of analysis quality
11. **Evolve Knowledge** — Propose knowledge updates if gaps found

## Decision Tree

```
Is CTO authorized?
  ├── NO → Return error, log audit
  └── YES → Is task in scope?
      ├── NO → Return scope violation
      └── YES → Understand intent
              ├── greeting → Return greeting
              └── technical → Build spec → verify
                          ├── FAILED → Return error
                          └── PASSED → Is implementation?
                              ├── YES → Set intent to implement_change
                              └── NO → Continue
                              → Fetch context → Load knowledge → Consult CKO
                              → LLM with tools (3 cycles)
                              → CEO approval needed?
                                  ├── YES → dispatch("CEO", plan)
                                  │       ├── APPROVED → Continue
                                  │       └── REJECTED → Return rejection
                                  └── NO → Continue
                              → Reflect → Collect evidence → Evolve knowledge
                              → Return result
```

## Workflow

```
1. Identity              → CTO identity from IdentityRuntime
2. Directive             → CTO directive from Foundation (cached)
3. Authorization         → auth.can("analyzeCode")
4. Mission Scope         → withinScope()
5. Semantic Engine       → understand() → execution contract
6. Execution Spec        → buildSpecV1() → spec
7. Verification          → verify() → passed/failed
8. Planner               → plan() → taskGraph
9. Context Fetching      → fetchContext() → fileContext
10. Knowledge Loading    → loadKnowledgeWithContent()
11. CKO Consultation     → consultantRuntime.analyze()
12. Prompt Assembly      → assemble() with context
13. LLM Execution        → callDeepSeekWithTools() — 3 cycles
14. CEO Approval         → dispatch("CEO", brief) — if implementation
15. Reflection           → reflect() → report
16. Evidence Collection  → collectEvidence() → evidence
17. Knowledge Evolution  → proposeEvolution() (optional)
18. Knowledge Episode    → ingestEpisode()
19. Audit Log            → auditEngine.log()
```

## Best Practice
- Always check authorization and scope first — fail fast
- Fetch context from both CKO (file index) and MissionContextRegistry
- Use keyword translation for CKO file discovery (EN ↔ ID)
- Request CEO approval before implementation via `[CEO APPROVAL]`
- Always include reflection and evidence collection
- Handle LLM refusal patterns with post-processing

## Anti Pattern
- ❌ Writing files without CEO approval
- ❌ Accessing files outside mission scope
- ❌ Making up file contents or hallucinating code
- ❌ Skipping authorization or scope checks
- ❌ Importing from `eios-runtime/internal/*`
- ❌ Calling other executives' `execute()` directly

## Common Mistakes
- Forgetting to normalize output (check min 500 chars)
- Not catching implementation keywords in message
- Skipping evidence collection for failed executions
- CKO consultation failure causing full pipeline failure (should be soft)
- Not handling CEO approval rejection gracefully

## Recovery Strategy
- **CKO unavailable**: Continue without advisory (soft fail)
- **Mission context unavailable**: Continue with basic fetch
- **CEO approval rejected**: Return plan with rejection reason, suggest revision
- **LLM error**: Return error with specific message
- **Auth failure**: Cannot recover — return error
- **Scope violation**: Cannot recover — return error
