# EIOS Implementation Plan — Phase 2

## Executive Intelligence Operating System

### Target: Full EIOS v4.0 Operational

---

## Overview

### Total Duration: 11 weeks
### Total Estimated Files: ~145
### Total Phases: 10

---

## Architecture Dependency Chain

```
Phase 2A ──→ Phase 2B ──→ Phase 2C ──→ Phase 2D
   │            │             │             │
   │            │             │             │
   ▼            ▼             ▼             ▼
Phase 2A ──→ Phase 2B ──→ Phase 2C ──→ Phase 2D
                                        │
                                        ▼
                                   Phase 2E
                                        │
                                        ▼
                              ┌─────────┼─────────┐
                              │         │         │
                         Phase 2F   Phase 2G   Phase 2H
                              │         │         │
                              └─────────┼─────────┘
                                        ▼
                                   Phase 2I
                                        │
                                        ▼
                                   Phase 2J
```

---

## Phase 2A — Enterprise Data Foundation (Week 1)

### Objective
Bangun Event Bus + Event Store. Semua service mulai menerbitkan event.

### Files to Create

```
artifacts/api-server/src/event-bus/
├── EventBus.ts                    # Pub/sub core
├── EventPublisher.ts              # publish(event) → queue → subscribers
├── EventSubscriber.ts             # subscribe(eventType, handler) → idempotent
├── EventStore.ts                  # Append-only log (PostgreSQL-backed)
├── EventReplay.ts                 # Replay events from sequence number
└── EventSerializer.ts             # JSON schema validation + versioning

artifacts/api-server/src/events/
├── InventoryEvents.ts             # StockAdjusted, PurchaseReceived, StockCorrected
├── OrderEvents.ts                 # OrderCreated, OrderCompleted, PaymentReceived
├── ShiftEvents.ts                 # ShiftOpened, ShiftClosed
├── ProductionEvents.ts            # IngredientConsumed, BatchProduced
├── FinanceEvents.ts               # ExpenseRecorded
└── ProductEvents.ts              # ProductCreated, PriceChanged, RecipeChanged
```

### Integration Points
| Existing File | Change |
|---------------|--------|
| `services/inventory.ts` | Emit `StockAdjusted` after every adjustInventory call |
| `services/inventory.ts` | Emit `PurchaseReceived` after applyMovingAverage |
| `routes/orders.ts` | Emit `OrderCreated` + `OrderCompleted` |
| `routes/shiftAudits.ts` | Emit `ShiftOpened` + `ShiftClosed` |
| `routes/semiFinished.ts` | Emit `IngredientConsumed` + `BatchProduced` |
| `routes/expenses.ts` | Emit `ExpenseRecorded` |
| `routes/products.ts` | Emit `ProductCreated` |
| `routes/productVariants.ts` | Emit `PriceChanged` |
| `routes/ai-business.ts` | Emit events for all mutation operations |

### Verification
- [ ] EventBus publishes event → all subscribers receive
- [ ] EventStore persists event → can replay from any point
- [ ] Every business mutation emits exactly 1 event
- [ ] Events are versioned (schema evolution ready)

### Estimated: 5 days

---

## Phase 2B — Business Intelligence Layer (Week 2-3)

### Objective
Bangun BI Layer yang mengonsumsi events dan menghasilkan Metric → Insight → Business Fact untuk domain Inventory + Sales + Finance.

### Files to Create

```
artifacts/api-server/src/business-intelligence/
├── core/
│   ├── types.ts                   # Metric, Insight, BusinessFact
│   ├── MetricStore.ts             # In-memory metric registry, TTL-based
│   ├── InsightEngine.ts           # Metric[] → Insight[] (formula-based)
│   ├── FactEngine.ts              # Insight[] → BusinessFact[] (threshold-based)
│   └── FactRegistry.ts            # Register known fact types + thresholds

├── event-consumers/
│   ├── InventoryEventConsumer.ts  # StockAdjusted + PurchaseReceived → raw metrics
│   ├── SalesEventConsumer.ts      # OrderCompleted + PaymentReceived → raw metrics
│   └── FinanceEventConsumer.ts    # ExpenseRecorded → raw metrics

├── calculators/
│   ├── StockMetricCalculator.ts   # currentStock, avgDailyUsage, stockCoverage
│   ├── RevenueMetricCalculator.ts # dailyRevenue, orderCount, avgOrderValue
│   ├── MarginMetricCalculator.ts  # grossMargin, expenseRatio
│   └── ShiftMetricCalculator.ts   # cashAccuracy, stockAccuracy

├── insight-generators/
│   ├── CoverageInsightGenerator.ts  # Metric → Coverage Insight
│   ├── GrowthInsightGenerator.ts    # Metric → Growth Insight (comparison)
│   ├── TrendInsightGenerator.ts     # Metric → Trend Insight (3-7-30d)
│   └── AnomalyInsightGenerator.ts   # Metric → Anomaly (deviation detection)

├── fact-generators/
│   ├── ThresholdFactGenerator.ts    # Insight vs target → threshold fact
│   ├── AnomalyFactGenerator.ts      # Anomaly insight → anomaly fact
│   └── TrendFactGenerator.ts        # Trend insight → trend fact

└── providers/
    ├── MetricProvider.ts           # getMetrics(domain, period, filters)
    ├── InsightProvider.ts          # getInsights(domain, period, filters)
    └── FactProvider.ts             # getFacts(domain, severity, filters)
```

### CLI Test Script
```
artifacts/api-server/scripts/test-bi.ts
# Simulate events → verify Metric → Insight → Fact pipeline
```

### Verification
- [ ] Inventory event → Metric (currentStock) → Insight (coverage) → Fact (below threshold)
- [ ] Sales event → Metric (revenue) → Insight (growth) → Fact (above/below target)
- [ ] Finance event → Metric (expense) → Insight (ratio) → Fact (anomaly)
- [ ] Facts are pure: no opinions, no recommendations, no decisions
- [ ] All generators are stateless (state lives in MetricStore)

### Estimated: 10 days

---

## Phase 2C — Operational Decision Engine (Week 4)

### Objective
Bangun Decision Engine dengan Rule Engine + AI Reasoning Engine. Ubah Business Facts menjadi Operational Situations.

### Files to Create

```
artifacts/api-server/src/operational-decision-engine/
├── core/
│   ├── types.ts                   # OperationalSituation, CandidateDecision
│   ├── SituationBuilder.ts        # BusinessFact[] → OperationalSituation
│   ├── ImpactEstimator.ts         # financial + operational impact calculation
│   ├── PriorityCalculator.ts      # severity + impact + urgency → priority (1-100)
│   └── ApprovalDeterminer.ts      # situation → approvalLevel + deadline

├── rule-engine/
│   ├── RuleEngine.ts              # Evaluate all rules against facts
│   ├── RuleRegistry.ts            # registerRule(name, condition, handler)
│   └── rules/
│       ├── StockCriticalRule.ts   # coverage < 1 day → critical
│       ├── StockLowRule.ts        # coverage < 3 days → high
│       ├── CashDiscrepancyRule.ts # |diff|/expected > 5% → high
│       ├── YieldAnomalyRule.ts    # yield < 85% → medium
│       ├── ExpenseSpikeRule.ts    # daily > 3x avg → medium
│       └── RevenueDropRule.ts     # daily < 50% of 7d avg → high

├── ai-engine/
│   ├── AIReasoningEngine.ts       # LLM-based complex situation analysis
│   ├── ContextBuilder.ts          # Build context from events + facts + knowledge
│   ├── FactSelector.ts            # Select relevant facts for AI prompt
│   └── prompts/
│       ├── SituationPrompt.ts     # "Analisis situasi bisnis ini..."
│       └── ReasoningPrompt.ts     # "Jelaskan reasoning untuk situasi..."
```

### Integration Points
| Existing File | Change |
|---------------|--------|
| `programs/coo-runtime.ts` | REMOVE: data query intents (get_*) — now DE responsibility |
| `routes/ai-business.ts` | Keep: execution actions only |
| `ai/llm/llm-adapter.ts` | Used by AIReasoningEngine |

### Verification
- [ ] Rule engine produces situation for every threshold breach
- [ ] AI engine produces situation for complex patterns
- [ ] Both engines output same OperationalSituation type
- [ ] Impact estimator calculates financial impact correctly
- [ ] Approval determiner assigns correct level (auto/coo/ceo/founder)

### Estimated: 5 days

---

## Phase 2D — Strategy Engine + Execution Planner (Week 5)

### Objective
Bangun Strategy Engine (situation → strategic objective) + Execution Planner (strategy → execution graph DAG).

### Files to Create

```
artifacts/api-server/src/strategy-engine/
├── core/
│   ├── types.ts                   # StrategicObjective, KPITarget
│   ├── StrategyBuilder.ts         # Situation → StrategicObjective
│   ├── NorthStarAligner.ts        # Evaluate options against North Star
│   ├── OptionGenerator.ts         # Generate possible strategic directions
│   └── ObjectiveSetter.ts         # Set measurable KPI targets
├── strategies/
│   ├── TrafficGrowthStrategy.ts
│   ├── MarginOptimizationStrategy.ts
│   ├── CostReductionStrategy.ts
│   ├── QualityImprovementStrategy.ts
│   └── RiskMitigationStrategy.ts
└── providers/
    └── StrategyProvider.ts

artifacts/api-server/src/execution-planner/
├── core/
│   ├── types.ts                   # ExecutionGraph, GraphNode, GraphEdge
│   ├── GraphBuilder.ts            # StrategicObjective → ExecutionGraph
│   ├── DependencyResolver.ts      # Order nodes, detect cycles
│   ├── CriticalPathAnalyzer.ts    # Find critical path
│   ├── ParallelismDetector.ts     # Identify parallel tasks
│   ├── RollbackBuilder.ts         # Generate rollback sub-graph
│   └── ProgressTracker.ts         # Track node completion
├── templates/
│   ├── StockTransferGraph.ts
│   ├── EmergencyPurchaseGraph.ts
│   ├── RevenueRecoveryGraph.ts
│   ├── ExpenseAuditGraph.ts
│   ├── YieldCorrectionGraph.ts
│   ├── PriceReviewGraph.ts
│   ├── ShiftInvestigationGraph.ts
│   └── CashDiscrepancyGraph.ts
└── providers/
    └── PlanProvider.ts
```

### Verification
- [ ] Strategy produces objective with North Star alignment score
- [ ] Planner generates valid DAG (no cycles, all nodes reachable)
- [ ] Critical path correctly calculated
- [ ] Parallel tasks identified correctly
- [ ] Rollback graph mirrors forward graph
- [ ] Templates produce correct graphs for their domain

### Estimated: 5 days

---

## Phase 2E — Knowledge & Learning Platform (Week 6)

### Objective
Bangun Semantic Memory + Episode Memory + Procedural Memory + Learning Engine.

### Files to Create

```
artifacts/api-server/src/knowledge-platform/
├── core/
│   ├── types.ts                   # KnowledgeBlock, KnowledgeType
│   └── KnowledgeBase.ts           # Unified registry: all three memories

├── semantic/
│   ├── SemanticStore.ts           # Key-value, indexed by entity
│   ├── SemanticIngester.ts        # Extract facts from situations + outcomes
│   └── SemanticQuery.ts           # Query by entity/domain/tag

├── episode/
│   ├── EpisodeStore.ts            # Time-indexed, append-only
│   ├── EpisodeIngester.ts         # Store every resolved situation
│   └── EpisodeQuery.ts            # Query by time/entity/outcome

├── procedural/
│   ├── ProceduralStore.ts         # Pattern-indexed rules
│   ├── ProceduralIngester.ts      # Extract patterns from repeated episodes
│   └── ProceduralQuery.ts         # Query by condition/domain

├── learning/
│   ├── LearningEngine.ts          # Subscribe to plan outcomes → adjust confidence
│   ├── ConfidenceAdjuster.ts      # formula: success +10, failure -20
│   ├── PatternPromoter.ts         # 5+ success → promote to best_practice
│   └── DeprecationEngine.ts       # 3+ failure → deprecate

└── providers/
    └── KnowledgeProvider.ts       # Unified API: query, ingest, learn
```

### Verification
- [ ] Semantic memory stores and retrieves entity facts
- [ ] Episode memory stores every resolved situation with outcome
- [ ] Procedural memory detects patterns from 3+ similar episodes
- [ ] Learning engine adjusts confidence on outcome
- [ ] Pattern promoter promotes at 5 successes
- [ ] Deprecation engine deprecates at 3 failures

### Estimated: 5 days

---

## Phase 2F — Brief Generator + Communication Runtime (Week 7)

### Objective
Bangun Executive Brief Generator + Communication Runtime (queue, retry, channels).

### Files to Create

```
artifacts/api-server/src/executive-runtime/core/
├── BriefGenerator.ts              # aggregate facts/situations/plans/knowledge → Brief
├── SectionPrioritizer.ts          # sort by severity + priority
├── ActionItemExtractor.ts         # extract action items from situations
└── ApprovalFormatter.ts           # format approval requests

artifacts/api-server/src/communication-runtime/
├── core/
│   ├── DeliveryQueue.ts           # Prioritized queue (Redis-backed)
│   ├── DeliveryScheduler.ts       # Schedule briefs: 06:00, 12:00, 18:00
│   ├── RetryEngine.ts             # Exponential backoff: 1s, 5s, 30s, 5m, 30m
│   ├── ConfirmationWatcher.ts     # Poll for read receipts / delivery status
│   └── MessageBuilder.ts          # Format content per channel spec
├── channels/
│   ├── WhatsAppChannel.ts         # WhatsApp Business API integration
│   ├── DashboardChannel.ts        # SSE / WebSocket push to dashboard
│   ├── TelegramChannel.ts         # Telegram Bot API
│   ├── EmailChannel.ts            # Nodemailer SMTP
│   └── NotificationChannel.ts     # In-app notification via SSE
├── templates/
│   ├── SituationAlertTemplate.ts
│   ├── BriefTemplate.ts
│   ├── ApprovalTemplate.ts
│   ├── ProgressTemplate.ts
│   └── ReportTemplate.ts
└── providers/
    └── CommunicationProvider.ts
```

### Integration Points
| Existing File | Change |
|---------------|--------|
| `programs/coo-runtime.ts` | Start receiving Brief instead of calling executeOperation |
| `routes/dashboard.ts` | Add SSE endpoint for real-time updates |

### Verification
- [ ] Brief generator produces COO-specific brief from mock data
- [ ] Delivery queue processes tasks in priority order
- [ ] Retry engine retries failed deliveries with backoff
- [ ] Confirmation watcher detects delivery/receipt status
- [ ] WhatsApp channel sends properly formatted message
- [ ] Dashboard channel updates in real-time

### Estimated: 5 days

---

## Phase 2G — Governance + Council + North Star (Week 8)

### Objective
Bangun Governance Layer, Executive Council, dan North Star Alignment.

### Files to Create

```
artifacts/api-server/src/governance/
├── core/
│   ├── PolicyEngine.ts            # Evaluate policies against action + role
│   ├── PermissionEngine.ts        # Check if role can perform action
│   ├── ApprovalMatrix.ts          # Determine approval chain
│   ├── AuditEngine.ts             # Log all decisions + policy evaluations
│   └── ComplianceChecker.ts       # Regulatory compliance rules
├── policies/
│   ├── PermissionPolicies.ts      # GOV-001, GOV-002, etc.
│   ├── ApprovalPolicies.ts        # GOV-003, GOV-004
│   └── CompliancePolicies.ts      # Data retention, privacy
└── providers/
    └── GovernanceProvider.ts      # canExecute(role, action, params) → {allow, reason}

artifacts/api-server/src/executive-council/
├── core/
│   ├── CouncilSession.ts          # Create/manage session
│   ├── CouncilOrchestrator.ts     # Flow: brief → collect → debate → vote → resolve
│   ├── ConsensusDetector.ts       # Analyze positions → consensus level
│   ├── PositionCollector.ts       # Collect positions from executives
│   └── EscalationEngine.ts        # Escalate to Founder if no consensus
├── ai-debate/
│   ├── DebateFacilitator.ts       # AI-facilitated structured debate
│   ├── ArgumentAnalyzer.ts        # Summarize positions, find common ground
│   └── CompromiseFinder.ts        # Generate compromise options
└── providers/
    └── CouncilProvider.ts

artifacts/api-server/src/north-star/
├── NorthStarConfiguration.ts      # Define objectives + weights + targets
├── StrategyEvaluator.ts           # Evaluate strategy against North Star
├── ScoreCalculator.ts             # Weighted score from evaluations
└── providers/
    └── NorthStarProvider.ts
```

### Verification
- [ ] Policy engine denies COO from changing prices
- [ ] Policy engine requires approval for large transfers
- [ ] Council session creates, collects positions, detects consensus
- [ ] Escalation engine escalates to Founder on deadlock
- [ ] North Star evaluator correctly scores strategy options
- [ ] All decisions logged in audit engine

### Estimated: 5 days

---

## Phase 2H — COO Rewrite (Week 9)

### Objective
Tulis ulang COO Runtime untuk berjalan sepenuhnya di atas EIOS. COO hanya menerima Brief, tidak lagi memanggil database atau executeOperation untuk data query.

### Files to Modify

```
artifacts/api-server/src/programs/coo-runtime.ts
│
├── REMOVE:
│   - COO_ACTIONS_SCHEMA (data queries: get_inventory_status, etc.)
│   - Intent classification for data queries
│   - dataQueryActions array
│   - Direct executeOperation calls for data
│   - SQL formatting in prompts
│   - All database column names
│
├── ADD:
│   - BriefConsumer: receives ExecutiveBrief from BriefGenerator
│   - SituationHandler: approve/reject/escalate
│   - PlanMonitor: track execution progress
│   - KnowledgeRecorder: record lessons learned
│   - ApprovalHandler: process approval requests
│
├── KEEP:
│   - Execution actions (add_stock, produce, transfer, etc.)
│   - Business persona (Direktur Operasional)
│   - WhatsApp/dashboard communication
```

### New COO Architecture

```typescript
// Pseudocode for post-EIOS COO Runtime

class COORuntime {
  async execute(userMessage: string, context: { userId: number; branchId?: number }) {
    // 1. Get current brief
    const brief = await BriefGenerator.getBrief("COO", {
      branchId: context.branchId,
      userId: context.userId
    });

    // 2. Process user message in context of brief
    const intent = await classifyIntent(userMessage, brief);

    switch (intent.type) {
      case "approve":
        // Approve a pending situation decision
        const approval = await this.processApproval(intent.situationId, intent.optionId);
        await GovernanceProvider.check("COO", "approve_situation", intent);
        await CouncilProvider.submitPosition("COO", approval);
        return "✅ Transfer 3kg Gula Aren dari Branch B telah disetujui.";

      case "status":
        // Answer questions using brief data (NOT database)
        const answer = await this.answerFromBrief(intent.query, brief);
        return answer;

      case "action":
        // Execute operational action (add stock, produce, etc.)
        const plan = await PlanProvider.createPlan("direct_action", intent.action, intent.params);
        await CommunicationProvider.dispatch(plan);
        return "✅ Tugas telah dikirim ke tim operasional.";

      case "question":
        // General question — use knowledge + facts
        return await this.answerWithKnowledge(intent.query);

      default:
        return "Maaf, saya tidak bisa melakukan itu. Silakan hubungi Founder.";
    }
  }

  // COO NEVER queries database
  // COO NEVER calls executeOperation for data
  // COO NEVER sees inventory tables
}
```

### COO Prompt (Post-EIOS)

```
# Identitas
Kamu adalah **Direktur Operasional (COO)** Lume's Everywhere.

# Wewenang
- Menyetujui/menolak keputusan operasional
- Memonitor progres eksekusi
- Berkomunikasi dengan Founder dan staff
- Mencatat pelajaran yang dipelajari

# BATASAN KETAT
- Kamu TIDAK BISA membaca database
- Kamu TIDAK BISA menghitung KPI
- Kamu TIDAK BISA mengakses inventory table
- Kamu TIDAK BISA mengubah harga
- Kamu TIDAK BISA mengubah resep tanpa approval

# Yang Kamu Terima
{BRIEF} — ringkasan eksekutif situasi hari ini.

# Tugasmu Hari Ini
Dari brief di atas:
1. Situasi mana yang perlu keputusan?
2. Approval mana yang menunggu?
3. Progres apa yang perlu dimonitor?
4. Apa yang perlu dilaporkan ke Founder?
```

### Verification
- [ ] COO never calls executeOperation for data queries
- [ ] COO receives ExecutiveBrief, not raw data
- [ ] COO can approve/reject situations
- [ ] COO can create knowledge from outcomes
- [ ] COO communicates through Communication Runtime
- [ ] Existing business actions (add_stock, etc.) still work

### Estimated: 5 days

---

## Phase 2I — Remaining Executives (Week 10-11)

### Objective
Bangun CEO, CFO, CMO, CAIO, CKO di atas EIOS yang sama.

### Files to Create

```
artifacts/api-server/src/executive-runtime/executives/
├── CEO/
│   ├── CEOProgram.ts              # Growth, expansion, strategy
│   └── CEO.config.ts              # Required: Branch, Finance, Sales
├── CFO/
│   ├── CFOProgram.ts              # Margin, expenses, cash flow
│   └── CFO.config.ts              # Required: Finance, Margin, Expense
├── CMO/
│   ├── CMOProgram.ts              # Marketing, customer, campaigns
│   └── CMO.config.ts              # Required: Customer, Sales, Product
├── CAIO/
│   ├── CAIOProgram.ts             # System architecture, AI health
│   └── CAIO.config.ts             # Required: All system metrics
└── CKO/
    ├── CKOProgram.ts              # Knowledge curation, council secretary
    └── CKO.config.ts              # Required: All knowledge types
```

### Executive Matrix

| Executive | Required Facts | Optional Facts | Forbidden | Approval Level |
|-----------|---------------|----------------|-----------|----------------|
| CEO | Branch, Finance, Sales, Growth | Workforce, Customer | Shift details, Stock items | Founder (for major) |
| CFO | Finance, Margin, Expense, Cashflow | Inventory (cost) | Operations, Staff | CEO |
| CMO | Customer, Sales, Product | Branch | Inventory, Production | CEO |
| CAIO | System, AI, Knowledge, Automation | — | Business decisions | CEO |
| CKO | All knowledge types | — | Business decisions | — |

### Verification
- [ ] CEO brief contains branch comparison + revenue growth
- [ ] CFO brief contains margin analysis + expense alerts
- [ ] CMO brief contains top products + sales trends
- [ ] CAIO brief contains system health + learning status
- [ ] CKO brief contains knowledge curation suggestions
- [ ] All executives on same EIOS pipeline
- [ ] Council can hold sessions with all executives

### Estimated: 10 days

---

## Phase 2J — Hardening + Testing + Documentation (Week 11)

### Objective
Testing, performance optimization, documentation.

### Testing Strategy

```
tests/
├── unit/
│   ├── event-bus.test.ts
│   ├── bi-metric.test.ts
│   ├── bi-insight.test.ts
│   ├── bi-fact.test.ts
│   ├── decision-rule.test.ts
│   ├── decision-ai.test.ts
│   ├── strategy.test.ts
│   ├── planner.test.ts
│   ├── planner-graph.test.ts
│   ├── knowledge-memory.test.ts
│   ├── knowledge-learning.test.ts
│   ├── governance-policy.test.ts
│   ├── council-session.test.ts
│   └── north-star.test.ts
│
├── integration/
│   ├── event-to-fact.test.ts      # Event → BI pipeline
│   ├── fact-to-situation.test.ts  # Fact → Decision pipeline
│   ├── situation-to-plan.test.ts  # Situation → Plan pipeline
│   └── brief-to-council.test.ts   # Brief → Council pipeline
│
└── e2e/
    ├── coo-full-cycle.test.ts     # Event → COO brief → decision
    ├── stockout-scenario.test.ts  # Complete stockout handling
    ├── discrepancy-scenario.test.ts
    └── council-scenario.test.ts   # Multi-executive deliberation
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Event publish → BI fact | < 100ms |
| BI fact → Decision situation | < 200ms |
| Decision → Strategy objective | < 300ms |
| Strategy → Execution plan | < 500ms |
| Brief generation | < 1s |
| Delivery queue throughput | 1000 msg/min |
| Knowledge query (p99) | < 50ms |

### Documentation

```
docs/
├── EIOS_ARCHITECTURE.md
├── EIOS_EVENT_CATALOG.md
├── EIOS_API_REFERENCE.md
├── EIOS_OPERATIONS_GUIDE.md
├── EXECUTIVE_CONFIGURATION.md     # How to add new executive
└── GOVERNANCE_POLICIES.md         # Policy catalog + how to add
```

### Estimated: 5 days

---

## Summary — Full Implementation Roadmap

```
Week 1:  Phase 2A — Event Bus + Event Store
Week 2-3: Phase 2B — Business Intelligence Layer
Week 4:   Phase 2C — Decision Engine (Rule + AI)
Week 5:   Phase 2D — Strategy Engine + Execution Planner
Week 6:   Phase 2E — Knowledge & Learning Platform
Week 7:   Phase 2F — Brief Generator + Communication Runtime
Week 8:   Phase 2G — Governance + Council + North Star
Week 9:   Phase 2H — COO Rewrite
Week 10-11: Phase 2I — CEO, CFO, CMO, CAIO, CKO
Week 11:  Phase 2J — Testing + Hardening + Docs
```

### Total: 11 weeks / ~145 files / ~10.000+ lines of TypeScript

---

## Risk Register

| # | Risk | P | I | Mitigation | Owner |
|---|------|---|---|------------|-------|
| R1 | Event Bus becomes single point of failure | M | H | Partition by domain; isolated channels per domain | Phase 2A |
| R2 | AI Decision Engine produces wrong situations | M | H | Rule Engine always runs alongside; AI output is lower confidence | Phase 2C |
| R3 | Brief size exceeds LLM context window | M | M | Brief summarization; priority-based truncation; detail available via drill-down | Phase 2F |
| R4 | Knowledge Platform memory growth unbounded | L | M | Importance-based TTL; auto-archive if not used 30d | Phase 2E |
| R5 | Council delays urgent decisions | M | M | Routing rules: critical situations bypass council (direct to Founder) | Phase 2G |
| R6 | Migration from current COO to EIOS COO regresses live ops | H | H | Parallel run Phase 2H.1 — shadow mode, compare outputs for 1 week | Phase 2H |
| R7 | Event schema changes break consumers | M | H | Event versioning; backward-compatible schema evolution | Phase 2A |

---

## Decision Log

| # | Date | Decision | Rationale | Author |
|---|------|----------|-----------|--------|
| D1 | — | BI Layer outputs Metric → Insight → Fact (3 tiers) | Reasoning AI perlu hierarchy, bukan flat data | Founder |
| D2 | — | Decision Engine uses dual engine (Rule + AI) | Rule untuk pola pasti, AI untuk kompleksitas multi-faktor | Founder |
| D3 | — | Planner outputs DAG, not linear tasks | Task paralel memerlukan graph, bukan list | Founder |
| D4 | — | Knowledge dipisah menjadi 3 memori | Semantic/Episode/Procedural mengikuti arsitektur AI modern | Founder |
| D5 | — | Executives receive Brief, not raw facts | Eksekutif tidak perlu 300 facts, cukup ringkasan prioritas | Founder |
| D6 | — | Council added as Layer 7 | Multi-executive deliberation sebelum Founder ambil keputusan | Founder |
| D7 | — | North Star sebagai layer paling atas | Semua keputusan harus align dengan tujuan bisnis | Founder |
| D8 | — | Governance sebagai cross-cutting layer | Enterprise AI wajib punya policy enforcement | Founder |
| D9 | — | Event Bus + Event Store sebagai Layer 0 | Decouple producers/consumers; BI baca events, bukan tabel | Founder |
| D10 | — | COO rewrite sebagai Phase 2H (not 2A) | COO harus jadi executive terakhir yang dimigrasi, setelah semua layer siap | Founder |

---

## Ready to Execute

All phases are defined with:
- Concrete file lists
- Integration points with existing code
- Verification checklists
- Dependencies mapped
- Risk register

Pick a phase to start execution.
