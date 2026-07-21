# ADR-004: Phased Implementation

## Status

Accepted (Revised)

## Context

The full Inventory Engine scope is large. Building everything at once risks delays and integration complexity. However, Phase 0 must produce a complete, stable foundation — not a subset of features.

## Decision

Deliver in 3 phases. Phase 0 is complete only when ALL components listed below are stable, tested, and deployed.

---

## Phase P0 — Core Engine

**Goal:** Inventory Movement Engine is operational. Stock Card is the source of truth. FIFO valuation is accurate. Finance receives COGS events.

### Components (ALL required)

| # | Component | Deliverable |
|---|---|---|
| 1 | **Item Master** | Unified view across ingredients, semi-finished, products. CRUD APIs. |
| 2 | **Warehouse Master** | `warehouses` table. CRUD APIs. Default warehouse per branch on creation. |
| 3 | **Branch Warehouse** | Warehouse-branch association. UI to manage. |
| 4 | **Stock Card** | `stock_card` table. Append-only write service. Paginated, filterable query API. |
| 5 | **FIFO Layer** | `fifo_layers` table. Create on inbound. Consume oldest-first on outbound. Query for valuation. |
| 6 | **Movement Engine** | Single `createMovement()` handling ALL 12 movement types. Validation, card write, cache refresh, event publish. |
| 7 | **BOM Consumption** | Multi-level recipe explosion. Component costs via FIFO. |
| 8 | **Inventory Projection Cache** | `current_inventory` maintained as read cache, refreshed after every movement. |
| 9 | **Projection Rebuild Tool** | CLI/API tool that rebuilds all projections from Stock Card. Must be executable on demand. |
| 10 | **Inventory → Finance Events** | All 12 movement types publish typed events to `event_store`. |
| 11 | **Finance Event Consumer** | Consumes events, creates `finance_transactions`, `journal_entries`, `ledger_entries`. No direct Inventory→Finance coupling. |

### P0 Gate

P0 is NOT complete until:
- All 11 components above are deployed to production (VPS)
- Stock Card contains real movement history from at least 1 full POS sale cycle
- Finance `financial_snapshots.inventory` is populated from FIFO valuation
- Projection Rebuild Tool has been executed and verified (truncate cache → rebuild → verify stock matches before/after)
- Manual test: create sale → verify Stock Card entries → verify COGS journal entry in Finance

### P0 Checklist

- [ ] Item Master
- [ ] Warehouse Master
- [ ] Branch Warehouse
- [ ] Stock Card
- [ ] FIFO Layer
- [ ] Movement Engine
- [ ] Inventory Projection Cache
- [ ] Projection Rebuild Tool
- [ ] Inventory → Finance Events
- [ ] Finance Event Consumer

---

## Phase P1 — Operational Workflows

**Goal:** Formal inbound receiving and inter-branch workflows with approval lifecycle.

### Components

| # | Component | Deliverable |
|---|---|---|
| 1 | Goods Receipt Workflow | `supplier_receipt` with goods receipt document, approval, PO matching |
| 2 | Stock Transfer Workflow | `branch_transfer` with request → ship → receive lifecycle |
| 3 | Return Workflows | `return_to_supplier` and `customer_return` with document trail |
| 4 | Stock Opname | `stock_opname` with physical count sheet, discrepancy report |
| 5 | Goods Receipt UI | Multi-line receiving form with supplier, items, costs |
| 6 | Stock Transfer UI | Inter-branch transfer form with status tracking |

---

## Phase P2 — Operational Visibility

**Goal:** Real-time inventory health dashboards.

### Components

| # | Component | Deliverable |
|---|---|---|
| 1 | Categories | `categories` table, hierarchical, per-branch |
| 2 | Units of Measure | `units_of_measure` table, conversions |
| 3 | Migrate existing items | Add `category_id`, `warehouse_id` to ingredients, semi_finished |
| 4 | Low-stock alerts | Threshold-based, real-time |
| 5 | Dead stock detection | Items with zero movement in N days |
| 6 | Turnover metrics | Inventory turnover ratio per item/category |
| 7 | Valuation dashboard | Current total inventory value, COGS to-date, margin analysis |

---

## Alternatives Considered

- **Big-bang delivery:** Risk of delayed timelines and integration issues.
- **P0 without warehouse:** Would require schema migration in P1 (rejected — warehouse is fundamental to movement model).
- **FIFO in P1, Stock Card in P0:** Would split valuation from operational history (rejected — they must ship together to avoid reconciliation debt).

## Consequences

- **Positive:** P0 delivers a production-grade engine; P1 and P2 add workflow and visibility without architectural churn.
- **Negative:** P0 is larger than initially scoped; requires more upfront work.
- **Risk:** If P0 scope creeps further, splitting P0 into P0a/P0b is acceptable provided the Stock Card + Movement Engine ship in P0a.

## Trade-offs

A complete, stable foundation in P0 is prioritised over faster initial delivery.
