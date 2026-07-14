# Executive Operating Model

**Version:** 1.0.0  
**Status:** Architecture v4.1  
**Last Updated:** 2026-07-13

---

## Executive Lifecycle

```
User
  │
  ▼
[1]  ┌─────────────────────────────────────┐
     │  USER INTENT                        │
     │  Founder, staff, or system triggers  │
     │  a request via route → adapter       │
     └──────────┬──────────────────────────┘
                │
                ▼
[2]  ┌─────────────────────────────────────┐
     │  DISPATCH                           │
     │  ApplicationRuntimeAdapter selects   │
     │  executive based on intent:          │
     │  - strategic/founder → CEO           │
     │  - technical → CTO                   │
     │  - operational → COO                 │
     │  - financial → CFO                   │
     │  - market → CMO                      │
     │  - AI/system → CAIO                  │
     │  - knowledge → CKO                   │
     │  Delegates via dispatch()            │
     └──────────┬──────────────────────────┘
                │
                ▼
[3]  ┌─────────────────────────────────────┐
     │  DECISION                           │
     │  Executive analyzes intent:          │
     │  - Identity → Directive → Auth       │
     │  - Semantic Understanding            │
     │  - Execution Specification           │
     │  - Verification                      │
     │  - Governance check                  │
     │  Outcome: proceed, delegate,         │
     │  or reject                          │
     └──────────┬──────────────────────────┘
                │
                ▼
[4]  ┌─────────────────────────────────────┐
     │  DELEGATION                         │
     │  If task requires another domain:    │
     │  - CEO → CTO for technical plan      │
     │  - CEO → COO for execution           │
     │  - CFO → CEO for budget approval     │
     │  - CTO → CEO for plan approval       │
     │  Via ExecutiveDispatchRegistry       │
     └──────────┬──────────────────────────┘
                │
                ▼
[5]  ┌─────────────────────────────────────┐
     │  REVIEW                             │
     │  Delegated executive reviews brief:  │
     │  - Analyze action items              │
     │  - Check pending approvals           │
     │  - Assess sections                   │
     │  - Calculate confidence              │
     │  - Return ExecutiveDecision          │
     └──────────┬──────────────────────────┘
                │
                ▼
[6]  ┌─────────────────────────────────────┐
     │  EXECUTION                          │
     │  Executive runs its internal         │
     │  pipeline of stages:                 │
     │  - Identity → Directive → Auth       │
     │  → Scope → Semantic → Spec           │
     │  → Verify → Plan → Context           │
     │  → Knowledge → Prompt → LLM          │
     │  → Reflect → Evidence → Result       │
     │  (varies per executive)              │
     └──────────┬──────────────────────────┘
                │
                ▼
[7]  ┌─────────────────────────────────────┐
     │  VERIFICATION                       │
     │  - Execution spec verified           │
     │  - Governance constraints checked    │
     │  - Capability boundaries validated   │
     │  - Audit trail recorded              │
     └──────────┬──────────────────────────┘
                │
                ▼
[8]  ┌─────────────────────────────────────┐
     │  RESPONSE                           │
     │  Natural language response to user:  │
     │  - Analysis results                  │
     │  - Approval status                   │
     │  - Delegation status                 │
     │  - Action confirmation               │
     │  - Error explanation                 │
     └──────────┬──────────────────────────┘
                │
                ▼
[9]  ┌─────────────────────────────────────┐
     │  LEARNING                           │
     │  - KnowledgeProvider.ingestEpisode() │
     │  - Record eventType, outcome, tags   │
     │  - Store in Knowledge Platform       │
     │  - Enable future context             │
     └──────────┬──────────────────────────┘
                │
                ▼
[10] ┌─────────────────────────────────────┐
     │  AUDIT                              │
     │  - auditEngine.log(actor, action,    │
     │    resource, result, reason)          │
     │  - PipelineAudit.recordAudit()        │
     │  - Full traceability for compliance   │
     └──────────┬──────────────────────────┘
                │
                ▼
[11] ┌─────────────────────────────────────┐
     │  COMPLETION                         │
     │  - Return final result               │
     │  - Pipeline stages logged            │
     │  - Knowledge episode stored           │
     │  - Audit entry finalized              │
     │  - Ready for next request            │
     └─────────────────────────────────────┘
```

---

## Transition Details

### [1] User → [2] Dispatch
- User sends message via HTTP/CLI
- Route handler identifies executive via `ApplicationRuntimeAdapter`
- Adapter maps intent to executive role

### [2] Dispatch → [3] Decision
- Executive's `execute()` begins
- Stages run sequentially: Identity → Directive → Auth → Scope → Semantic → Spec → Verify
- Governance check occurs before proceeding

### [3] Decision → [4] Delegation
- If task crosses domain boundaries, `ExecutiveDispatchRegistry.dispatch()` is called
- The target executive's `decide()` evaluates the brief
- Decision returned to calling executive

### [4] Delegation → [5] Review
- Delegated executive's `decide()` analyzes the brief
- Returns `ExecutiveDecision` with action, reasoning, confidence
- Calling executive incorporates the decision

### [5] Review → [6] Execution
- Main executive continues its pipeline
- Stages include: Plan → Context → Knowledge → Prompt → LLM → Reflect → Evidence
- Each stage updates pipeline tracking

### [6] Execution → [7] Verification
- Post-execution verification checks:
  - Objective achieved?
  - Evidence collected?
  - Reflection complete?
- Failed verification produces error response

### [7] Verification → [8] Response
- LLM output formatted with executive signature
- Natural language response delivered to user
- Pipeline summary included

### [8] Response → [9] Learning
- `KnowledgeProvider.ingestEpisode()` records the event
- Episode includes: eventType, context, outcome, domain, tags
- Enables future context retrieval

### [9] Learning → [10] Audit
- `auditEngine.log()` creates permanent audit record
- Record includes: actor, action, resource, result, reason
- Pipeline stages logged for traceability

### [10] Audit → [11] Completion
- Final result returned to caller
- Executive ready for next request
- All state cleaned up

---

## States

| State | Description |
|-------|-------------|
| IDLE | Waiting for request |
| DISPATCHING | Adapter selecting executive |
| DECIDING | Executive analyzing intent |
| DELEGATING | Cross-executive dispatch |
| REVIEWING | Delegated executive analyzing brief |
| EXECUTING | Running internal pipeline |
| VERIFYING | Post-execution verification |
| RESPONDING | Formatting response |
| LEARNING | Recording knowledge episode |
| AUDITING | Logging audit entry |
| COMPLETED | Request finished |

---

## Error States

| Error | Handling |
|-------|----------|
| Authorization failed | Return error, log audit |
| Scope violation | Return error, log audit |
| Verification failed | Return error with reason |
| LLM error | Retry or return fallback |
| Governance denied | Log audit, notify user |
| Dispatch target not found | Return error to caller |
