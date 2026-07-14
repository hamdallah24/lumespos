<!--
  EPIC R — Phase 2: Knowledge Ownership Matrix
  Sources: EXECUTIVE_CAPABILITY_MATRIX.md, EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md,
           EXECUTIVE_COLLABORATION_MODEL.md, SRC audit, all SPECs and PLAYBOOKs
  DO NOT EDIT MANUALLY.
-->

# Knowledge Ownership Matrix

**Version:** 1.0.0  
**Status:** STABLE  

---

## Ownership Levels

| Level | Symbol | Meaning |
|-------|--------|---------|
| PRIMARY | P | Ultimate authority — defines, validates, curates this domain |
| SECONDARY | S | Contributes — creates knowledge, provides input |
| CONSUME | C | Reads and uses this knowledge for decisions |
| SYSTEM | X | Owned by infrastructure (EIOS Runtime, Foundation) — not by any individual executive |

---

## CEO — Strategic Leadership

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Business Strategy | P | Vision, mission, strategic direction, organizational goals | EXECUTIVE_SPEC: strategic-planning, strategic-decision |
| Organization Structure | P | Executive roles, delegation hierarchy, org design | EXECUTIVE_SPEC: organization-management |
| Delegation Policy | P | Who can do what, delegation rules | PLAYBOOK: delegate via org engine |
| Mission Planning | P | Mission creation, priority setting, tracking | SPEC: mission-planning, mission tracking |
| Proposal Review | P | CTO approval, cross-domain proposal approval | SPEC: proposal-review, CTO approval flow |
| Market Direction | P | High-level market positioning, brand strategy | COLLABORATION: CEO-CMO pair |
| Capital Allocation | P | Budget direction, investment priorities | COLLABORATION: CEO-CFO pair |
| Founder Intent | P | Translation of Founder vision to executable missions | VISION: "translate Founder vision" |
| Negotiation | C | Does not negotiate directly — delegates to CTO/COO | CONSTITUTION: domain sovereignty |
| Culture | P | Organizational culture, values, ethics | RESPONSIBILITIES: org management |
| Hiring Strategy | P | High-level hiring direction, org growth | RESPONSIBILITIES: org management |
| Conflict Resolution | P | Cross-domain conflict final decision | CONSTITUTION: escalation Level 2 |
| Audit Review | P | Review governance audit reports | KNOWLEDGE_ARCHITECTURE: Strategic type |

---

## CTO — Technology & Engineering

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Architecture | P | System architecture, codebase structure, design patterns | SPEC: architecture-review |
| Engineering Standards | P | Code quality, best practices, testing standards | SPEC: code-analysis |
| Infrastructure | P | DevOps, deployment, CI/CD, server config | SPEC: devops |
| Security | P | Code security, access control, vulnerability detection | SPEC: security restrictions |
| Platform | P | Runtime platform, framework choices, dependencies | SPEC: architecture-review |
| Performance | P | Code performance, optimization, scaling | SPEC: code-analysis |
| Scalability | P | System scalability, load handling, capacity | SPEC: architecture-review |
| AI Engineering | S | LLM integration, prompt patterns, tool implementation | SPEC: code-analysis + knowledge-evolution |
| Technical Debt | P | Code quality issues, refactoring priorities | SPEC: implementation |
| Knowledge Evolution | P | Proposing knowledge updates from technical learnings | SPEC: knowledge-evolution |
| Tool Registry | P | Tool selection, tool implementation, tool governance | CAPABILITY_MATRIX: code-analysis |
| Project Structure | S | Codebase organization (shared with CKO advisory) | PLAYBOOK: CKO consultation |

---

## CFO — Financial Intelligence

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Cost Analysis | P | Ingredient costs, production costs, operational costs | SPEC: cost optimization |
| Margin Analysis | P | Profit margins per product, per branch, per channel | SPEC: margin-analysis |
| Budget Review | P | Budget allocation, spending review, budget alerts | SPEC: budget-review |
| Financial Analysis | P | Revenue analysis, expense tracking, financial health | SPEC: financial-analysis |
| Pricing Intelligence | P | BEP calculation, pricing recommendations, margin targets | SPEC (expanded): BEP calculation |
| Cash Flow | P | Cash flow monitoring, liquidity analysis | SPEC (expanded): cash-flow-analysis |
| Trend Analysis (Financial) | P | Financial trends, cost trends, margin trends | SPEC (expanded): trend-analysis |
| Investment | S | Investment recommendations (decided by CEO) | COLLABORATION: CEO-CFO pair |
| Unit Economics | P | Per-unit cost, per-unit margin, per-branch economics | Derived from cost + margin analysis |
| Financial Risk | P | Financial anomaly detection, risk flagging | SPEC: financial risk flagging |

---

## COO — Operations & Execution

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Inventory Management | P | Stock levels, stock movements, corrections | SPEC + 18 actions: add_stock, reduce_stock, etc. |
| Product Management | P | Products, variants, recipes, pricing | SPEC: product-management |
| Branch Operations | P | Branch data, branch status, branch migration | SPEC: branch-operations |
| Sales Tracking | P | Sales data, daily sales, sales trends | SPEC: sales-tracking |
| Production | P | Production orders, ingredient usage, semi-finished goods | 18 actions: produce, add_ingredient |
| Expense Tracking | P | Operational expenses, expense logging | 18 actions: add_expense |
| SOPs | P | Standard Operating Procedures, operational best practices | PLAYBOOK: best practices |
| Process Optimization | P | Workflow efficiency, bottleneck removal | SPEC: operational execution |
| Resource Management | P | Staff roles, shift management, resource allocation | 18 actions: change_role |
| Operational Risk | P | Operational anomalies, stock inconsistencies, approval flags | SPEC: approval handling |
| Daily Brief | P | Operational status, daily summary, pending approvals | PLAYBOOK: status handler |
| Approval Policy | P | Approval rules, escalation criteria for operations | SPEC: approval/rejection/escalation |

---

## CMO — Marketing & Customer

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Market Analysis | P | Market trends, competitor analysis, market positioning | SPEC: market-analysis |
| Campaign Strategy | P | Campaign design, promotional strategy, campaign planning | SPEC: campaign-strategy |
| Customer Insight | P | Customer behavior, engagement patterns, preferences | SPEC: customer-insight |
| Product Trend | P | Product popularity, seasonal trends, product lifecycle | SPEC: product-trend |
| Brand Strategy | P | Brand messaging, brand positioning, brand voice | SPEC (expanded): brand-messaging |
| Customer Engagement | P | Engagement strategies, loyalty programs, retention | SPEC (expanded): customer-engagement |
| Promotional Strategy | P | Discount planning, bundle offers, promotional calendar | SPEC (expanded): promotional-strategy |
| Market Research | S | External market data (shared with CKO curation) | COLLABORATION: CMO-CKO |
| Sales Trend (Marketing) | P | Sales pattern analysis from marketing perspective | PLAYBOOK: data-backed analysis |

---

## CAIO — AI Systems & Knowledge

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| System Health | P | AI executive health, pipeline status, runtime health | SPEC: ai-health-monitoring |
| System Architecture (AI) | P | AI system architecture, executive pipeline design | SPEC: system-architecture |
| Knowledge Management | P | Knowledge platform health, knowledge stats monitoring | SPEC: knowledge-management |
| Automation Oversight | P | Automation reliability, failure patterns, auto-recovery | SPEC: automation-oversight |
| Performance Analysis | P | Executive performance trends, bottleneck detection | SPEC (expanded): performance-analysis |
| Anomaly Detection | P | System anomalies, unusual patterns, drift detection | SPEC (expanded): anomaly-detection |
| Health Advisory | P | Health recommendations, improvement suggestions | SPEC (expanded): health-advisory |
| Runtime Metrics | C | Runtime health data (consumed from RuntimeFacade) | PLAYBOOK: RuntimeFacade.health() |
| Knowledge Platform Stats | C | Knowledge provider statistics (consumed for health) | PLAYBOOK: KnowledgeProvider.getStats() |
| Executive Memory | C | Memory health (consumed from learning/executive-memory) | COLLABORATION: CAIO-CKO |

---

## CKO — Knowledge & Learning

| Knowledge Domain | Ownership | Description | Source Evidence |
|-----------------|-----------|-------------|----------------|
| Knowledge Curation | P | Knowledge organization, categorization, quality control | SPEC: knowledge-curation |
| Best Practices | P | Best practice identification, promotion, dissemination | SPEC: best-practices |
| Advisory | S | Cross-executive advisory (provides to all, content from all) | SPEC: advisory |
| Council Secretary | P | Council session management, minutes, action items | SPEC: council-secretary |
| Learning Recommendation | P | Learning priorities, knowledge gap identification | SPEC: learning-recommendation |
| Knowledge Evolution | S | Knowledge update proposals (shared with CTO) | SPEC (expanded): knowledge-evolution |
| Context Provision | P | Cross-executive context, knowledge retrieval, query answering | SPEC (expanded): context-provision |
| Translation | P | Business-to-technical translation for CTO advisory | SPEC (expanded): translation |
| Project Advisory | P | Project structure advisory, codebase knowledge | SPEC (expanded): project-advisory |
| Gap Analysis | P | Knowledge gap identification and reporting | SPEC (expanded): gap-analysis |
| Council Knowledge | P | Council decisions, council history, council trends | PLAYBOOK: council mode |
| Episode Knowledge | P | Knowledge episode ingestion, query, maintenance | KNOWLEDGE_ARCHITECTURE: all types |

---

## System-Owned Knowledge (No Single Executive)

| Knowledge Domain | Owner | Description | Implementation |
|-----------------|-------|-------------|----------------|
| Runtime Core | SYSTEM (EIOS) | PipelineEngine, Registry, Dispatch, etc. | `eios-runtime/` FROZEN |
| Foundation Directives | SYSTEM (Foundation) | Philosophy, Covenant, Constitution, North Star | `foundation/domains/` THAWED |
| Governance Policy | SYSTEM (Governance) | Policy engine, compliance rules, permission matrix | `governance/` |
| Audit Trail | SYSTEM (Governance + EIOS) | Immutable audit logs, pipeline audit, governance audit | `governance/core/AuditEngine.ts` |
| Trust Scores | SYSTEM (Foundation) | Per-executive trust, 6-dimension trust weights | `ai/runtime/trust-engine.ts` |
| Identity Registry | SYSTEM (Foundation) | Executive identities, capabilities, knowledge domains | `ai/runtime/identity.ts` |
| Kernel State | SYSTEM (Kernel) | Heartbeat, lifecycle, checkpoint, recovery | `kernel/` FROZEN |
| Metrics | SYSTEM (EIOS) | Pipeline metrics, health scores, performance data | `eios-runtime/internal/runtime-observability/` |

---

## Executive Knowledge Coverage Map

```
                         KNOWLEDGE DOMAIN OWNERSHIP
                         P=Primary  S=Secondary  C=Consume  X=System

DOMAIN                      CEO  CTO  CFO  COO  CMO  CAIO  CKO  SYS
-------------------------  ---  ---  ---  ---  ---  ----  ---  ---
Business Strategy           P    C    C    C    C    C     C
Organization Structure      P    C         C              C
Delegation Policy           P    C    C    C    C    C     C
Mission Planning            P    C         C              C
Proposal Review             P    C    C    C    C    C     C
Market Direction            P    C    C    C    S    C     C
Capital Allocation          P    C    S    C    C    C     C
Founder Intent              P                              C
Culture                     P    C    C    C    C    C     C
Conflict Resolution         P    C    C    C    C    C     C
Architecture                C    P                        C
Engineering Standards       C    P                        C
Infrastructure              C    P                        C
Security                    C    P                        C
Performance                 C    P                        C
Technical Debt              C    P                        C
Knowledge Evolution              S         C              P
Cost Analysis                    C    P    C         C    C
Margin Analysis                  C    P    C         C    C
Budget Review               C    C    P    C    C    C    C
Pricing Intelligence              C    P    C    C    C    C
Cash Flow                   C    C    P    C    C    C    C
Financial Trend             C    C    P    C    C    C    C
Inventory Management                   P                   C
Product Management                    P              C    C
Branch Operations                     P                   C
Sales Tracking                        P         C    C    C
Production                             P                   C
Expense Tracking                      P                   C
SOPs                           C                  C    P
Process Optimization                  P              C    C
Market Analysis              C              C    P    C    C
Campaign Strategy            C                   P    C    C
Customer Insight                  C         C    P    S    C
Brand Strategy               C                   P    C    C
Promotional Strategy         C              C    P    C    C
System Health (AI)           C    C         C    C    P    C
AI Architecture                   C              C    P    C
Knowledge Management         C         C    C    C    P    P
System Anomaly               C    C    C    C    C    P    C
Knowledge Curation           C    C    C    C    C    C    P
Best Practices               C    C    C    C    C    C    P
Council Secretary                                           P
Learning Recommend           C    C    C    C    C    C    P
Context Provision            C    C    C    C    C    C    P
Project Advisory             C    P                        S
Runtime Core                                                       X
Foundation Directives                                             X
Governance Policy           C    C    C    C    C    C    C    X
Audit Trail                 C    C    C    C    C    C    C    X
Trust Scores                C    C    C    C    C    C    C    X
Identity Registry           C    C    C    C    C    C    C    X
```

---

## Key Observations from the Matrix

1. **CEO is the most connected** — PRIMARY in 13 domains, CONSUME in nearly all others. Confirms CEO as central hub.

2. **CKO is the most consuming** — CONSUME in 25+ domains (provides advisory across all). Has fewer PRIMARY domains (6) but highest cross-executive reach.

3. **COO has the most isolated domain** — Inventory, production, expenses, and branch operations are almost exclusively COO. These are the most "siloed" knowledge domains.

4. **CAIO bridges system and knowledge** — Only executive that is PRIMARY in both system health AND knowledge management. Critical integration role.

5. **CTO shares knowledge evolution with CKO** — Both have S (Secondary) in knowledge evolution — CTO proposes from technical learnings, CKO curates and integrates.

6. **System-owned domains** are the least documented in EROS — Runtime Core, Foundation Directives, Trust Scores, and Identity Registry have no executive PRIMARY owner and are only documented in source code.

7. **No executive has PRIMARY in Audit Trail** — Despite EVERY executive being required to log audits, no single executive owns the audit knowledge domain.

---

## Ownership Rules

1. **PRIMARY owners** define the schema, validation rules, and quality standards for their domain
2. **SECONDARY owners** contribute knowledge but must follow PRIMARY owner's schema
3. **CONSUME owners** may read and use knowledge but cannot modify it
4. **SYSTEM owners** are infrastructure — knowledge is maintained by EIOS Runtime Core or Foundation, not by any executive
5. **Domain disputes** are resolved by the PRIMARY owner; cross-domain disputes by CEO
6. **Knowledge quality** is the PRIMARY owner's responsibility — they must validate, curate, and deprecate
