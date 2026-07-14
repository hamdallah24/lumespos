# Executive Knowledge Architecture

**Version:** 1.0.0  
**Status:** Architecture v4.1  
**Last Updated:** 2026-07-13

---

## Knowledge Types

| Type | Description | Source | Storage |
|------|-------------|--------|---------|
| Domain | Business domain facts (products, branches, inventory) | Foundation, COO operations | KnowledgePlatform |
| Operational | Day-to-day operational data (sales, stock, shifts) | COO, Executions | Episodes |
| Strategic | Long-term plans, goals, directives | CEO, Foundation directives | Directives |
| Procedural | How-to knowledge, best practices, SOPs | CKO curation, COO learnings | KnowledgePlatform |
| Historical | Past decisions, outcomes, episodes | All executives | Episodes |
| External | Market data, customer insights, trends | CMO, external sources | KnowledgePlatform |
| Runtime | System health, pipeline metrics, audit trails | EIOS Runtime | MetricsEngine, Audit |

---

## 1. Domain Knowledge

**Owner:** Foundation + COO operations
**Purpose:** Business domain facts — what exists, where, and how things work.

### Sources
- Foundation provider (`getFoundationProvider().getFoundationContext()`)
- Operational data via COO
- Branch configurations
- Product catalogs
- Recipe structures

### Usage
- CEO: Strategic context
- CTO: Technical architecture context
- CFO: Financial structuring
- COO: Daily operations

---

## 2. Operational Knowledge

**Owner:** COO + CKO
**Purpose:** Day-to-day operational data — what happened, what's happening now.

### Sources
- COO executions (inventory, sales, expenses)
- Branch operations
- Shift records
- Stock movements

### Storage
- `KnowledgeProvider.ingestEpisode()` with `eventType` matching action name
- Tags: `["coo", "operations", actionName]`

### Usage
- COO: Current status, approval decisions
- CEO: High-level operational summaries
- CFO: Cost context

---

## 3. Strategic Knowledge

**Owner:** CEO + Foundation
**Purpose:** Long-term direction — where the business is going and why.

### Sources
- CEO directives from Foundation provider
- CEO decisions and delegations
- Strategic plans from PlanProvider

### Storage
- Foundation directives (cached)
- Knowledge episodes with `eventType: "ceo_decision"`
- Plans from PlanProvider

### Usage
- CEO: All strategic decisions
- CTO: Technical roadmap alignment
- All: Context for decision-making

---

## 4. Procedural Knowledge

**Owner:** CKO
**Purpose:** How to do things — best practices, SOPs, learning materials.

### Sources
- CKO advisory via `consultantRuntime`
- CKO knowledge curation
- Best practices from Knowledge Platform (`KnowledgeProvider.getBestPractices()`)
- Council learnings from `councilSessionManager`

### Storage
- KnowledgePlatform procedural blocks
- Best practice records

### Usage
- All executives: Reference for correct approaches
- CKO: Curated recommendations

---

## 5. Historical Knowledge

**Owner:** All executives (recorded), CKO (curated)
**Purpose:** What happened in the past — decisions made, outcomes achieved.

### Sources
- Every executive's `KnowledgeProvider.ingestEpisode()` call
- Audit trail from `auditEngine.log()`
- Pipeline audit from `PipelineAudit`

### Storage
- Knowledge episodes (append-only)
- Audit logs (immutable)

### Episode Types
| eventType | Recording Executive |
|-----------|-------------------|
| `ceo_decision` | CEO |
| `cto_execution` | CTO |
| `cfo_execution` | CFO |
| `cmo_execution` | CMO |
| `caio_execution` | CAIO |
| `cko_advisory` | CKO |
| `approval` | COO |
| `rejection` | COO |
| `escalation` | COO |
| `{action_name}` | COO |

### Usage
- Context for future decisions
- Learning from past outcomes
- Audit and compliance
- Performance analysis

---

## 6. External Knowledge

**Owner:** CMO + CKO
**Purpose:** Market context — what's happening outside the business.

### Sources
- CMO market analysis
- Customer insights
- Trend data
- External research (manual input)

### Storage
- Knowledge episodes with `domain: "market"`
- Knowledge Platform searchable blocks

### Usage
- CEO: Strategic context
- CMO: Campaign planning
- All: Decision context

---

## 7. Runtime Knowledge

**Owner:** EIOS Runtime
**Purpose:** System health, pipeline metrics, trace data, audit trails.

### Sources
- `RuntimeFacade.health()` — 8-dimension health scoring
- `RuntimeFacade.metrics()` — MetricsEngine counters
- `RuntimeFacade.trace()` — TraceManager spans
- `PipelineAudit` — pipeline execution audit
- `RuntimeGovernance` — governance check results

### Storage
- MetricsEngine (in-memory counters and gauges)
- TraceManager (span trees)
- PipelineAudit (execution audit log)

### Usage
- CAIO: System health monitoring
- All executives: Execution context
- RuntimeGovernance: Self-healing decisions

---

## Knowledge Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE PLATFORM                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Domain    │  │Procedural│  │ Historical│  │ External │   │
│  │ Knowledge │  │Knowledge │  │ Knowledge │  │Knowledge │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  Functions:                                                 │
│  - searchAll(query) → KnowledgeBlock[]                      │
│  - getLatestEpisodes(n) → Episode[]                         │
│  - getStats() → { total, semantic, episode, procedural }    │
│  - ingestEpisode(event) → void                              │
│  - getBestPractices() → BestPractice[]                      │
└────────────────────────┬───────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │Executive A │ │Executive B │ │Executive C │
   │Read/Write  │ │Read/Write  │ │Read/Write  │
   └────────────┘ └────────────┘ └────────────┘
```

---

## Knowledge Access Patterns

### Reading Knowledge
```typescript
// Search for relevant knowledge
const knowledge = KnowledgeProvider.searchAll(query);

// Get recent history
const episodes = KnowledgeProvider.getLatestEpisodes(5);

// Get platform stats
const stats = KnowledgeProvider.getStats();

// Get best practices
const bestPractices = KnowledgeProvider.getBestPractices();
```

### Writing Knowledge
```typescript
// Record an episode after execution
KnowledgeProvider.ingestEpisode({
  eventType: "cto_execution",
  eventId: `CTO-${Date.now()}`,
  context: task.message.slice(0, 500),
  outcome: "success",
  domain: "technology",
  topic: spec.objective || "technical_analysis",
  summary: `CTO analysis completed`,
  tags: ["cto", "technical", spec.intent],
});
```

---

## Knowledge Platform Stats

The CAIO uses `KnowledgeProvider.getStats()` to monitor knowledge health:
```typescript
interface KnowledgeStats {
  total: number;         // Total knowledge blocks
  semantic: number;      // Semantic blocks
  episode: number;       // Episode blocks
  procedural: number;    // Procedural blocks
  learning?: {
    confirmed: number;   // Confirmed learnings
    proposed: number;    // Proposed learnings
    rejected: number;    // Rejected learnings
  };
}
```
