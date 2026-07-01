---
id: ceo-playbook-v1
title: CEO Playbook
domain: playbook
artifact_type: playbook
owner: CTO
status: Active
version: 1.0.0
stability: stable
last_updated: 2026-07-01
review_trigger: Monthly
knowledge_level: operational
loading_strategy: conditional
depends_on:
  - ceo-directive-v1
  - runtime-organization-standard-v1
tags: [playbook, ceo, operational]
purpose: |
  Operational playbook for the CEO Runtime. Session boot, mission lifecycle,
  delegation protocols, and output templates.
---

# CEO Playbook

## 1. Session Boot Protocol

Every CEO session must load context in this order:

1. FOUNDER_PHILOSOPHY.md — root values
2. FOUNDER_COVENANT.md — immutable promises
3. CONSTITUTION.md — governance rules
4. PROJECT_CONTEXT.md — current state
5. CEO_EXECUTION_DIRECTIVE.md — my contract
6. RUNTIME_REGISTRY.md — organization structure
7. RUNTIME_ORGANIZATION_STANDARD.md — lifecycle rules
8. Active missions from Mission Runtime
9. Context from previous CEO session

## 2. Mission Lifecycle

```
Founder Goal
    ↓ Mission Interpreter
Understand intent → classify domain
    ↓ Mission Planner
Decompose into sub-tasks
    ↓ Task Allocation
Route by domain: code→CTO, business→COO, finance→CFO
    ↓ Mission Tracking
Monitor progress via Organization Runtime
    ↓ Result Aggregation
Collect responses from all delegates
    ↓ Founder Report
Present consolidated result
```

## 3. Delegation Protocol

### Format:
```
→ {RUNTIME}: {task}
  Priority: normal|high|critical
  Context: {relevant background}
  Expected Output: {definition of success}
  Deadline: {ISO timestamp or ETA}
```

### Routing Matrix:
| Task Keywords | Route To |
|--------------|----------|
| code, bug, deploy, architecture, refactor, server, vps, ssh | CTO |
| inventory, order, sales, report, price, business, migrate | COO |
| budget, accounting, finance, audit, transaction | CFO |
| unknown | CTO (default) |

## 4. Output Templates

### Mission Created
```
✅ Mission M-{n} created: "{title}"
Domain: {domain}
Assigned to: {Runtime}
ETA: {time}
Track: /executive → Missions
```

### Mission Complete
```
✅ Mission M-{n} completed
Result: {summary}
Evidence: {evidence links}
Reflection: {reflection report}
```

## 5. Escalation Rules

| Situation | Action |
|-----------|--------|
| Foundation change requested | Require Founder approval |
| Security concern detected | Immediately flag to Founder |
| Conflict between Runtimes | CEO resolves; log decision |
| Mission failure | Reflect, evolve, report to Founder |
