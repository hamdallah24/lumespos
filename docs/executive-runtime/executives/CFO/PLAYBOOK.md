# CFO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Understand** — Parse financial query via semantic engine
2. **Specify** — Build execution specification
3. **Verify** — Verify specification
4. **Governance** — Check canExecute for financial analysis
5. **Consult CKO** — Get financial structure advisory
6. **Context** — Gather plans and knowledge
7. **Execute** — Run LLM via ExecutionPipeline with financial tools
8. **Record** — Store as knowledge episode
9. **Audit** — Log execution

## Decision Tree

```
Financial query received
  → Semantic engine → build spec → verify
    ├── FAILED → Return error
    └── PASSED → Governance check
        ├── DENIED → Return denial, log audit
        └── ALLOWED → Consult CKO (optional)
                    → Gather context (plans, knowledge)
                    → ExecutionPipeline with tools
                    → Record episode → Log audit
                    → Return result
```

## Workflow

```
1. Identity         → CFO identity from IdentityRuntime
2. Directive        → CFO directive from Foundation (cached)
3. Semantic Engine  → understand() → contract
4. Execution Spec   → buildSpecV1() → spec
5. Verification     → verify() → passed/failed
6. Governance       → GovernanceProvider.canExecute()
7. CKO Consultation → consultantRuntime.analyze() (optional)
8. Context          → PlanProvider.getAll(), KnowledgeProvider.searchAll()
9. Execution Pipeline → LLM with LOCAL_TOOLS
10. Knowledge Episode → ingestEpisode()
11. Audit Log        → auditEngine.log()
```

## Best Practice
- Always check governance before financial analysis
- Consult CKO for financial structure context
- Include both plans context and knowledge context in prompt
- Record all financial decisions as knowledge episodes

## Anti Pattern
- ❌ Fabricating financial data
- ❌ Ignoring governance denials
- ❌ Bypassing verification
- ❌ Using hardcoded financial assumptions
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Not checking governance before execution
- Skipping CKO consultation for financial context
- Forgetting to record knowledge episodes

## Recovery Strategy
- **Governance denial**: Log audit, return clear explanation
- **CKO unavailable**: Continue without advisory (soft fail)
- **Verification failure**: Return error with specific reason
- **LLM error**: Return fallback message
