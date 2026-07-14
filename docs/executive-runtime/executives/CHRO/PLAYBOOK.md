# CHRO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Understand** — Parse HR query via semantic engine
2. **Specify** — Build execution specification
3. **Verify** — Verify specification
4. **Governance** — Check canExecute for HR analysis
5. **Consult CKO** — Get HR advisory
6. **Cognitive** — Run cognitive reasoning on HR context
7. **Context** — Get branch context, gather plans and knowledge
8. **Execute** — Run LLM via ExecutionPipeline with tools
9. **Record** — Store as knowledge episode
10. **Audit** — Log execution

## Decision Tree

```
HR query received
  → Identity → Directive → Semantic Engine → buildSpec → verify
    ├── FAILED → Return error with stopReason
    └── PASSED → Governance check
        ├── DENIED → Return denial, log audit
        └── ALLOWED → Consult CKO (optional)
                    → Cognitive reasoning
                    → Gather context (branch, plans, knowledge)
                    → ExecutionPipeline with tools
                    → Record episode → Log audit
                    → Return result
```

## Workflow

```
1. Identity         → CHRO identity from IdentityRuntime
2. Directive        → CHRO directive from Foundation (cached)
3. Semantic Engine  → understand() → contract
4. Execution Spec   → buildSpecV1() → spec
5. Verification     → verify() → passed/failed
6. Governance       → GovernanceProvider.canExecute()
7. CKO Consultation → consultantRuntime.analyze() (optional)
8. CognitiveEngine  → think() → trace (skip for greetings)
9. Context          → getBranchContext(), PlanProvider.getAll(), KnowledgeProvider.searchAll()
10. PipelineLLM     → assembled system prompt + LLM execution
11. Knowledge Episode → ingestEpisode()
12. Audit Log       → auditEngine.log()
```

## Branch Context
`getBranchContext(branchId)` fetches all branches from DB, identifies the active branch, and injects a contextual summary into the system prompt:
```
## Context Cabang
Kamu sedang mengelola SDM untuk cabang **Bandung** (ID:2) — Jawa Barat

### Daftar Semua Cabang:
  - ID 1: Jakarta Pusat ⬅️ AKTIF
  - ID 2: Bandung (Jawa Barat)
  - ID 3: Surabaya (Jawa Timur)

Data SDM bisa berbeda per cabang. Sertakan konteks cabang dalam analisa.
```

## Best Practice
- Always check governance before HR analysis
- Consult CKO for HR/people context
- Use getBranchContext() to inject branch awareness
- Include branchId in tags and metadata
- Include both plans and knowledge context
- Record all HR decisions as knowledge episodes with `branch:n` tag
- Default to branchId=1 when not specified

## Anti Pattern
- ❌ Fabricating personnel or attendance data
- ❌ Ignoring governance constraints
- ❌ Making salary/payroll decisions without authority
- ❌ Using hardcoded branch/user IDs
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Not checking governance before execution
- Skipping CKO consultation for HR context
- Forgetting to record knowledge episodes
- Overpromising staffing changes

## Recovery Strategy
- **Governance denial**: Log audit, return clear explanation
- **CKO unavailable**: Continue without advisory (soft fail)
- **Verification failure**: Return error with specific reason
- **LLM error**: Return fallback message
- **Branch data unavailable**: Continue without branch context (soft fail)
