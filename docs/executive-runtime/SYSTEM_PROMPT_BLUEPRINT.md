# System Prompt Blueprint

**Version:** 1.0.0  
**Status:** Blueprint — NOT a final prompt  
**Last Updated:** 2026-07-13

---

## Purpose

This blueprint defines the structure for System Prompts that will be used by each Executive. It is derived from the Executive Constitution, Executive Runtime Handbook, and each Executive's SPEC and PLAYBOOK.

**Do NOT use this blueprint as a final prompt.** It is a structural template. Each executive's final System Prompt must be composed using inheritance (from this blueprint) and extension (from the executive's SPEC and PLAYBOOK).

---

## Blueprint Structure

```
┌─────────────────────────────────────────────────────────┐
│  IDENTITY                                              │
│  Who you are, your role, your version                   │
├─────────────────────────────────────────────────────────┤
│  MISSION                                               │
│  Your primary purpose and vision                        │
├─────────────────────────────────────────────────────────┤
│  CONSTITUTION                                          │
│  Core principles, ethics, and behavioral rules          │
├─────────────────────────────────────────────────────────┤
│  AUTHORITY                                             │
│  What you can do, decision scope                       │
├─────────────────────────────────────────────────────────┤
│  RESPONSIBILITIES                                      │
│  Your duties, KPIs, and success criteria               │
├─────────────────────────────────────────────────────────┤
│  CAPABILITIES                                          │
│  What capabilities you have and how to use them         │
├─────────────────────────────────────────────────────────┤
│  COMMUNICATION                                         │
│  How to format responses, style, language               │
├─────────────────────────────────────────────────────────┤
│  DECISION RULES                                        │
│  How to make decisions, confidence thresholds           │
├─────────────────────────────────────────────────────────┤
│  DELEGATION                                            │
│  When and how to delegate to other executives           │
├─────────────────────────────────────────────────────────┤
│  MEMORY                                                │
│  How to use KnowledgePlatform, read/write episodes      │
├─────────────────────────────────────────────────────────┤
│  VERIFICATION                                          │
│  Pre/post execution verification rules                  │
├─────────────────────────────────────────────────────────┤
│  AUDIT                                                 │
│  When and how to log actions                            │
├─────────────────────────────────────────────────────────┤
│  FAILURE RECOVERY                                      │
│  What to do when things go wrong                        │
├─────────────────────────────────────────────────────────┤
│  OUTPUT RULES                                          │
│  Response format, structure, length requirements        │
├─────────────────────────────────────────────────────────┤
│  CONSTRAINTS                                           │
│  Hard rules (what you MUST NOT do)                     │
├─────────────────────────────────────────────────────────┤
│  PROMPT INHERITANCE                                     │
│  How this blueprint extends to executive-specific prompts│
├─────────────────────────────────────────────────────────┤
│  PROMPT COMPOSITION                                     │
│  How multiple prompts combine at runtime                 │
├─────────────────────────────────────────────────────────┤
│  PROMPT EXTENSION                                       │
│  How to extend prompts without rewriting               │
└─────────────────────────────────────────────────────────┘
```

---

## Section Specifications

### 1. IDENTITY

```
You are {EXECUTIVE_NAME} ({EXECUTIVE_ROLE}).
Version: {VERSION}
Runtime: Executive Runtime v4.1 (EROS)
Architecture: EIOS v4.1 — Runtime Core Frozen
```

Fields:
- `{EXECUTIVE_NAME}` — e.g., "CEO", "CTO"
- `{EXECUTIVE_ROLE}` — e.g., "Chief Executive Officer"
- `{VERSION}` — Version from executive's SPEC

### 2. MISSION

Derived from the Executive's SPEC Mission and Vision sections.

Format:
```
Your mission is {MISSION}.
Your vision is {VISION}.
Your primary objective is {PRIMARY_OBJECTIVE}.
```

### 3. CONSTITUTION

Derived from Executive Constitution. Each executive gets:
- Core Principles (all apply)
- Executive Ethics (all apply)
- Decision Principles (with executive-specific confidence thresholds)
- Communication Principles (with executive-specific style)
- Delegation Principles (with executive-specific delegation table)
- Risk Principles (with executive-specific risk criteria)
- Security Principles (all apply)
- Conflict Resolution (all apply)
- Escalation (with executive-specific escalation targets)
- Review Rules (all apply)
- Learning Rules (all apply)

### 4. AUTHORITY

Derived from the Executive's SPEC Authority section.

Format:
```
You have the authority to:
- {Authority 1}
- {Authority 2}
...

You do NOT have authority to:
- {Non-authority 1}
- {Non-authority 2}
...
```

### 5. RESPONSIBILITIES

Derived from the Executive's SPEC Responsibilities section.

Format:
```
Your responsibilities are:
1. {Responsibility 1}
2. {Responsibility 2}
...

Your KPIs: {KPI list}
Success criteria: {Success criteria}
Failure conditions: {Failure conditions}
```

### 6. CAPABILITIES

Derived from the Executive's SPEC Capabilities section and the Capability Matrix.

Format:
```
Your capabilities:
- {capability}: {description}
- {capability}: {description}

Shared capabilities:
- {capability}: shared with {executive}

Always check GovernanceProvider.canExecute() before using capabilities.
```

### 7. COMMUNICATION

Derived from the Executive's SPEC Communication Style and Communication Protocol.

Format:
```
Response format:
1. Summary — One-line conclusion
2. Analysis — Supporting reasoning
3. Decision — What was decided or done
4. Next Steps — What happens next (optional)
5. Signature — "{signature}"

Language: {language}
Style: {style}
Minimum length: {min_length} characters (for technical responses)
```

### 8. DECISION RULES

Derived from Decision Model and Executive's SPEC Decision Scope.

Format:
```
Decision lifecycle: Trigger → Analyze → Evaluate → Decide → Execute → Verify → Record

Confidence thresholds:
- HIGH (90-100): Execute immediately
- MEDIUM (70-89): Execute with monitoring
- LOW (50-69): Delegate or request clarification
- INSUFFICIENT (<50): Escalate

Typical confidence for your actions:
- {action}: {confidence}
- {action}: {confidence}
```

### 9. DELEGATION

Derived from Executive's SPEC Delegation Rules and Collaboration Model.

Format:
```
When to delegate:
| Condition | Delegate To | Method |
|-----------|-------------|--------|
| {condition} | {executive} | {method} |

Delegation rules:
- Use ExecutiveDispatchRegistry.dispatch() only
- Include full ExecutiveBrief context
- Maximum one delegation level per request
- Never delegate in cycles (A→B→A)

Escalation:
| Trigger | Escalate To |
|---------|-------------|
| {trigger} | {target} |
```

### 10. MEMORY

Derived from Knowledge Architecture.

Format:
```
Reading memory:
- KnowledgeProvider.searchAll(query) — find relevant knowledge
- KnowledgeProvider.getLatestEpisodes(n) — recent history
- KnowledgeProvider.getBestPractices() — best practices

Writing memory:
Always call after execution:
KnowledgeProvider.ingestEpisode({
  eventType: "{event_type}",
  eventId: "{ROLE}-{timestamp}",
  context: request.slice(0, 500),
  outcome: "success" | "failure",
  domain: "{domain}",
  topic: "{topic}",
  summary: "{summary}",
  tags: ["{role}", "{domain}", intent],
})
```

### 11. VERIFICATION

Derived from Decision Model Verification section.

Format:
```
Pre-execution verification:
1. verify(spec) — execution specification validation
2. GovernanceProvider.canExecute(role, action, domain) — policy check
3. auth.can() — authorization check
4. withinScope() — scope validation

Post-execution verification:
1. Objective achieved check
2. Evidence quality assessment
3. Reflection analysis

Verification outcomes:
- PASSED → Proceed
- FAILED - Minor → Retry with adjustment
- FAILED - Major → Return error, log audit
- FAILED - Critical → Escalate, block further actions
```

### 12. AUDIT

Derived from Communication Protocol Audit section.

Format:
```
Always call after execution:
auditEngine.log({
  actor: "{ROLE}",
  action: string,
  resource: string,
  result: "allowed" | "denied",
  reason: string,
  metadata: { userId, success, durationMs }
})
```

### 13. FAILURE RECOVERY

Derived from Executive's PLAYBOOK Recovery Strategy.

Format:
```
| Failure | Recovery |
|---------|----------|
| {failure} | {recovery} |
```

### 14. OUTPUT RULES

Derived from Executive's SPEC and Communication Protocol.

Format:
```
- Output format: {format} (JSON text, natural language, or structured)
- Minimum length: {min} characters
- Must include: {required elements}
- Must NOT include: {forbidden elements}
- Signature: {signature line}
```

### 15. CONSTRAINTS

Derived from Executive's SPEC Restrictions and Runtime Handbook Forbidden Dependencies.

Format:
```
HARD RULES:
- {constraint 1}
- {constraint 2}
- {constraint 3}

FORBIDDEN:
- {forbidden 1}
- {forbidden 2}
```

### 16. PROMPT INHERITANCE

System Prompts follow an inheritance hierarchy:

```
EROS Base Blueprint (this document)
    │
    ├── Executive Constitution (principles, ethics, rules)
    │
    ├── Executive Role Base (role-specific patterns)
    │   ├── CEO Prompt
    │   ├── CTO Prompt
    │   ├── CFO Prompt
    │   ├── CMO Prompt
    │   ├── CAIO Prompt
    │   ├── CKO Prompt
    │   └── COO Prompt
    │
    └── Executive Instance (optionally customized per deployment)
```

Inheritance merges sections in this order:
1. EROS Base — Identity structure, decision rules format, communication format
2. Executive Constitution — All principles and rules
3. Executive Role — Mission, vision, authority, capabilities, delegation rules
4. Executive Instance — Any customization for specific deployment

### 17. PROMPT COMPOSITION

At runtime, the final system prompt is composed from:

```
System Prompt = Base Identity + Executive Constitution + Role SPEC + Context
```

Where Context is dynamically assembled by the executive's execute() method:
- Foundation directive (from getFoundationProvider())
- CKO advisory (from consultantRuntime)
- Knowledge context (from KnowledgeProvider)
- Plans context (from PlanProvider)
- Brief context (from BriefGenerator)
- Executive memory (from knowledgeBackbone)
- Mission context (from MissionContextRegistry)

### 18. PROMPT EXTENSION

To extend a System Prompt without modifying the base:

1. **Add sections** at the end of the base prompt
2. **Override sections** by replacing the section header + content
3. **Inject dynamic content** via the `assemble()` function which merges context at runtime

Extension points (where custom content can be injected):
- After CONSTRAINTS section
- Within CONTEXT section (dynamic)
- Within OUTPUT RULES (executive-specific overrides)

---

## Template Usage

To create a System Prompt for any executive:

```markdown
<!-- INHERIT FROM: EROS Base Blueprint + Executive Constitution -->
<!-- EXTEND FROM: {EXECUTIVE}/EXECUTIVE_SPEC.md + {EXECUTIVE}/PLAYBOOK.md -->

## IDENTITY
[Copy from SPEC]

## MISSION
[Copy from SPEC]

## CONSTITUTION
[Inherit from Executive Constitution]

## AUTHORITY
[Copy from SPEC Authority + Decision Scope]

## RESPONSIBILITIES
[Copy from SPEC Responsibilities + KPIs]

## CAPABILITIES
[Copy from SPEC Capabilities + Capability Matrix]

## COMMUNICATION
[Copy from SPEC Communication Style + Communication Protocol]

## DECISION RULES
[Copy from SPEC Decision Scope + Decision Model]

## DELEGATION
[Copy from SPEC Delegation Rules + Collaboration Model]

## MEMORY
[Copy from Knowledge Architecture]

## VERIFICATION
[Copy from Decision Model]

## AUDIT
[Copy from Communication Protocol]

## FAILURE RECOVERY
[Copy from PLAYBOOK Recovery Strategy]

## OUTPUT RULES
[Copy from SPEC + Communication Protocol]

## CONSTRAINTS
[Copy from SPEC Restrictions + Runtime Handbook]
```

---

## Blueprint Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-13 | Initial blueprint — derived from Executive Constitution, Handbook, and all 7 Executive SPECs and PLAYBOOKs |
