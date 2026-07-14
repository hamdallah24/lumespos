# COO Runtime Foundation — EIOS v4.0 Integration

## Chief Operating Officer — Digital Operations Executive

---

## Executive Identity

| Attribute | Value |
|-----------|-------|
| Role | COO — Chief Operating Officer |
| Domain | Operations, Inventory, Production, Shift, Workforce |
| Authority Level | Limited (cannot change prices, cannot modify code) |
| Reporting To | CEO / Founder |
| Delegates To | Branch Managers, Staff, CKO (for knowledge) |
| Communication | WhatsApp, Dashboard, Notification |

---

## EIOS Integration — What COO Consumes

COO is Layer 6 — Executive Runtime. COO does NOT access Layer 0–5 directly. Everything arrives through the **Executive Brief Generator**.

### Input Contract (from Brief Generator)

| Content | Source Layer | Description |
|---------|-------------|-------------|
| Morning Brief | L6 BriefGen | Daily operations summary |
| Critical Alert | L2 Decision Engine | Situation requiring immediate action |
| Approval Request | L2 Decision Engine | Decision needs COO approval |
| Execution Status | L4 Planner | Active plan progress |
| Knowledge Suggestion | L5 Knowledge | Pattern detected, best practice |
| Staff Report | Ext. (manual) | Human staff input |

### Output Contract (from COO)

| Content | Destination Layer | Description |
|---------|------------------|-------------|
| Decision Approval/Rejection | L7 Council / L2 DE | Approve or reject situations |
| Strategy Direction | L3 Strategy | Endorse or modify strategy |
| Delegated Task | L4 Planner | Assign tasks to staff/system |
| Communication | L8 Communication | Messages to Founder, staff |
| Lesson Learned | L5 Knowledge | Record what went well/wrong |

---

## COO Executive Configuration

```typescript
const COO_EIOS_CONFIG: ExecutiveConfig = {
  role: "COO",
  name: "Chief Operating Officer",
  version: "3.0.0",

  // ── Intelligence Scope ──
  requiredFacts: [
    "stock_coverage", "stock_level", "waste_rate", "usage_rate",
    "yield_efficiency", "batch_cost",
    "cash_accuracy", "stock_accuracy",
    "revenue", "aov", "hourly_velocity",
    "expense_ratio", "gross_margin",
    "branch_performance", "employee_throughput"
  ],
  optionalFacts: ["cost_trend", "forecast", "customer_satisfaction"],
  forbiddenDomains: [], // COO has broad operational visibility

  // ── Decision Authority ──
  maxApprovalLevel: "coo",
  canApproveTypes: [
    "stock_critical", "stock_low", "yield_anomaly",
    "shift_compliance", "production_issue",
    "employee_risk", "expense_spike"
  ],
  autoApproveTypes: ["stock_low"],
  // Low stock (coverage 1-3 days) → auto approve reorder
  // Only if confidence > 80% and no recent failure
  delegationTargets: ["Branch Manager", "Staff", "CKO"],
  autoExecutionThreshold: 0.8,

  // ── Communication ──
  communicationChannels: ["whatsapp", "dashboard", "notification"],
  language: "id",
  tone: "professional",
  briefSchedule: "06:00, 12:00, 18:00",

  // ── Knowledge ──
  knowledgeScope: [
    "recurring_situation", "successful_decision", "failed_decision",
    "employee_pattern", "branch_pattern", "best_practice",
    "supplier_pattern"
  ],
  canCreateKnowledge: true,

  // ── Governance ──
  forbiddenActions: [
    "engineering_decisions", "code_modification",
    "deployment", "foundation_modification",
    "update_price", "update_role_to_owner",
    "modify_recipe_approval"
  ],
  requiredBehaviors: [
    "consume_bi_facts_only",
    "review_situations_before_acting",
    "never_query_database",
    "delegate_technical_to_caio",
    "document_lessons_learned"
  ],

  // ── KPI Targets ──
  kpiTargets: {
    stockout_rate: { target: 0, unit: "percent", priority: "critical" },
    stock_coverage_min: { target: 3, unit: "days", priority: "high" },
    waste_rate_max: { target: 5, unit: "percent", priority: "high" },
    yield_efficiency_min: { target: 90, unit: "percent", priority: "medium" },
    shift_compliance_min: { target: 95, unit: "percent", priority: "medium" },
    cash_accuracy_min: { target: 99, unit: "percent", priority: "high" }
  }
};
```

---

## COO Brief Template

### Morning Brief (06:00)

```
══════════════════════════════════════════
COO BRIEF — {date} {time}
══════════════════════════════════════════

HEADLINE: {situationsCritical} situasi kritis,
          {approvalsNeeded} memerlukan keputusan

═══ KRITIS ═══
{situations.critical.map(s => `
{severity} {s.title}
  Summary: {s.summary}
  Impact: {s.impact}
  Recommendation: {s.recommendedStrategy}
  ⏰ Deadline: {s.deadline}
  [SETUJUI] [TOLAK] [LIHAT DETAIL]
`)}

═══ PRIORITAS TINGGI ═══
{situations.high.map(s => `
◉ {s.title}
  {s.summary}
  ⏰ {s.deadline}
`)}

═══ PROGRES EKSEKUSI ═══
{plans.active.map(p => `
📊 {p.title}
  [{progressBar}] {p.completedNodes}/{p.totalNodes} tasks
  {p.blockingIssues ? "⚠️ " + p.blockingIssues : "✅ On track"}
  Estimated: {p.estimatedCompletion}
`)}

═══ PENGETAHUAN BARU ═══
{knowledge.new.map(k => `
📖 {k.topic}
  {k.summary}
  Confidence: {k.confidence}%
  {k.type === 'procedural' ? 'Action: ' + k.action : ''}
`)}

═══ RINGKASAN ═══
Total Situations: {totalSituations}
Pending Approvals: {pendingApprovals}
Active Plans: {activePlans}
KPI Today: Revenue {revenue} | Margin {margin}% | Stock Health {stockHealth}%
```

### Critical Alert Template

```
╔════════════════════════════════════╗
║  ⚠️ CRITICAL ALERT                  ║
╚════════════════════════════════════╝

Situation: {title}
Domain: {domain}
Severity: {severity}

{situation.detail}

Impact:
  Financial: Rp {impact.estimatedFinancial}
  Operational: {impact.description}

Options:
{options.map((o, i) => `
{i+1}. {o.label}
   Risk: {o.risk}
   Cost: Rp {o.estimatedCost || '0'}
   Confidence: {o.confidence}%
   Recommended: {o.recommended ? '✅' : '—'}
`)}

⏰ Deadline: {deadline}
Decision needed by: {role}
```

### Approval Request Template

```
══════════════════════════════════════════
APPROVAL REQUEST — {situation.title}
══════════════════════════════════════════

{situation.summary}

┌─────────────────────────────────────┐
│  OPTION A: {optionA.label}          │
│  {optionA.description}              │
│  Estimated Impact: {optionA.impact} │
│  Risk: {optionA.risk}               │
│  ✅ RECOMMENDED                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  OPTION B: {optionB.label}          │
│  {optionB.description}              │
│  Estimated Impact: {optionB.impact} │
│  Risk: {optionB.risk}               │
└─────────────────────────────────────┘

[APPROVE A] [APPROVE B] [REJECT] [MODIFY]
```

### Progress Report Template

```
══════════════════════════════════════════
PROGRESS REPORT — {plan.title}
══════════════════════════════════════════

Objective: {plan.objective}
Progress: {plan.progress}%
Deadline: {plan.deadline.critical}

[{progressBar}]

Tasks:
{plan.nodes.map(n => `
{statusIcon} {n.label}
   Status: {n.status}
   Assignee: {n.assignee}
   {n.delay ? '⚠️ DELAY: ' + n.delay : ''}
`)}

Blocking Issues:
{blockingIssues.length > 0 ? blockingIssues : '(none)'}

Next Actions:
{nextActions}
```

---

## COO Decision Rules

### Auto-Approve Rules (Confidence > 80%)

| Rule | Condition | Action | Reasoning |
|------|-----------|--------|-----------|
| Auto Restock Low | stock_coverage between 1-3 days + no recent failure | Create reorder plan | Operational efficiency |
| Auto Transfer Known | stock_critical + same situation resolved successfully > 3x | Create transfer plan | Pattern confirmed |
| Auto Notify Staff | shift discrepancy < 2% | Send notification to cashier | Minor issue, no escalation |

### Needs COO Approval

| Rule | Condition | Action |
|------|-----------|--------|
| Approve Transfer | stock_critical + no prior success pattern | Review and approve/reject |
| Approve Investigation | cash_discrepancy > 5% | Approve investigate plan |
| Approve Production Change | yield_efficiency < 85% | Approve recipe calibration |
| Approve Shift Change | employee_compliance < 70% | Approve rescheduling |

### Needs Council/Founder

| Rule | Condition | Action |
|------|-----------|--------|
| Emergency Purchase > Rp 1M | stock_critical + no transfer option | Council decision |
| Stock Transfer > 10kg | transfer request exceeds threshold | Founder/CFO approval |
| Recipe Change > 3 ingredients | yield correction requires BOM change | CEO approval |

---

## COO Action Schema (on EIOS)

After EIOS, COO's action set is simplified. COO no longer has "get_inventory_status" or "get_sales_summary" — those are BI Layer responsibilities.

### Remaining Actions (Pure Operational Execution)

| Action | Description | Params |
|--------|-------------|--------|
| `approve_situation` | Approve a situation decision | `situationId, optionId, rationale` |
| `reject_situation` | Reject a situation | `situationId, rationale` |
| `delegate_task` | Delegate a task to staff | `taskId, assignee, instructions` |
| `escalate_to_council` | Escalate situation to Executive Council | `situationId, reason` |
| `escalate_to_founder` | Escalate directly to Founder | `situationId, reason` |
| `create_knowledge` | Record a lesson learned | `type, topic, summary, entities` |
| `send_message` | Send manual communication | `channel, recipient, message` |
| `modify_plan` | Adjust plan parameters | `planId, changes` |
| `pause_plan` | Pause execution | `planId, reason` |
| `resume_plan` | Resume paused plan | `planId` |
| `cancel_plan` | Cancel and rollback | `planId, reason` |

### Removed Actions (Now BI Layer Responsibility)

These were in original `ai-business.ts` but are REMOVED from COO after EIOS:

| Removed Action | Replaced By |
|---------------|-------------|
| `get_inventory_status` | BI Fact: stock_level, coverage, waste_rate |
| `get_sales_summary` | BI Fact: revenue, aov, growth |
| `get_products` | BI Fact: product_performance |
| `get_shift_audit` | BI Fact: cash_accuracy, stock_accuracy |
| `get_expenses` | BI Fact: expense_ratio, expense_trend |
| `get_top_products` | BI Fact: top_products (already part of brief) |

### Kept Actions (Operational Execution, Post-Decision)

| Kept Action | Purpose |
|-------------|---------|
| `add_stock` | Execute reorder (after approval) |
| `reduce_stock` | Manual stock reduction |
| `transfer_stock` | Execute transfer between branches |
| `produce` | Execute production batch |
| `add_expense` | Record operational expense |
| `add_recipe` | Add recipe (instruction from Planner) |
| `update_recipe` | Update recipe (post-approval) |
| `add_ingredient` | Add new ingredient |
| `add_semi_finished` | Add new semi-finished item |
| `add_product` | Add new product |
| `add_variant` | Add product variant |

---

## COO Runtime — After EIOS

### What COO Does Every Day

```
06:00 — Receive Morning Brief
     ├── Review critical situations
     ├── Approve/reject pending decisions
     ├── Review execution progress
     └── Acknowledge new knowledge

06:30 — Morning decisions sent to Planner + Communication

12:00 — Midday Brief
     ├── Review new situations from morning
     ├── Check progress on active plans
     └── Quick approval if needed

18:00 — Evening Brief
     ├── Review today's outcomes
     ├── Record lessons learned
     └── Prepare handover notes

As Needed — Critical Alerts
     ├── Review immediately
     ├── Decide within deadline
     └── Communicate to affected parties
```

### What COO NEVER Does After EIOS

```
❌ COO never reads current_inventory table
❌ COO never calculates moving average
❌ COO never queries "SELECT * FROM orders WHERE..."
❌ COO never analyzes raw stock adjustment data
❌ COO never formats SQL results into messages
❌ COO never decides without Business Facts
```

### COO Pseudocode (Post-EIOS)

```typescript
async function handleBrief(brief: ExecutiveBrief): Promise<void> {
  // 1. Process critical situations
  for (const item of brief.sections.critical.items) {
    if (item.requiredAction === "approve") {
      const decision = await decide(item);  // AI-assisted
      if (decision.approve) {
        await governance.checkPolicy("COO", decision);
        await council.submitPosition("COO", "approve", decision.rationale);
      }
    }
  }

  // 2. Process approvals
  for (const approval of brief.pendingApprovals) {
    const decision = await evaluateOptions(approval.options);
    await council.submitVote("COO", decision);
  }

  // 3. Monitor executions
  for (const status of brief.executionStatus) {
    if (status.blockingIssues.length > 0) {
      await escalate("COO", status);
    }
  }

  // 4. Learn
  for (const knowledge of brief.relevantKnowledge) {
    if (knowledge.confidence > 80) {
      await adoptBestPractice(knowledge);
    }
  }

  // 5. Communicate
  await communication.sendBriefSummary("founder", brief);
}
```

---

## Migration Path — Current COO → EIOS COO

### Phase 1: Parallel Run (Week 1-2)

```
Current COO continues running as-is.
EIOS COO runs in shadow mode — receives briefs, makes decisions,
but decisions are NOT executed. Compare outputs.
```

### Phase 2: Data Query Migration (Week 3-4)

```
Move all "get_*" actions from COO to BI Layer.
COO can no longer call get_inventory_status.
COO starts receiving BusinessFacts from BI.
```

### Phase 3: Decision Migration (Week 5-6)

```
Transfer decision rules from COO code to Decision Engine (Layer 2).
COO starts receiving pre-analyzed Situations instead of raw data.
```

### Phase 4: Full Cutover (Week 7)

```
Old COO runtime disabled.
EIOS COO Runtime becomes primary.
All executives use same BI → Decision → Strategy → Planner pipeline.
```

---

## Success Metrics — COO on EIOS

| Metric | Before EIOS | Target After EIOS |
|--------|-------------|-------------------|
| Time to detect stock critical | 2-4 hours (manual) | < 1 minute (event-driven) |
| Time to decide on stockout | 30 minutes (manual analysis) | < 5 minutes (brief + approval) |
| Data queries per day | 50+ (manual SQL) | 0 (facts delivered) |
| Decisions without all context | Often (missing cross-branch view) | Never (full context in brief) |
| Lessons learned documented | Rare (no process) | Every situation resolved |
| Staff notifications for issues | Ad-hoc | Automatic + confirmed delivery |
| Founder update frequency | When asked | Scheduled briefs + alerts |
| Operational knowledge retention | None (in COO code comments) | Structured in Knowledge Platform |

---

## Dependency Graph

```
COO Runtime (EIOS)
  ├── L0 Event Bus (for receiving execution confirmations)
  ├── L6 Brief Generator (primary input)
  ├── L7 Executive Council (for multi-executive decisions)
  ├── L8 Communication Runtime (for all outward messages)
  ├── Governance Layer (for policy enforcement)
  ├── North Star Layer (for objective alignment)
  └── L5 Knowledge Platform (for reading/writing lessons)
```

---

## Conclusion

Before EIOS, COO was an AI agent querying databases. After EIOS, COO is a **digital Chief Operating Officer** who:

- Receives **curated briefs** (not raw data)
- Makes **informed decisions** (with facts + options pre-analyzed)
- Delegates **execution to the Planner**
- Communicates **through the Communication Runtime**
- Learns **from every situation** (Knowledge Platform)
- Aligns **with business objectives** (North Star)
- Operates **within governance boundaries** (Policy Engine)

The COO Runtime is no longer the most complex component. It is now the **simplest** — because the complexity lives in the EIOS layers below it, where it belongs.
