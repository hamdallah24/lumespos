# EROS Governance Matrix

**Version:** 1.0.0  
**Last Updated:** 2026-07-13

---

## Governance Overview

Governance in EROS is enforced at two levels:

### Level 1: Runtime Governance (EIOS)
| Check | Implementation | When |
|-------|---------------|------|
| Authorization | `auth.can()` via AuthorizationRuntime | At execution start |
| Scope validation | `withinScope()` via MissionScope | At execution start |
| Registry integrity | RegistryLifecycle (FROZEN state) | During bootstrap |
| Pipeline validation | PipelineEngine (stage DAG) | During pipeline execution |
| Observability | MetricsEngine, TraceManager, PipelineAudit | Continuous |

### Level 2: Business Governance (Application)
| Check | Implementation | When |
|-------|---------------|------|
| Executive policy | `GovernanceProvider.canExecute(role, action, domain)` | Before any sensitive action |
| Audit logging | `auditEngine.log(actor, action, resource, result, reason)` | After every action |
| Knowledge recording | `KnowledgeProvider.ingestEpisode()` | After every execution |
| Executive dispatch | `ExecutiveDispatchRegistry.dispatch()` | For cross-executive calls |

---

## Executive Governance Rules

### CEO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| `delegate` | GovernanceProvider.canExecute("CEO", "delegate", domain) | Blocked, audit logged, delegating skipped |
| `execute` | Verification pass | Error returned if failed |
| `approve_plan` | LLM approval prompt | REJECTED return if not approved |
| `create_mission` | MissionRuntime availability | Graceful degradation to LLM-only response |

### CTO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| `analyzeCode` | auth.can(ctoIdentity.id, "analyzeCode") | Authorization denied, return error |
| `analyzeCode` scope | withinScope(ctoIdentity.id, "analyzeCode", "general") | Scope violation, return error |
| Implementation | CEO approval via `[CEO APPROVAL]` | Cannot write files without approval |
| Spec execution | verify(spec) | Return error if verification failed |

### CFO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| `analyze` | GovernanceProvider.canExecute("CFO", "analyze", domain) | Denied, audit logged |
| Spec execution | verify(spec) | Return error if failed |

### CMO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| `analyze` | GovernanceProvider.canExecute("CMO", "analyze", domain) | Denied, audit logged |
| Spec execution | verify(spec) | Return error if failed |

### CAIO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| `analyze` | GovernanceProvider.canExecute("CAIO", "analyze", domain) | Denied, audit logged |
| Spec execution | verify(spec) | Return error if failed |
| System access | RuntimeFacade availability | Graceful degradation |

### CKO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| Council access | councilSessionManager availability | Partial data returned |
| Advisory | consultantRuntime availability | Fallback to Direct LLM mode |
| Knowledge recording | KnowledgeProvider.ingestEpisode() | Soft fail, log warning |

### COO

| Action | Check | Violation Consequence |
|--------|-------|----------------------|
| Any execution action | GovernanceProvider.canExecute("COO", action, "operation") | Denied, Founder notified, audit logged |
| Approve/reject | GovernanceProvider.canExecute("COO", "approve", "situation") | Denied, audit logged |
| Intent classification | LLM parsing | Fall-through to full LLM context |

---

## Audit Requirements

### Mandatory Audit Events

| Event | Executive | Audit Action | Fields |
|-------|-----------|-------------|--------|
| execute | All | `auditEngine.log()` | actor, action, resource, result, reason, metadata |
| verify | CTO, CEO, CFO, CMO, CAIO | `auditEngine.log()` on failure | actor, action="verify", result="denied", reason |
| delegate (allowed) | CEO | `auditEngine.log()` | actor="CEO", action="delegate", result="allowed" |
| delegate (denied) | CEO | `auditEngine.log()` | actor="CEO", action="delegate", result="denied" |
| approve_plan (allowed) | CEO | `auditEngine.log()` | actor="CEO", action="approve_plan", result="allowed" |
| approve_plan (denied) | CEO | `auditEngine.log()` | actor="CEO", action="approve_plan", result="denied" |
| governance denial | All | `auditEngine.log()` | actor, action, result="denied", reason |
| action execution | COO | `auditEngine.log()` | actor="COO", action={actionName}, result |
| escalate | COO | `auditEngine.log()` | actor="COO", action="escalate" |

---

## Governance by Lifecycle Stage

| Lifecycle Stage | Governance Check | Enforced By |
|----------------|-----------------|-------------|
| Identity | None | — |
| Directive | None | — |
| Authorization | auth.can() | AuthorizationRuntime |
| Mission Scope | withinScope() | MissionScope |
| Semantic Engine | None | — |
| Execution Spec | None | — |
| Verification | verify() | VerificationEngine |
| Governance | GovernanceProvider.canExecute() | GovernanceProvider |
| CKO Consultation | Soft fail | ConsultantRuntime |
| Context | None | — |
| Prompt Assembly | None | — |
| LLM | None | — |
| Reflection | None | — |
| Evidence | None | — |
| Knowledge Evolution | Review | ProposalReview |
| Knowledge Episode | Always allowed | KnowledgeProvider |
| Audit | Always logged | AuditEngine |

---

## Governance Failure Impact Analysis

| Failure | Impact | Recovery |
|---------|--------|----------|
| Authorization denied | Execution stops | Return error, user notified |
| Scope violation | Execution stops | Return error, user notified |
| Verification failed | Execution stops | Return specific failure reason |
| Governance denied | Action blocked | Audit logged, user notified |
| CEO approval rejected | Implementation blocked | Return rejection reason |
| LLM error | Response incomplete | Retry or fallback |
| ConsultantRuntime unavailable | Advisory skipped | Soft fail, continue |
| CouncilSessionManager unavailable | Council data missing | Partial response |
| KnowledgeProvider unavailable | Knowledge context missing | Continue without context |
| RuntimeFacade unavailable | System health inaccessible | Report as critical |

---

## Governance Configuration

Governance checks use the following configuration sources:

| Source | How It's Set | Overridable By |
|--------|-------------|----------------|
| Foundation directives | Startup configuration | Founder (manual change) |
| Executive capabilities | Code definition (ceoRuntime.capabilities, ctoProgram.capabilities, etc.) | Dev team (code change) |
| GovernanceProvider rules | Runtime configuration | Governance Lead |
| Authorization rules | IdentityRuntime | Founder |
| Scope rules | MissionScope | CTO Lead |
