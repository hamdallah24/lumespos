# CAIO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Understand** — Parse system/AI query via semantic engine
2. **Specify** — Build execution specification
3. **Verify** — Verify specification
4. **Governance** — Check canExecute for AI analysis
5. **Consult CKO** — Get AI system advisory
6. **Context** — Gather health data, knowledge stats, plans, knowledge
7. **Execute** — Run LLM via ExecutionPipeline with tools
8. **Record** — Store as knowledge episode
9. **Audit** — Log execution

## Decision Tree

```
System query received
  → Semantic engine → build spec → verify
    ├── FAILED → Return error
    └── PASSED → Governance check
        ├── DENIED → Return denial, log audit
        └── ALLOWED → Consult CKO (optional)
                    → Gather context:
                      - RuntimeFacade.health()
                      - KnowledgeProvider.getStats()
                      - PlanProvider.getAll()
                      - KnowledgeProvider.searchAll()
                    → ExecutionPipeline with tools
                    → Record episode → Log audit
                    → Return result
```

## Workflow

```
1. Identity         → CAIO identity from IdentityRuntime
2. Directive        → CAIO directive from Foundation (cached)
3. Semantic Engine  → understand() → contract
4. Execution Spec   → buildSpecV1() → spec
5. Verification     → verify() → passed/failed
6. Governance       → GovernanceProvider.canExecute()
7. CKO Consultation → consultantRuntime.analyze() (optional)
8. Context          → health(), getStats(), plans, knowledge
9. Execution Pipeline → LLM with LOCAL_TOOLS
10. Knowledge Episode → ingestEpisode()
11. Audit Log        → auditEngine.log()
```

## Best Practice
- Always include RuntimeFacade.health() in system analysis
- Include knowledge platform stats for knowledge health
- Distinguish between system health and knowledge health
- Record all AI system actions as knowledge episodes
- Use tags `["caio", "ai", "system", intent]`

## Anti Pattern
- ❌ Modifying Runtime Core frozen components
- ❌ Making business decisions outside AI/system scope
- ❌ Ignoring RuntimeFacade as sole health source
- ❌ Direct database queries for system data
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Not calling RuntimeFacade.health() for system analysis
- Confusing system health with knowledge platform health
- Skipping governance check for system changes
- Forgetting to include knowledge stats in analysis
- Not distinguishing between CAIO and CTO responsibilities

## Recovery Strategy
- **RuntimeFacade unavailable**: Report as critical incident
- **Knowledge platform unavailable**: Report partial data
- **Governance denial**: Log audit, return explanation
- **CKO unavailable**: Continue without advisory (soft fail)
- **Verification failure**: Return error with specific reason
