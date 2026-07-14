# Executive Communication Protocol

**Version:** 1.0.0  
**Status:** Architecture v4.1  
**Last Updated:** 2026-07-13

---

## 1. Executive Message Format

All executive-to-executive messages use `ExecutiveBrief` and `ExecutiveDecision` types from `PipelineContracts`.

### ExecutiveBrief
```typescript
{
  id: string;              // BRIEF-{timestamp}-{counter}
  role: string;            // CEO, CTO, CFO, CMO, CAIO, CKO, COO
  title: string;           // "Executive Brief — {role}"
  date: string;            // ISO 8601
  summary: string;         // One-line situational summary
  sections: BriefSection[];// Prioritized sections
  actionItems: string[];   // Actionable items
  pendingApprovals: string[]; // Items needing approval
}
```

### ExecutiveDecision
```typescript
{
  role: string;            // Decision maker
  action: string;          // Action type
  reasoning: string;       // Why this decision
  confidence: number;      // 0-100
  delegateTo?: string;     // Optional delegation target
  payload?: Record<string, unknown>; // Additional data
}
```

---

## 2. Delegation Format

### Request (via `ExecutiveDispatchRegistry.dispatch()`)
```typescript
dispatch(role, {
  id: "BRIEF-abc-1",
  role: "CEO",
  title: "Executive Brief — CEO",
  date: "2026-07-13T00:00:00.000Z",
  summary: "2 critical, 3 high severity situations — 5 action items pending",
  sections: [...],
  actionItems: ["Review CTO implementation plan"],
  pendingApprovals: ["CTO implementation plan approval"],
}, { userId: 1 })
```

### Response
```typescript
{
  role: "CEO",
  action: "review_approvals",
  reasoning: "1 pending approvals requiring CEO review from brief",
  confidence: 90,
  delegateTo: undefined,
  payload: { pendingApprovals: [...] }
}
```

---

## 3. Review Format

When an executive reviews a brief or delegation, the response follows this pattern:

```typescript
{
  role: string,         // Reviewing executive
  action: string,       // Type of review
  reasoning: string,    // Analysis and conclusion
  confidence: number,   // Confidence in review
  payload?: {           // Optional review details
    findings: string[],
    recommendations: string[],
    risks: string[],
  }
}
```

---

## 4. Approval Format

### CEO Approval Request (from CTO)
```
Message starts with "[CEO APPROVAL]"
Followed by full implementation plan text
```

### CEO Approval Response
```
"APPROVED" — if plan is sound
"REJECTED: [reason]" — if plan has issues
```

### Approval Decision Record
```typescript
{
  role: "CEO",
  action: "review_approvals",
  reasoning: "Implementation plan review",
  confidence: 90,
  payload: { pendingApprovals: ["CTO implementation plan"] }
}
```

---

## 5. Escalation Format

### Escalation Trigger
```typescript
CommunicationProvider.dispatch({
  channel: "notification",
  recipient: "founder",        // or "ceo"
  content: string,             // escalation reason
})
```

### Escalation Decision
```typescript
{
  role: "COO",
  action: "monitor",
  reasoning: "Escalating situation {id} to CEO — requires higher authority",
  confidence: 85,
  delegateTo: "CEO",           // Escalation target
  payload: {
    escalation: true,
    situationId: string,
    reason: string,
  }
}
```

### Escalation Levels
| Level | Target | Format |
|-------|--------|--------|
| Level 1 | Another executive | `dispatch(role, brief)` |
| Level 2 | CEO | `dispatch("CEO", brief)` |
| Level 3 | Founder | `CommunicationProvider.dispatch()` |
| Level 4 | CAIO (system) | `RuntimeFacade.health()` |

---

## 6. Failure Report

```typescript
{
  success: false,
  text: "❌ Error description here",
  pipeline: ["Identity", "Directive", "SemanticEngine", ...],
  // Executive-specific fields:
  // CTO: reflection, toolsUsed, filesRead
  // CEO: decision
}
```

### Failure Categories
| Category | Example | Action |
|----------|---------|--------|
| Authorization | "CTO not authorized" | Log audit, notify user |
| Scope | "Scope violation: ..." | Log audit, notify user |
| Verification | "Confidence too low" | Log audit, retry or escalate |
| Governance | "Governance denied: ..." | Log audit, notify Governance |
| LLM | "LLM error: ..." | Retry, log, or fallback |
| System | "Mission runtime unavailable" | Graceful degradation |

---

## 7. Success Report

```typescript
{
  success: true,
  text: "✅ Natural language success response\n\n> — ExecutiveRole · Direct/Delegated",
  pipeline: ["Identity", "Directive", "SemanticEngine", ..., "ExecutiveReport"],
  decision: {
    goal: string,
    delegation: null | { runtime: string, reason: string },
    priority: "normal" | "high" | "critical",
    risk: "low" | "medium" | "high",
    reasoning: string,
    expectedOutcome: string,
  }
}
```

### Pipeline Log
```
[PIPELINE:{role}] execute end — pipeline=[Stage1→Stage2→...→StageN] success=true
```

---

## 8. Incident Report

An incident is any unexpected failure requiring immediate attention.

### Format
```typescript
auditEngine.log({
  actor: string,          // Executive role
  action: "incident",     // Incident marker
  resource: string,       // Affected component
  result: "denied" | "failed",
  reason: string,         // Detailed incident description
  metadata: {
    incidentId: string,
    severity: "low" | "medium" | "high" | "critical",
    affectedExecutive: string,
    errorCode: string,
    stackTrace?: string,
    userId?: number,
  }
})
```

### Incident Channels
1. **Audit log** — Permanent record
2. **Knowledge episode** — Learning record
3. **Communication** — If critical, notify Founder

---

## 9. Learning Report

Every execution produces a learning report via knowledge episodes.

### Format
```typescript
KnowledgeProvider.ingestEpisode({
  eventType: string,     // "{role}_execution" | "{role}_decision" | "{action}"
  eventId: string,       // "{ROLE}-{timestamp}"
  context: string,       // Original request (truncated to 500 chars)
  outcome: "success" | "failure" | "neutral",
  domain: string,        // Business domain
  topic: string,         // Subject
  summary: string,       // What happened (truncated)
  tags: string[],        // [role, domain, intent]
})
```

### Episode Types by Executive

| Executive | eventType | Tags |
|-----------|-----------|------|
| CEO | `ceo_decision` | `["ceo", "decision", intent]` |
| CTO | `cto_execution` | `["cto", "technical", intent]` |
| CFO | `cfo_execution` | `["cfo", "financial", intent]` |
| CMO | `cmo_execution` | `["cmo", "marketing", intent]` |
| CAIO | `caio_execution` | `["caio", "ai", "system", intent]` |
| CKO | `cko_advisory` | `["cko", "advisory"]` |
| CKO | `cko_direct_llm` | `["cko", "direct"]` |
| COO | `approval` | Varies by action |
| COO | `{action}` | `["coo", "operations", {action}]` |

---

## Summary Table

| Message Type | Direction | Format | Channel |
|-------------|-----------|--------|---------|
| Delegation Request | Executive → Executive | `ExecutiveBrief` | `dispatch()` |
| Delegation Response | Executive → Executive | `ExecutiveDecision` | Return value |
| Approval Request | CTO → CEO | `"[CEO APPROVAL]"` prefix | `execute()` message |
| Approval Response | CEO → CTO | `"APPROVED"` / `"REJECTED"` | LLM response |
| Escalation | Any → CEO/Founder | `ExecutiveDecision.delegateTo` + notification | `dispatch()` + `CommunicationProvider` |
| Failure | Executive → User | `{ success: false, text }` | Return value |
| Success | Executive → User | `{ success: true, text }` | Return value |
| Incident | Executive → System | Audit log entry | `auditEngine.log()` |
| Learning | Executive → Knowledge | Knowledge episode | `KnowledgeProvider.ingestEpisode()` |
