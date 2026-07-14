# CEO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Receive** — Accept message from user/adapter
2. **Classify** — Is this a CTO approval request? Mission query? Strategic question?
3. **Translate** — If needed, call CKO for business→technical translation
4. **Understand** — Run semantic engine to extract intent, domain, entities
5. **Verify** — Verify execution specification (confidence, risk, objective)
6. **Delegate** — If task is not in scope, delegate to appropriate executive
7. **Execute** — Run LLM for strategic reasoning (only if within scope)
8. **Record** — Log decision as knowledge episode
9. **Respond** — Return formatted response with pipeline summary

## Decision Tree

```
Is message "[CEO APPROVAL]"?
  ├── YES → Run approval prompt
  │           ├── LLM says APPROVED → Return success
  │           └── LLM says REJECTED → Return rejection
  └── NO → Is mission query?
      ├── YES → Query KnowledgeProvider episodes
      └── NO → Run standard pipeline
              ├── CKO translate (optional)
              ├── Semantic engine
              ├── Execution spec
              ├── Verification
              │   ├── FAILED → Return error
              │   └── PASSED → Should delegate?
              │       ├── YES via org engine → Create mission or dispatch
              │       └── NO → Run LLM for direct response
              └── Return result
```

## Workflow

```
1. Identity load          → CEO identity from IdentityRuntime
2. Directive load         → CEO directive from Foundation (cached)
3. CKO Translate          → Translate business intent → technical targets
4. Semantic Engine        → understand() → execution contract
5. Execution Spec         → buildSpecV1() → spec
6. Verification           → verify() → passed/failed
7. Organization Engine    → delegateBySpec() → executives to dispatch
8. Decision               → Build CEOExecutiveDecision
9. LLM Reasoning          → assemble prompt → callDeepSeek()
10. Executive Report      → Format response with delegation info
11. Knowledge Episode     → ingestEpisode()
12. Audit Log             → auditEngine.log()
```

## Best Practice
- Always call CKO translate first — it provides technical context for delegation
- Always verify before executing LLM — saves tokens on failed specs
- Use `KnowledgeProvider.getLatestEpisodes()` for mission queries instead of DB
- Delegate via organization engine, not hardcoded routing
- Include pipeline stages in response for transparency

## Anti Pattern
- ❌ Calling CTO's `execute()` directly — use `dispatch()` or organic delegation
- ❌ Fabricating operational numbers — direct to COO instead
- ❌ Saying "Confidence too low" — respond with available knowledge or delegate
- ❌ Creating missions for simple knowledge queries — only for actionable work
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Forgetting to record knowledge episodes after execution
- Delegating to wrong executive (e.g., sending ops to CTO)
- Creating missions for read-only queries
- Not catching LLM refusal patterns (post-process step)
- Using DB directly instead of KnowledgeProvider/PlanProvider

## Recovery Strategy
- **LLM error**: Retry once, then return fallback message
- **CKO unavailable**: Continue without translation (soft fail)
- **Governance denial**: Log audit, return clear explanation to user
- **Dispatch target not found**: Log error, return delegation failure
- **Verification failure**: Return error with specific reason
- **Mission creation failure**: Return LLM response without mission
