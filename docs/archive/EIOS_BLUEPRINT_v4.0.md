# EIOS v4.0 — Executive Intelligence Operating System

## Complete Architecture Blueprint

---

## Philosophy

> **Executive tidak boleh berpikir menggunakan database.**
> Executive harus berpikir menggunakan Business Intelligence.

EIOS adalah sistem operasi kepemimpinan digital yang mengubah data mentah menjadi fakta bisnis, situasi operasional, strategi, rencana eksekusi, dan pembelajaran organisasi — sehingga setiap AI Executive (CEO, COO, CFO, CMO, CAIO, CKO) hanya bertanggung jawab pada **interpretasi, komunikasi, persetujuan, dan delegasi**.

---

## Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      NORTH STAR LAYER (Cross-cutting)                      │
│  Profitability · Growth · Customer Satisfaction · Operational Excellence   │
│  ↓ Semua keputusan dievaluasi terhadap tujuan bisnis                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 0: ENTERPRISE DATA FOUNDATION                                       │
│  Event Bus → Event Store → Read Models                                     │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Events
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: BUSINESS INTELLIGENCE                                            │
│  Metric → Insight → Business Fact                                          │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Facts
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: OPERATIONAL DECISION ENGINE                                      │
│  Rule Engine + AI Reasoning Engine → Situation                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Situations
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: STRATEGY ENGINE                                                  │
│  Situation → Strategic Objective → Direction                               │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Strategy
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: EXECUTION PLANNER                                                │
│  Strategy → Execution Graph (DAG)                                          │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Plans
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: KNOWLEDGE & LEARNING PLATFORM                                    │
│  Semantic Memory + Episode Memory + Procedural Memory + Learning Engine    │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Knowledge
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 6: EXECUTIVE RUNTIME                                                │
│  Brief Generator → Executive (CEO/COO/CFO/CMO/CAIO/CKO)                   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Decisions
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 7: EXECUTIVE COUNCIL                                                │
│  Multi-executive deliberation → Consensus → Recommendation                 │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ Approved Plan
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 8: COMMUNICATION RUNTIME                                            │
│  Delivery Queue → Retry → Channel → Confirmation                           │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                              ╔══════════╗
                              ║  FOUNDER ║
                              ╚══════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│                      GOVERNANCE LAYER (Cross-cutting)                      │
│  Policy Engine · Permission Engine · Approval Matrix · Audit · Compliance  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 0 — Enterprise Data Foundation

### Purpose

Memisahkan data producers dari data consumers. Setiap operasi bisnis menjadi **immutable event**. BI membaca events, bukan tabel database secara langsung.

### Event Catalog

| Event | Producer | Trigger |
|-------|----------|---------|
| `StockAdjusted` | Inventory Service | Stok berubah (+/-) |
| `OrderCreated` | Orders Service | Pesanan baru dibuat |
| `OrderCompleted` | Orders Service | Pesanan selesai diproses |
| `PaymentReceived` | Orders Service | Pembayaran diterima |
| `ShiftOpened` | Shift Service | Shift dimulai |
| `ShiftClosed` | Shift Service | Shift ditutup + rekonsiliasi |
| `IngredientConsumed` | Production Service | Bahan baku dipakai produksi |
| `BatchProduced` | Production Service | Batch setengah jadi selesai |
| `PurchaseReceived` | Inventory Service | Pembelian barang masuk |
| `RecipeChanged` | Recipe Service | Resep diperbarui |
| `InventoryTransferred` | Transfer Service | Stok dipindah antar cabang |
| `ExpenseRecorded` | Expense Service | Pengeluaran dicatat |
| `ProductCreated` | Product Service | Produk baru ditambahkan |
| `PriceChanged` | Product Service | Harga produk berubah |
| `StockCorrected` | Inventory Service | Stok dikoreksi manual |

### Event Specification

```typescript
interface BusinessEvent {
  id: string;                    // UUID
  type: string;                  // "StockAdjusted" | "OrderCreated" | ...
  version: number;               // Schema version
  producer: string;              // Service name
  aggregateId: string;           // "inventory:branch:1:ingredient:42"
  aggregateType: string;         // "inventory" | "order" | "shift"

  data: Record<string, any>;
  metadata: {
    correlationId?: string;
    causationId?: string;
    userId?: number;
    branchId?: number;
    timestamp: string;           // ISO
  };
}
```

### Read Models

BI memelihara read models yang dibangun dari event stream:

```typescript
interface InventoryReadModel {
  branchId: number;
  itemType: string;
  itemId: number;
  currentStock: number;
  avgDailyUsage: number;         // Dari 30 hari terakhir
  stockCoverageDays: number;
  lastUpdated: string;
}

interface SalesReadModel {
  branchId: number;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalOrders: number;
  totalCogs: number;
  avgOrderValue: number;
  topProducts: { productName: string; revenue: number; qty: number }[];
}
```

### Responsibilities

- Menerbitkan event untuk setiap perubahan data bisnis
- Menyimpan event secara immutable (append-only log)
- Menyediakan replay capability untuk rebuild read models
- Menjaga event schema versioning untuk evolvability

---

## Layer 1 — Business Intelligence

### Purpose

Mengubah event menjadi tiga tingkat pemahaman bisnis: **Metric → Insight → Business Fact**.

### Three-Tier Hierarchy

```
Raw Event
    ↓
┌─────────────────────────────────────────┐
│  METRIC (Level 1)                        │
│  Nilai kalkulasi mentah dari data event  │
│  "Current Stock = 350 gram"              │
│  "Revenue = Rp 12.500.000"               │
│  Tidak ada interpretasi atau penilaian   │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  INSIGHT (Level 2)                       │
│  Turunan dari metrics, menambah konteks  │
│  "Stock Coverage = 2.3 hari"             │
│  "Revenue Growth = +12% vs minggu lalu"  │
│  Masih objektif, sudah diinterpretasi    │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  BUSINESS FACT (Level 3)                 │
│  Kesimpulan yang relevan untuk bisnis    │
│  "Stock coverage di bawah target minimum"│
│  "Revenue growth melebihi target"        │
│  BATAS BI — TIDAK BOLEH rekomendasi      │
└──────────────────────────────────────────┘
```

### Type Definitions

```typescript
interface Metric {
  id: string;
  domain: BusinessDomain;        // "inventory" | "sales" | "production" | "finance" | "shift"
  metricType: string;            // "current_stock" | "revenue" | "order_count"
  label: string;                 // "Current Stock"
  value: number;
  unit: string;                  // "gram" | "rp" | "qty" | "percent" | "days"
  period: { start: string; end: string };
  sourceEvent: string;
  generatedAt: string;
  confidence: number;
}

interface Insight {
  id: string;
  domain: BusinessDomain;
  insightType: string;           // "stock_coverage" | "revenue_growth"
  label: string;                 // "Stock Coverage"
  value: number;
  unit: string;
  direction?: "up" | "down" | "flat";
  comparison?: {
    previousValue: number;
    previousPeriod: { start: string; end: string };
    changePercent: number;
  };
  sourceMetrics: string[];
  generatedAt: string;
  confidence: number;
}

interface BusinessFact {
  id: string;
  domain: BusinessDomain;
  factType: FactType;            // "threshold_breach" | "trend" | "anomaly" | "forecast"
  title: string;                 // "Stock Coverage Below Minimum"
  summary: string;               // "Gula Aren: coverage 2.3 hari, target minimum 3 hari"
  severity: "critical" | "high" | "medium" | "low" | "info";
  sourceInsights: string[];
  threshold?: { target: number; actual: number; unit: string };
  generatedAt: string;
  validUntil: string;
  confidence: number;
}
```

### Fact Extractors

| Domain | Extractor | Metric | Insight | Fact Trigger |
|--------|-----------|--------|---------|-------------|
| Inventory | StockCoverage | stock, usage/day | coverage_days | coverage < target |
| Inventory | WasteRate | loss adjustments | waste_% | waste > 5% |
| Sales | Revenue | daily total | revenue_growth | growth < 0 |
| Sales | AOV | total/orders | aov_trend | AOV drop > 10% |
| Production | YieldEfficiency | actual/expected | yield_% | yield < 90% |
| Finance | GrossMargin | (rev-cogs)/rev | margin_% | margin < target |
| Finance | ExpenseRatio | expenses/rev | expense_ratio | ratio > threshold |
| Shift | CashAccuracy | 1-|diff|/expected | cash_accuracy_% | accuracy < 95% |
| Shift | StockAccuracy | 1-anomalies/total | stock_accuracy_% | accuracy < 90% |

### Cardinal Rule

**Business Intelligence TIDAK PERNAH memberikan opini, rekomendasi, atau keputusan.**
BI hanya melaporkan apa yang benar, apa yang berubah, apa yang anomali, dan apa yang diperkirakan.

---

## Layer 2 — Operational Decision Engine

### Purpose

Menginterpretasi Business Facts menjadi **Operational Situations** menggunakan dual-engine: Rule Engine (deterministik) + AI Reasoning Engine (kompleks).

### Dual-Engine Design

```
Business Facts
    │
    ├──→ Rule Engine ──→ Situations
    │     (pola yang sudah dikenal dan terdefinisi)
    │
    └──→ AI Reasoning Engine ──→ Situations
          (pola kompleks, multi-faktor, pertama kali terjadi)
```

### When to Use Which Engine

| Pattern | Rule Engine | AI Engine |
|---------|-------------|-----------|
| Stock coverage < 2 hari | ✅ Rule | — |
| Cash discrepancy > 5% | ✅ Rule | — |
| Revenue drop + cuaca + hari libur + event kota | — | ✅ AI |
| Margin drop + supplier price change + competitor | — | ✅ AI |
| Kejadian berulang (3+) | ✅ Promoted to Rule | — |
| Anomali pertama dengan penyebab tidak jelas | — | ✅ AI |

### OperationalSituation Specification

```typescript
interface OperationalSituation {
  id: string;
  domain: BusinessDomain;
  situationType: SituationType;
  // "stock_critical" | "stock_low" | "cash_discrepancy" | "yield_anomaly"
  // | "expense_spike" | "revenue_drop" | "margin_pressure" | "production_issue"
  // | "shift_compliance" | "employee_risk" | "opportunity"

  title: string;
  summary: string;
  detail: string;

  severity: "critical" | "high" | "medium" | "low" | "info";
  impact: {
    type: "revenue" | "cost" | "operations" | "compliance" | "reputation";
    estimatedFinancial?: number;
    description: string;
    riskLevel: "low" | "medium" | "high";
  };
  priority: number;              // 1-100
  urgency: "immediate" | "today" | "this_week" | "this_month";
  deadline?: string;

  generatedBy: "rule_engine" | "ai_engine";
  engineConfidence: number;
  reasoning?: string;            // AI's chain of thought

  candidateStrategies: StrategicOption[];
  supportingFacts: string[];
  affectedEntities: EntityRef[];

  status: "new" | "acknowledged" | "strategy_selected" | "planning"
        | "executing" | "resolved" | "dismissed";
  createdAt: string;
  ttl: number;                   // Seconds before re-evaluation
}

interface StrategicOption {
  id: string;
  label: string;
  description: string;
  estimatedCost?: number;
  estimatedImpact?: string;
  risk: "low" | "medium" | "high";
  confidence: number;
  requiresApproval: boolean;
  autoExecutable: boolean;
}
```

### Decision Rules — Examples

| Rule | Condition | Severity | Impact | Option |
|------|-----------|----------|--------|--------|
| Stock Critical | coverage < 1 day | critical | Revenue loss | Transfer, Emergency buy |
| Stock Low | coverage < 3 days | high | Disruption | Reorder |
| Cash Discrepancy | diff > 5% of expected | high | Compliance risk | Investigate |
| Yield Anomaly | yield < 85% | medium | Cost inefficiency | Calibrate recipe |
| Expense Spike | daily > 3x avg | medium | Margin pressure | Audit expense |
| Revenue Drop | daily < 50% of 7d avg | high | Business health | Promo, Menu review |
| Margin Pressure | margin drop > 5% MoM | high | Profitability | Price review, Cost audit |

---

## Layer 3 — Strategy Engine

### Purpose

Menjawab **"Apa tujuan kita?"** — bukan **"Bagaimana melakukannya?"**.
Strategy Engine mengubah Operational Situation menjadi arah strategis yang terukur.

### Data Flow

```
OperationalSituation
    ↓
Strategy Engine
    ├── Situational Analysis
    ├── North Star Alignment Check
    ├── Strategic Option Generation
    ├── Strategic Decision (dengan rationale)
    ├── KPI Target Setting
    └── Success Criteria Definition
    ↓
StrategicObjective
```

### StrategicObjective Specification

```typescript
interface StrategicObjective {
  id: string;
  situationId: string;
  domain: BusinessDomain;

  northStarAlignment: {
    objective: NorthStarObjective;  // "profitability" | "growth" | "satisfaction" | "excellence"
    impact: "positive" | "negative" | "neutral";
    score: number;                  // -100 to +100
  };

  strategy: {
    direction: string;              // "increase_traffic" | "improve_margin" | "reduce_cost"
    rationale: string;
    alternativeDirections: string[];
    confidence: number;
  };

  objective: {
    description: string;            // "Increase daily transactions by 20% in 7 days"
    kpiTargets: { kpi: string; current: number; target: number; unit: string; priority: string }[];
    timeframe: { start: string; end: string };
  };

  constraints: {
    budget?: number;
    resources?: string[];
    forbiddenApproaches: string[];
    minimumSuccessRate: number;
  };

  successCriteria: { id: string; description: string; verificationMethod: string }[];

  status: "active" | "completed" | "failed" | "superseded";
  generatedBy: "strategy_engine" | "founder" | "council";
  createdAt: string;
}
```

### Strategy Rules

| Situation | Strategy Options | Typical Choice | Why |
|-----------|----------------|---------------|-----|
| Revenue Drop | Increase traffic, Raise prices, Reduce portion | Increase traffic | Sustainable growth |
| Margin Pressure | Reduce COGS, Raise prices, Optimize waste | Reduce COGS | Customer retention |
| Stock Critical | Emergency buy, Transfer, Substitute | Transfer | Fastest, zero cost |
| Cash Discrepancy | Investigate, Tighten process, Auto-audit | Tighten process | Systemic fix |
| Yield Anomaly | Calibrate, Retrain, Replace equipment | Calibrate | Lowest cost, fastest |
| Low Customer | Promo, Loyalty program, Improve quality | Promo | Immediate impact |

---

## Layer 4 — Execution Planner

### Purpose

Mengubah Strategic Objective menjadi **Execution Graph** (DAG — Directed Acyclic Graph) yang dapat dieksekusi.

### Execution Graph

```
Sebelum (Linear):                Sesudah (Graph/DAG):
Task 1 → Task 2 → Task 3        ┌── Task 2 ──┐
                                 │            │
                                 Task 1 ── Task 3 ── Task 5
                                 │            │
                                 └── Task 4 ──┘
```

### ExecutionGraph Specification

```typescript
interface ExecutionGraph {
  id: string;
  strategicObjectiveId: string;
  title: string;
  objective: string;

  nodes: GraphNode[];
  edges: GraphEdge[];
  entryNodes: string[];
  terminalNodes: string[];

  estimatedDuration: number;
  criticalPath: string[];
  deadlines: { start: string; critical: string; end: string };

  assignments: { nodeId: string; assignee: string }[];
  successCriteria: { id: string; description: string; satisfied: boolean }[];
  rollbackGraph?: ExecutionGraph;

  status: "created" | "approved" | "in_progress" | "completed" | "failed" | "rolled_back";
  progress: number;
  nodeProgress: Record<string, NodeStatus>;

  createdAt: string;
  updatedAt: string;
}

interface GraphNode {
  id: string;
  type: "action" | "decision" | "notification" | "verification" | "wait";
  action: string;
  params: Record<string, any>;
  label: string;
  description: string;
  estimatedDuration: number;
  assignee: "system" | "human" | "executive";
  instructions?: string;
  autoExecutable: boolean;
  executionResult?: string;
  retryPolicy?: { maxRetries: number; backoffMs: number };
  rollbackNodeId?: string;
  status: NodeStatus;
}

interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: "dependency" | "conditional" | "parallel";
  condition?: string;
}
```

### Plan Templates

| Strategy | Execution Graph |
|----------|----------------|
| Transfer Stock | `[CheckSourceStock] → [InitiateTransfer] → [AdjustInventorySource]` |
| | `→ [AdjustInventoryTarget]` |
| | `→ [NotifyBranches] → [VerifyStock]` |
| Emergency Purchase | `[FindSupplier] → [CreatePO] → [RecordExpense]` |
| | `→ [WaitDelivery] → [ReceiveStock] → [ApplyMovingAvg]` |
| Revenue Recovery | `[AnalyzeDropCause] → [ChoosePromoType]` |
| | `→ [CreatePromo] → [AnnounceBranches]` |
| | `→ [Monitor24h] → [Evaluate]` |
| | `→ (if failed) [AlternativeStrategy]` |
| Cash Investigation | `[FreezeShift] → [ReviewTransactions]` |
| | `→ [InterviewCashier] → [DetermineRootCause]` |
| | `→ [ApplyCorrection] → [UpdateAuditStatus]` |

---

## Layer 5 — Knowledge & Learning Platform

### Purpose

Memori organisasi dalam tiga dimensi, dengan kemampuan belajar dari hasil (outcome).

### Three Memory Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE & LEARNING PLATFORM                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SEMANTIC MEMORY                                          │   │
│  │  Fakta tentang dunia yang jarang berubah                  │   │
│  │  Contoh: "Supplier A buka jam 08:00"                     │   │
│  │  Contoh: "Branch B foot traffic 30% lebih tinggi weekend" │   │
│  │  Storage: Key-value, indexed by entity                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EPISODE MEMORY                                           │   │
│  │  Kejadian spesifik di masa lalu dengan konteks            │   │
│  │  Contoh: "8 Juli 2026 — stockout Gula Aren di Branch A"  │   │
│  │  Contoh: "15 Juni 2026 — cash discrepancy Rp50rb Budi"   │   │
│  │  Storage: Time-indexed, source = OperationalSituation     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PROCEDURAL MEMORY                                        │   │
│  │  Cara melakukan sesuatu — pola dan best practice          │   │
│  │  Contoh: "coverage < 2 hari → transfer stock"            │   │
│  │  Contoh: "discrepancy > 5% → investigate"                │   │
│  │  Storage: Pattern-indexed, diperkuat oleh Learning Engine │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LEARNING ENGINE                                          │   │
│  │  Outcome → Confidence Adjustment                          │   │
│  │  Contoh: "transfer succeeded 5/6 → confidence 83%"       │   │
│  │  Contoh: "purchase failed 3/5 → confidence 40%"          │   │
│  │  Fungsi: promote/demote procedural knowledge              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### KnowledgeBlock Specification

```typescript
interface KnowledgeBlock {
  id: string;
  type: "semantic" | "episode" | "procedural";

  domain: BusinessDomain;
  topic: string;
  summary: string;
  tags: string[];
  entityRefs: EntityRef[];
  sourceRefs: string[];

  semantic?: {
    fact: string;
    source: string;
    verifiedAt: string;
    expiresAt?: string;
  };
  episode?: {
    eventType: string;
    eventId: string;
    timestamp: string;
    context: string;
    outcome: "success" | "failure" | "neutral";
    involvedEntities: EntityRef[];
  };
  procedural?: {
    condition: string;              // "stock_coverage < 2"
    action: string;                 // "transfer_stock"
    parameters: Record<string, any>;
    successRate: number;
    executionCount: number;
  };

  confidence: number;               // 0-100 (diatur Learning Engine)
  importance: number;
  recurrence: number;
  firstObserved: string;
  lastObserved: string;
  lastOutcome?: "success" | "failure" | "partial";

  status: "observed" | "confirmed" | "active" | "deprecated" | "archived";
}
```

### Learning Engine Rules

| Outcome | Action | Threshold |
|---------|--------|-----------|
| Success | confidence +10 (cap 100) | — |
| Failure | confidence -20 (floor 0) | — |
| Partial | confidence ±5 | Tergantung metric achievement |
| Success 5x | Promote to "best_practice" | Status → "confirmed" |
| Failure 3x | Demote to "deprecated" | Confidence < 30 |
| Not used 30 days | Archive | Status → "archived" |

---

## Layer 6 — Executive Runtime

### Purpose

Setiap Executive (CEO, COO, CFO, CMO, CAIO, CKO) menerima **Executive Brief** — bukan data mentah, bukan facts, bukan situations. Brief adalah ringkasan terkurasi yang siap dikonsumsi untuk pengambilan keputusan.

### ExecutiveBrief Specification

```typescript
interface ExecutiveBrief {
  id: string;
  executive: ExecutiveRole;
  generatedAt: string;
  period: { start: string; end: string };

  headline: string;                // "Hari ini ada 3 situasi kritis"
  overview: string;                // 2-3 paragraph executive summary

  sections: BriefSection[];        // critical, high, opportunity, status, knowledge
  actionItems: ActionItem[];
  pendingApprovals: ApprovalRequest[];
  executionStatus: ExecutionStatus[];
  relevantKnowledge: KnowledgeReference[];

  sourceSituations: string[];
  sourcePlans: string[];
  priority: number;
}

interface BriefSection {
  type: "critical" | "high" | "opportunity" | "status" | "knowledge";
  title: string;
  items: BriefItem[];
}

interface BriefItem {
  id: string;
  title: string;
  summary: string;
  severity: string;
  sourceId: string;
  financialImpact?: string;
  operationalImpact?: string;
  recommendation?: string;
  deadline?: string;
  requiredAction: "approve" | "review" | "decide" | "acknowledge" | "none";
}

interface ApprovalRequest {
  id: string;
  situationId: string;
  planId: string;
  title: string;
  summary: string;
  options: { id: string; label: string; description: string; estimatedImpact: string; risk: string; recommended: boolean }[];
  deadline: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
}

interface ExecutionStatus {
  planId: string;
  title: string;
  progress: number;
  status: string;
  completedNodes: number;
  totalNodes: number;
  estimatedCompletion: string;
  blockingIssues: string[];
}
```

### Executive Responsibilities (Only These Four)

| Responsibility | Description | Example |
|---------------|-------------|---------|
| **Leadership** | Memberikan arah dan visi | "Fokus pada pengurangan waste bulan ini" |
| **Communication** | Berkomunikasi dengan Founder, staff, dan sistem lain | "Melaporkan status stockout ke Founder" |
| **Approval** | Menyetujui atau menolak keputusan yang memerlukan otorisasi | "Menyetujui transfer stock 3kg dari Branch B" |
| **Delegation** | Mendelegasikan tugas ke layer bawah atau ke manusia | "Delegasikan investigasi discrepancy ke staff" |

### Executive NEVER

- Membaca database
- Menghitung KPI
- Menganalisis inventory mentah
- Menulis SQL
- Memanggil repository functions

---

## Layer 7 — Executive Council

### Purpose

Deliberasi multi-executive sebelum keputusan mencapai Founder. Memastikan setiap keputusan dievaluasi dari semua perspektif: operasional, finansial, marketing, dan sistem.

### Council Flow

```
Situation memerlukan perhatian Council
    ↓
Council Secretary (CKO) mendistribusikan brief
    ↓
Setiap executive mengirim posisi (setuju/tolak/modifikasi + rationale)
    ↓
Ada perbedaan pendapat? → Council debate (AI-facilitated)
    ↓
Konsensus tercapai? → Rekomendasi ke Founder
    ↓
Tidak ada konsensus? → Founder memutuskan (dissenting opinions didokumentasikan)
```

### CouncilSession Specification

```typescript
interface CouncilSession {
  id: string;
  situationId: string;
  title: string;
  summary: string;

  participants: CouncilMember[];
  requiredMembers: ExecutiveRole[];
  quorumCount: number;

  debate: { speaker: ExecutiveRole; statement: string; timestamp: string }[];
  positions: Map<ExecutiveRole, {
    stance: "approve" | "reject" | "modify";
    rationale: string;
    concerns: string[];
    confidence: number;
  }>;

  consensus: "unanimous" | "majority" | "split" | "none";
  recommendation?: string;

  votes: { executive: ExecutiveRole; vote: "yes" | "no" | "abstain"; rationale: string }[];
  finalVerdict: "approve" | "reject" | "modify" | "escalate_to_founder";

  founderReview?: { decision: string; notes: string; overrides?: string };

  status: "pending" | "deliberating" | "voting" | "resolved" | "escalated";
  createdAt: string;
  resolvedAt?: string;
}
```

### Council Rules

| Situation Type | Required Participants | Quorum | Escalation |
|---------------|---------------------|--------|------------|
| Stock Critical | COO, CFO | 2/2 | No |
| Revenue Drop > 20% | CEO, COO, CFO, CMO | 3/4 | If no consensus |
| Margin Crisis | CEO, CFO, COO | 2/3 | If > 5% drop |
| Price Change > 15% | CMO, CFO, CEO | 2/3 | If revenue impact > 10% |
| Cross-branch Expansion | CEO, CFO, CAIO | 2/3 | Founder always |
| System Architecture | CAIO | 1/1 | No (CAIO domain) |

---

## Layer 8 — Communication Runtime

### Purpose

Mengubah keputusan dan brief menjadi aksi nyata di dunia. Mengirim pesan, membuat notifikasi, memperbarui dashboard — dengan queue, retry, dan konfirmasi.

### Delivery Architecture

```
Brief / Notification
    ↓
Delivery Scheduler
    ↓
Delivery Queue (prioritized)
    ↓
Retry Engine (exponential backoff)
    ↓
Channel Adapter
    ↓
External Channel
    ↓
Confirmation Watcher
    ↓
Delivered / Failed
```

### DeliveryTask Specification

```typescript
interface DeliveryTask {
  id: string;
  type: "brief" | "alert" | "approval" | "notification" | "report";
  priority: number;                // 1 (highest) - 10 (lowest)

  content: {
    title: string;
    body: string;
    actions?: { label: string; action: string }[];
    attachments?: { name: string; url: string }[];
  };

  channel: "whatsapp" | "telegram" | "email" | "dashboard" | "notification";
  recipient: string;
  recipientRole?: string;

  scheduledAt: string;
  deadline: string;
  expiresAt?: string;

  status: "queued" | "sending" | "sent" | "delivered" | "failed" | "expired";
  attemptCount: number;
  maxRetries: number;
  lastError?: string;

  requireConfirmation: boolean;
  confirmedAt?: string;
  readAt?: string;

  sourceId: string;
  createdAt: string;
}
```

### Channel Capabilities

| Channel | Priority | Max Length | Reliability | Confirmation |
|---------|----------|------------|-------------|--------------|
| WhatsApp | Immediate | 1000 chars | Medium | Read receipt |
| Dashboard | Real-time | Unlimited | High | Page view |
| Telegram | Immediate | 4000 chars | Medium | Delivery receipt |
| Email | Standard | Unlimited | Medium | Open tracking |
| Notification | Immediate | 200 chars | High | Dismiss event |

---

## Governance Layer (Cross-cutting)

### Purpose

Setiap layer melewati validasi kebijakan, permission, dan compliance sebelum outputnya diteruskan ke layer berikutnya.

### Checks Per Layer

| Layer | Policy Check | Permission Check | Audit | Compliance |
|-------|-------------|-----------------|-------|------------|
| L0 | Event format | — | All events logged | Data retention |
| L1 | KPI definitions | — | Metric history | Data accuracy |
| L2 | Decision rules vetted | — | All situations logged | Regulatory |
| L3 | Strategy aligned with North Star | — | Strategy history | — |
| L4 | Plans within budget | Resource permissions | Plan audit | SOP compliance |
| L5 | Knowledge quality > 50% | — | Learning history | — |
| L6 | — | Role permissions | Access audit | — |
| L7 | Council rules | Quorum check | Council minutes | — |
| L8 | Message format | Channel permissions | Delivery history | Privacy |

### GovernancePolicy Specification

```typescript
interface GovernancePolicy {
  id: string;
  name: string;
  type: "permission" | "approval" | "compliance" | "audit";
  appliesTo: ExecutiveRole[];
  condition: string;               // When this policy applies
  action: "allow" | "deny" | "require_approval";
  reason: string;
}
```

### Example Policies

| ID | Name | Condition | Action | Reason |
|----|------|-----------|--------|--------|
| GOV-001 | COO cannot change prices | action === 'update_price' && role === 'COO' | deny | Harga wewenang CEO/CMO |
| GOV-002 | CFO cannot modify recipes | action === 'update_recipe' && role === 'CFO' | deny | Resep wewenang COO |
| GOV-003 | Large transfer needs CFO | action === 'transfer' && quantity > 5 && role === 'COO' | require_approval | Dampak cash flow |
| GOV-004 | Big price change needs Founder | action === 'update_price' && changePercent > 20 | require_approval | Perubahan signifikan |
| GOV-005 | COO auto-approve low stock | action === 'reorder' && severity === 'low' && role === 'COO' | allow | Operational efficiency |

---

## North Star Layer (Cross-cutting — Topmost)

### Purpose

Semua keputusan di semua layer dievaluasi terhadap tujuan bisnis. Tidak ada strategi yang dipilih tanpa North Star alignment.

### North Star Configuration

```typescript
interface NorthStarConfiguration {
  objectives: {
    id: string;
    name: string;                  // "Profitability"
    description: string;
    weight: number;                // Relative importance (total = 100)
    currentScore: number;          // 0-100
    targetScore: number;
    metrics: string[];             // KPI IDs that track this objective
  }[];
  updatedAt: string;
}
```

### Default North Star Objectives

| Objective | Weight | Description | Sample KPIs |
|-----------|--------|-------------|-------------|
| Profitability | 35 | Keuntungan bersih dan margin | Gross margin, Net profit, COGS ratio |
| Growth | 25 | Pertumbuhan revenue dan ekspansi | Revenue growth, Branch count, Customer count |
| Customer Satisfaction | 25 | Kepuasan pelanggan dan kualitas | Repeat rate, Complaint rate, Rating |
| Operational Excellence | 15 | Efisiensi operasional | Waste rate, Stockout rate, Shift compliance |

### North Star Evaluation

```typescript
interface NorthStarEvaluation {
  objectiveId: string;
  objectiveName: string;
  impact: "positive" | "negative" | "neutral";
  score: number;                   // -100 to +100
  rationale: string;
}

// Example: Strategy "Raise prices 10%"
// Profitability: +15
// Growth: -20
// Satisfaction: -25
// Excellence: 0
// TOTAL: -30 (weighted) → REJECTED

// Example: Strategy "Promo bundle + upsell"
// Profitability: +5
// Growth: +20
// Satisfaction: +15
// Excellence: +5
// TOTAL: +45 (weighted) → SELECTED
```

---

## Complete Data Flow — End to End

```
1. Kasir menjual Es Kopi Susu
2. Order Service → emit OrderCompleted event
3. Event Bus → Inventory Read Model updated (stock - 1)
4. BI Layer:
   a. Metric: currentStock = 350g
   b. Insight: stockCoverage = 2.3 hari
   c. Fact: "Stock coverage below minimum (2.3 < 3.0)"
5. Decision Engine:
   - Rule Engine: StockLow → Situation created
6. Strategy Engine:
   - "Arah: transfer stock dari branch terdekat"
   - Target: coverage kembali > 3 hari dalam 4 jam
7. Planner:
   - Graph: [CheckBranchB] → [NotifyCOO] → [Transfer] → [Verify]
8. Brief Generator:
   - COO Brief: "Stok Gula Aren Kritis — setujui transfer?"
9. COO Runtime:
   - Menerima brief → membaca ringkasan
   - Menyetujui transfer
10. Council: (hanya jika diperlukan, skip untuk stock low)
11. Communication Runtime:
    - WhatsApp ke Branch Manager: "Transfer 3kg dari Branch B"
    - Dashboard terupdate
12. Setelah selesai:
    - Episode Memory: "transfer dari Branch B berhasil"
    - Semantic Memory: "Branch B memiliki buffer stock"
    - Learning Engine: transfer success rate +1
```

---

## Implementation Order

| Phase | Layers | Duration | Key Deliverable |
|-------|--------|----------|-----------------|
| 2A | L0 Event Bus + L1 BI (Inventory) | 1 week | First BusinessFact produced from events |
| 2B | L0 Event Store + L1 BI (All domains) | 1 week | Full BI coverage across 5 domains |
| 2C | L2 Decision Engine (Rule Engine) | 1 week | First OperationalSituation auto-generated |
| 2D | L3 Strategy + L4 Planner | 1 week | First ExecutionGraph generated |
| 2E | L5 Knowledge & Learning | 1 week | System remembers and learns |
| 2F | L6 Brief Generator + L8 Communication | 1 week | COO receives formatted briefs |
| 2G | L7 Council + Governance + North Star | 1 week | Full governance operational |
| 2H | COO rewrite (first EIOS executive) | 1 week | COO runs entirely on EIOS |
| 2I | Remaining executives (CEO, CFO, CMO, CAIO, CKO) | 2 weeks | All executives on EIOS |
| 2J | Hardening, testing, documentation | 1 week | Production ready |

**Total**: ~11 weeks

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Event Bus menjadi bottleneck | Medium | Medium | Async processing, partitioned by domain |
| AI Decision Engine hallucinates | Medium | High | Always paired with Rule Engine as guard; Governance validates |
| Knowledge Platform grows unbounded | Low | Medium | Importance-based pruning; auto-archive after 30 days no use |
| Migration from current COO to EIOS COO regresses | Medium | High | Parallel run: compare outputs before switching |
| Council slows down urgent decisions | Medium | Medium | Routing rules: critical situations skip council, go direct to Founder |
| Layer abstraction adds latency | Low | Low | Cache layer; pre-compute common facts and situations |

---

## Estimated Component Count

| Layer | Components | Files |
|-------|-----------|-------|
| North Star | 3 | ~4 |
| Governance | 5 | ~9 |
| Layer 0 — Data Foundation | 4 | ~14 |
| Layer 1 — Business Intelligence | 5 | ~22 |
| Layer 2 — Decision Engine | 4 | ~16 |
| Layer 3 — Strategy Engine | 3 | ~10 |
| Layer 4 — Execution Planner | 4 | ~13 |
| Layer 5 — Knowledge & Learning | 4 | ~16 |
| Layer 6 — Executive Runtime | 4 | ~18 |
| Layer 7 — Executive Council | 3 | ~9 |
| Layer 8 — Communication Runtime | 4 | ~14 |

**Total**: ~145 files

---

## Conclusion

EIOS v4.0 bukan lagi AI Agent. Ini adalah **Enterprise Decision Intelligence Platform** dengan:

- **10 layer** yang terpisah tanggung jawabnya
- **Event-driven architecture** untuk skalabilitas
- **Dual-engine decision** (Rule + AI) untuk akurasi dan fleksibilitas
- **Multi-executive council** untuk keputusan yang matang
- **Knowledge platform** yang belajar dari pengalaman
- **North Star alignment** untuk konsistensi dengan tujuan bisnis
- **Governance** untuk keamanan dan compliance

Dengan fondasi ini, ketika Lumé's berkembang ke 10, 50, atau 200 cabang — atau menambahkan AI Executive baru — arsitektur tidak perlu diubah. Cukup tambahkan konfigurasi executive baru di Layer 6.
