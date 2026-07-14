# COO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Load Identity** — Get COO identity
2. **Load Directive** — Get COO directive from Foundation
3. **Get Charter** — Get Foundation context
4. **Get Advisory** — Get CKO advisory for operations
5. **Build Brief** — Generate ExecutiveBrief via BriefGenerator
6. **Classify Intent** — Use LLM to classify message into: approve/status/action/question/none
7. **Handle by Intent** — Route to appropriate handler
8. **Record** — Log action as knowledge episode
9. **Audit** — Log via auditEngine

## Decision Tree

```
Operational message received
  → Identity → Directive → Foundation Charter → CKO Advisory → Brief
  → Intent Classification (LLM)
    ├── "approve" → handleApprove(situationId, optionId, branchId)
    │               ├── approve → Record episode → Return success
    │               ├── reject → Record episode → Return rejection
    │               └── escalate → CommunicationProvider.dispatch(founder)
    │                           → Record episode → Return escalation
    ├── "status"  → handleStatus(query, branchId)
    │               → Generate full brief → LLM response → Return
    ├── "action"  → handleAction(action, params, branchId)
    │               → Governance check
    │                 ├── DENIED → Notify founder → Return denial
    │                 └── ALLOWED → executeOperation() → Record episode → Return
    ├── "question" → handleQuestion(query)
    │               → KnowledgeProvider.searchAll()
    │               → KnowledgeProvider.getBestPractices()
    │               → LLM response → Return
    └── "none"    → LLM with full context
                    → Parse JSON action from response
                    → Execute multi-action if needed
                    → Return natural response + action results
```

## Workflow

```
1. Identity              → COO identity
2. Directive             → getDirective() from Foundation
3. Foundation Charter    → getFoundationCharter()
4. CKO Advisory          → getCKOAdvisory()
5. Brief Generation      → getCOOBrief(branchId)
6. Intent Classification → callDeepSeek(COO_INTENT_PROMPT)
7. Intent Routing        → approve | status | action | question | none
8. Handler Execution     → Corresponding handler
9. Knowledge Episode     → ingestEpisode()
10. Audit Log            → auditEngine.log()
```

## Available Actions (18)
```
add_product, add_product_with_variants_and_recipe, add_variant,
update_variant_price, update_price, deactivate_product,
add_stock, reduce_stock, correct_stock, loss_correction,
produce, add_ingredient, add_semi_finished, add_recipe_by_name,
update_recipe, add_expense, change_role, migrate_branch
```

## Best Practice
- Always classify intent first — it determines the response path
- Check governance before any action execution
- Use BriefGenerator for daily operational summaries
- Record ALL actions as knowledge episodes with proper tags
- For multi-action responses, execute sequentially and collect all results
- Use CommunicationProvider for Founder notifications

## Anti Pattern
- ❌ Reading database directly
- ❌ Calculating KPIs or metrics (COO reports, not calculates)
- ❌ Making inventory changes without governance check
- ❌ Changing prices or recipes without proper approval
- ❌ Using hardcoded branch/user IDs
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Intent classification parsing errors (JSON format issues)
- Forgetting to handle multi-action JSON format
- Not including natural response before JSON action block
- Governance denial on critical actions not notifying Founder
- Not filtering intent "none" properly (should not match any other intent)

## Recovery Strategy
- **Intent parse failed**: Fall through to LLM with full context
- **Action not recognized**: Return action unknown
- **Governance denied**: Log audit, notify Founder, return clear explanation
- **Operation failed**: Return error message from executeOperation
- **Knowledge unavailable**: Return response with partial context
- **CKO advisory unavailable**: Continue without (soft fail)
