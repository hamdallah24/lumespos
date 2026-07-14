# Executive Decision Model

**Version:** 1.0.0  
**Status:** Architecture v4.1  
**Last Updated:** 2026-07-13

---

## 1. Decision Lifecycle

```
Trigger → Analyze → Evaluate → Decide → Execute → Verify → Record
```

### Stage 1: Trigger
A decision is triggered by:
- User request (founder query, command)
- `ExecutiveBrief` from pipeline (via `decide()`)
- Delegation from another executive (via `dispatch()`)
- Scheduled review (via `PipelineScheduler`)

### Stage 2: Analyze
- Parse the request/brief
- Extract intent, domain, entities, objective
- Check authorization and scope
- Semantic understanding via `understand()`

### Stage 3: Evaluate
- Build execution specification via `buildSpecV1()`
- Verify specification via `verify()`
- Check governance via `GovernanceProvider.canExecute()`
- Assess risk level

### Stage 4: Decide
- Determine action type
- Calculate confidence score
- Optionally delegate to another executive
- Return `ExecutiveDecision` with reasoning

### Stage 5: Execute
- Run executive pipeline stages
- Invoke LLM for reasoning
- Process tools and actions
- Collect evidence

### Stage 6: Verify
- Post-execution verification
- Check objective achievement
- Validate evidence quality

### Stage 7: Record
- `KnowledgeProvider.ingestEpisode()` — store as knowledge
- `auditEngine.log()` — permanent audit entry
- Return final result

---

## 2. Confidence

### Calculation
Confidence is calculated based on:
- **Data availability** (30%) — Is relevant knowledge accessible?
- **Specification clarity** (25%) — Is the objective well-defined?
- **Verification result** (20%) — Did verification pass?
- **Risk assessment** (15%) — How risky is the decision?
- **Historical precedent** (10%) — Have similar decisions succeeded?

### Thresholds

| Level | Range | Action |
|-------|-------|--------|
| HIGH | 90-100 | Execute immediately |
| MEDIUM | 70-89 | Execute with monitoring |
| LOW | 50-69 | Delegate or request clarification |
| INSUFFICIENT | < 50 | Escalate to higher authority |

### Confidence Examples by Executive

| Executive | Typical Actions | Typical Confidence |
|-----------|----------------|-------------------|
| CEO | strategic_monitor | 95 |
| CEO | review_approvals | 90 |
| CEO | delegate | 85 |
| CTO | technical_review | 85 |
| CTO | monitor_tech | 90 |
| CFO | financial_review | 85 |
| CFO | monitor_finance | 90 |
| CMO | market_analysis | 75 |
| CMO | monitor_market | 85 |
| CAIO | system_review | 80 |
| CAIO | monitor_system | 90 |
| CKO | curate_knowledge | 80 |
| CKO | monitor_knowledge | 90 |
| COO | approve | 85 |
| COO | execute_action_items | 75 |
| COO | monitor | 90 |

---

## 3. Evidence

### Evidence Sources

| Source | Used By | Reliability |
|--------|---------|-------------|
| KnowledgePlatform episodes | All executives | HIGH |
| PlanProvider | All executives | HIGH |
| GovernanceProvider | All executives | HIGH |
| Foundation directives | CEO, CTO, COO, CFO, CMO, CAIO | HIGH |
| CKO ConsultantRuntime | CEO, CTO, CFO, CMO, CAIO | MEDIUM |
| LLM reasoning | All executives | MEDIUM |
| MissionContextRegistry | CTO | MEDIUM |
| CouncilSessionManager | CKO | HIGH |

### Evidence Collection
The CTO's `collectEvidence()` method is the canonical evidence collection process:
```typescript
collectEvidence(spec, report, metrics, responseText)
```
Returns evidence with `strength` (strong/medium/weak) and `findings[]`.

---

## 4. Verification

### Pre-Execution Verification
- `verify(spec)` — checks execution specification validity
- `GovernanceProvider.canExecute()` — policy compliance
- `auth.can()` — authorization check
- `withinScope()` — scope validation

### Post-Execution Verification
- Objective achieved check
- Evidence quality assessment
- Reflection analysis via `reflect()`
- Knowledge evolution proposal via `proposeEvolution()`

### Verification Outcomes
| Outcome | Action |
|---------|--------|
| PASSED | Proceed to execution |
| FAILED - Minor | Retry with adjustment |
| FAILED - Major | Return error, log audit |
| FAILED - Critical | Escalate, block further actions |

---

## 5. Delegation

### Delegation Decision Tree
```
Task received
    │
    ├── Within scope AND within capability?
    │   ├── YES → Execute directly
    │   └── NO → Can delegate?
    │       ├── YES → ExecutiveDispatchRegistry.dispatch(targetRole, brief, ctx)
    │       │           ├── Target exists?
    │       │           │   ├── YES → Target.decide() → Decision returned
    │       │           │   └── NO → Return error, log audit
    │       │           └── Decision received → Incorporate into response
    │       └── NO → Escalate
    └── Escalate to CEO or Founder
```

### Delegation Contract
- Brief must include: id, role, title, date, summary, sections, actionItems, pendingApprovals
- Context may include: userId, branchId, domain information
- Decision must include: role, action, reasoning, confidence, optional delegateTo

---

## 6. Approval

### Approval Levels

| Level | Required By | Triggers |
|-------|-------------|----------|
| NONE | — | Low-risk, routine operations |
| SELF | Executive | Medium-risk, within scope |
| CROSS | Other executive | Cross-domain delegation |
| CEO | CEO | High-risk, strategic changes |
| FOUNDER | Human Founder | Critical, irreversible changes |

### Approval Flow (CEO ↔ CTO Example)
1. CTO creates implementation plan
2. CTO formulates `[CEO APPROVAL]` message
3. CEO receives message via `execute()`
4. CEO runs `callDeepSeek()` with approval prompt
5. Returns "APPROVED" or "REJECTED: [reason]"
6. CTO proceeds or adjusts based on response

---

## 7. Audit

### Decision Audit Record
Every decision produces:
```typescript
auditEngine.log({
  actor: string,        // Executive role (CEO, CTO, etc.)
  action: string,       // What was done
  resource: string,     // What it affected
  result: string,       // allowed | denied
  reason: string,       // Why
  metadata: {           // Context
    userId?: number,
    branchId?: number,
    intent?: string,
    domain?: string,
    success?: boolean,
    durationMs?: number,
  }
})
```

### Knowledge Episode Record
Every decision also produces:
```typescript
KnowledgeProvider.ingestEpisode({
  eventType: string,    // ceo_decision, cto_execution, etc.
  eventId: string,      // Unique ID
  context: string,      // Original request context
  outcome: string,      // success | failure | neutral
  domain: string,       // Business domain
  topic: string,        // Subject
  summary: string,      // What happened
  tags: string[],       // Categorization
})
```

---

## 8. Rollback

### When Rollback is Possible
- Inventory adjustments (`correct_stock`, `loss_correction`)
- Price changes (`update_price`, `update_variant_price`)
- Product status changes (`deactivate_product`)
- Recipe changes (`update_recipe`)

### When Rollback is NOT Possible
- Irreversible operations (data deletion, user removal)
- Completed financial transactions
- Shipped inventory
- Deployed production code changes

### Rollback Strategy
1. **Detect failure** — Verfication fails or error occurs
2. **Assess reversibility** — Can the action be undone?
3. **Execute compensation** — Run compensating action
4. **Log compensation** — Record in audit trail
5. **Notify** — Report rollback to user

### Compensation Actions
| Forward Action | Compensation |
|---------------|--------------|
| `add_stock` | `reduce_stock` |
| `reduce_stock` | `add_stock` |
| `update_variant_price` | `update_variant_price` with old value |
| `deactivate_product` | `activate_product` |
| `add_expense` | Reverse expense entry |
