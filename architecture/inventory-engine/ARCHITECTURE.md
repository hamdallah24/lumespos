# Inventory Engine — Architecture

## 1. Core Principle

**Inventory Engine is designed around inventory movements, not warehouses.**

Warehouse is only one attribute of inventory.

The engine answers one question:

> **"Where did every unit come from, where is it now, and where did it go?"**

Everything else — current stock, valuation, health metrics — is derived from movement history.

---

## 2. Movement Types

The engine supports exactly 12 movement types. Every inventory mutation maps to one of these:

| # | Movement Type | Direction | Description |
|---|---|---|---|
| 1 | `supplier_receipt` | In | Goods received from supplier against purchase order |
| 2 | `warehouse_transfer` | Internal | Movement between warehouses within same branch |
| 3 | `branch_transfer` | Internal | Movement between branches (central ↔ branch) |
| 4 | `sales_consumption` | Out | Stock consumed by POS sale |
| 5 | `recipe_consumption` | Out | BOM component consumed for production |
| 6 | `production_output` | In | Output from semi-finished production |
| 7 | `manual_adjustment` | In/Out | Manual stock correction (owner/manager) |
| 8 | `stock_opname` | In/Out | Physical count adjustment |
| 9 | `return_to_supplier` | Out | Return goods to supplier |
| 10 | `customer_return` | In | Customer returns goods |
| 11 | `waste_damage` | Out | Damaged/spoiled goods disposal |
| 12 | `expired_goods` | Out | Expired goods removal |

Every movement creates exactly one immutable Stock Card record.

---

## 3. Stock Card — The Heart

### Principle

**Never store "current stock" as the primary source of truth.**

`current_inventory` is a projection of Stock Card, not the source of truth.

### Why

- Current stock is always derivable: `SUM(qty_change) GROUP BY (branch_id, warehouse_id, item_type, item_id)`
- A Stock Card can be replayed from genesis to reconstruct any point-in-time snapshot
- Physical count reconciliation compares physical count against Stock Card projection, then creates a correction movement
- No row in Stock Card is ever updated or deleted

### Derivation

```sql
-- Current stock = sum of all movements
SELECT item_type, item_id, SUM(qty_change) AS current_stock
FROM stock_card
WHERE branch_id = $1
GROUP BY item_type, item_id;
```

The existing `current_inventory` table is retained as a **read cache (projection)** — updated after every Stock Card insert. The cache can be rebuilt at any time by replaying Stock Card.

### 3.1 Event-Sourced Architecture

Inventory is an **event-sourced operational engine**. Every inventory state must be reproducible from history.

```
Stock Card
    ↓
Movement History
    ↓
FIFO Layers
    ↓
Current Inventory (projection)
```

**Current inventory is never the primary truth.**
**Current inventory is only a cached projection.**

If the cache is deleted, Inventory must be able to rebuild itself entirely from Stock Card.

### 3.2 CQRS-lite: Read / Write Separation

```
┌──────────────────────────────────────────────────────────────┐
│                     Write Model                               │
│  Movement Engine                                              │
│       ↓                                                       │
│  Stock Card (append)                                          │
│       ↓                                                       │
│  FIFO Layers (consume/create)                                 │
│       ↓                                                       │
│  Event Store (publish)                                        │
│       ↓                                                       │
│  Projection (refresh cache)                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Read Model                               │
│  Current Inventory (cached)                                   │
│  Inventory Dashboard                                          │
│  Inventory Health                                             │
│  Warehouse Summary                                            │
│  Branch Summary                                               │
└──────────────────────────────────────────────────────────────┘
```

- **Only Movement Engine may write** to Stock Card, FIFO, and the projection cache.
- **All dashboard data reads projections** — never the raw Stock Card for aggregated views.
- The write path is a single transaction: Stock Card + FIFO + Event + Cache refresh.
- The read path is stateless: query the cache (current_inventory, precomputed summaries).

---

## 4. Data Model

### 4.1 `warehouses`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| branch_id | int FK→branches | |
| code | text | e.g. "WH-CENTRAL", "WH-BRANCH-A" |
| name | text | |
| type | text | 'central' \| 'branch' \| 'production' |
| is_active | boolean | default true |
| created_at | timestamptz | |

Every branch has at least one warehouse. A central warehouse is a warehouse where `branch_id` is the HQ branch.

### 4.2 `stock_card` — THE master table

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| branch_id | int FK→branches | NOT NULL |
| warehouse_id | int FK→warehouses | NOT NULL |
| item_type | text | 'ingredient' \| 'semi_finished' \| 'product' |
| item_id | int | FK to respective master table |
| movement_type | text | One of the 12 types above |
| direction | text | 'in' \| 'out' |
| qty_before | numeric(14,4) | |
| qty_change | numeric(14,4) | signed negative for 'out' |
| qty_after | numeric(14,4) | |
| value_before | numeric(14,2) | total cost before |
| value_change | numeric(14,2) | signed |
| value_after | numeric(14,2) | total cost after |
| unit_cost | numeric(14,2) | cost per unit at time of movement |
| reference_type | text | 'order' \| 'receipt' \| 'transfer' \| 'adjustment' \| 'production' |
| reference_id | int | |
| batch_id | text | optional lot/batch tracking |
| description | text | |
| created_by | int FK→users | |
| created_at | timestamptz | index |

**Indexes:**
- `(branch_id, warehouse_id, item_type, item_id, created_at DESC)` — stock card queries
- `(reference_type, reference_id)` — drill-down from source documents
- `(created_at)` — time-range queries

### 4.3 `fifo_layers` — Valuation only

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| branch_id | int FK→branches | |
| warehouse_id | int FK→warehouses | |
| item_type | text | |
| item_id | int | |
| quantity | numeric(14,4) | remaining qty |
| unit_cost | numeric(14,2) | per-unit cost |
| received_at | timestamptz | date of inbound movement |
| stock_card_id | int FK→stock_card | originating inbound movement |
| closed_at | timestamptz | when fully consumed |

**FIFO Layer is NOT operational history.** It exists only for valuation. The Stock Card remains the operational history.

When an outbound movement occurs, it consumes FIFO layers oldest-first. The consumed cost becomes the COGS.

### 4.4 `item_master` — Unified view

The existing `ingredients`, `semi_finished`, `products` tables remain. A database view `item_master` unions them:

```sql
CREATE VIEW item_master AS
SELECT id, 'ingredient' AS item_type, name, unit, cost_price_per_unit
FROM ingredients
UNION ALL
SELECT id, 'semi_finished', name, unit, cost_price_per_unit
FROM semi_finished
UNION ALL
SELECT id, 'product', name, 'pcs', price
FROM products WHERE deleted_at IS NULL;
```

This view is read-only. Each item type retains its own CRUD lifecycle.

### 4.5 Existing Tables (Retained)

| Table | Role |
|---|---|
| `current_inventory` | Read cache — refreshed after every Stock Card insert |
| `stock_adjustments` | Deprecated — new adjustments go through Stock Card. Retained for backward compatibility during migration. |
| `recipes` | BOM — unchanged |
| `ingredients` | Raw material master — add `warehouse_id`, `category_id` |
| `semi_finished` | Semi-finished master — add `warehouse_id`, `category_id` |
| `products` | Finished goods master — add `category_id` |

---

## 5. Inventory Movement Engine

The Movement Engine is the **only** code path that writes to Stock Card.

### Architecture

```
External Trigger (POS Order / API / UI)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              Inventory Movement Engine                  │
│                                                        │
│  1. Validate (stock sufficient, item exists)           │
│  2. Compute FIFO consumption (if outbound)             │
│  3. Write Stock Card row (immutable)                   │
│  4. Update FIFO Layers (consume/create)                │
│  5. Refresh projection cache (current_inventory)       │
│  6. Publish event to event_store                       │
│  7. Return result                                      │
│                                                        │
└───────────────────────────────────────────────────────┘
        │
        ├─── Stock Card (append-only — operational history)
        ├─── FIFO Layers (valuation only)
        ├─── current_inventory (projection cache)
        └─── event_store (event publishing)
```

### Movement Service (Single Entry Point)

```typescript
// Single function for ALL movement types
async function createMovement(params: {
  branchId: number;
  warehouseId: number;
  itemType: string;
  itemId: number;
  movementType: MovementType;
  quantity: number;            // positive number, direction derived from movementType
  referenceType?: string;
  referenceId?: number;
  description?: string;
  createdBy?: number;
  unitCost?: number;           // for inbound: the cost per unit
  batchId?: string;
}): Promise<StockCardEntry>
```

The `movementType` determines:
- Direction (in/out)
- Which FIFO layers to consume (outbound only)
- Which event to publish
- Which Finance accounts are affected (via event)

---

## 6. Branch + Warehouse Model

### Structure

```
┌─────────────────────────────────────────────────────┐
│                  Enterprise                           │
│  ┌──────────────────────────────────────────────┐   │
│  │          Central Warehouse                     │   │
│  │  (branch_id = HQ, type = 'central')           │   │
│  └─────────────────────┬────────────────────────┘   │
│                        │                              │
│         ┌──────────────┼──────────────┐               │
│         ▼              ▼              ▼               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │ Branch A   │  │ Branch B   │  │ Branch C   │        │
│  │ Warehouse  │  │ Warehouse  │  │ Warehouse  │        │
│  └───────────┘  └───────────┘  └───────────┘         │
│         │              │              │               │
│         ▼              ▼              ▼               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │  Sales     │  │  Sales     │  │  Sales     │        │
│  └───────────┘  └───────────┘  └───────────┘         │
└─────────────────────────────────────────────────────┘
```

### Inventory Visibility

- Inventory quantities are **always branch-aware**.
- A query for "stock of item X" must specify a branch (or request aggregation).
- Global inventory is an aggregation of branch inventory.
- Branch inventory is the operational view.

---

## 7. Finance Integration — Separation Principle

**Inventory must never create accounting journals.**

```
Sales
  │
  ▼
Inventory Movement Engine
  │
  ├── Consume FIFO layers
  ├── Write Stock Card
  ├── Refresh current_inventory cache
  └── Publish event ──────────────────────► event_store
                                              │
                                              ▼
                                    Finance Event Consumer
                                              │
                                              ├── Create finance_transaction
                                              ├── Create journal_entries
                                              ├── Create ledger_entries
                                              └── Update financial_snapshots
```

**This separation must never be violated.**

### Event → Journal Mapping

| Event | Finance Debit | Finance Credit |
|---|---|---|
| `inventory.sales_consumed` | COGS (5000) | Inventory (1400/1410) |
| `inventory.supplier_receipt` | Inventory (1400/1410) | AP / Purchases (6100) |
| `inventory.return_to_supplier` | AP / Purchases (6100) | Inventory (1400/1410) |
| `inventory.customer_return` | Inventory (1400/1410) | COGS (5000) — reversal |
| `inventory.waste_damage` | Loss Expense (5100) | Inventory (1400/1410) |
| `inventory.expired_goods` | Loss Expense (5100) | Inventory (1400/1410) |
| `inventory.stock_opname` | Loss Expense (5100) or Inventory (1400/1410) | Depends on direction |
| `inventory.manual_adjustment` | Loss Expense (5100) or Inventory (1400/1410) | Depends on direction |

Detailed payloads in `finance-integration-contract.md`.

---

## 8. Module Structure

```
artifacts/api-server/src/inventory/
├── services/
│   ├── movementService.ts        # SINGLE entry point for all stock movements
│   ├── stockCardService.ts       # Stock Card read queries (paginated)
│   ├── fifoCostingService.ts     # FIFO layer create/consume/query (valuation only)
│   ├── warehouseService.ts       # Warehouse CRUD
│   ├── queryService.ts           # Current stock, valuation, health, low-stock
│   └── itemMasterService.ts      # Unified item queries (view-based)
├── routes/
│   ├── inventory.ts              # Existing enhanced routes
│   ├── stockCard.ts              # GET /inventory/stock-card/:itemType/:itemId
│   ├── warehouse.ts              # CRUD /inventory/warehouses
│   ├── movement.ts               # POST /inventory/movements (admin)
│   └── valuation.ts              # GET /inventory/valuation
├── events/
│   └── inventoryEventPublisher.ts # Publishes events to event_store (Finance integration)
└── index.ts                      # Barrel exports

artifacts/api-server/src/finance/services/
├── inventoryEventConsumer.ts      # NEW: consumes inventory events → creates journals
└── (No direct inventory table access)

artifacts/pos-app/src/modules/inventory/
├── pages/
│   ├── StockCardPage.tsx         # Per-item movement log
│   ├── StockMovementPage.tsx     # Manual movement entry form
│   ├── WarehouseManagement.tsx   # Warehouse CRUD
│   └── InventoryDashboard.tsx    # Valuation + health
├── types/index.ts
├── hooks/useInventory.ts
└── components/
    ├── StockCardTable.tsx
    ├── MovementForm.tsx
    └── ValuationSummary.tsx
```

---

## 9. Phase P0 — Scope

Phase P0 is complete only when ALL of the following exist:

| Component | Deliverable |
|---|---|---|
| Item Master | Unified view across ingredients, semi-finished, products. CRUD APIs. |
| Warehouse Master | `warehouses` table. CRUD APIs. Every branch gets a default warehouse on creation. |
| Branch Warehouse | Warehouse-branch association. UI to manage. |
| Stock Card | `stock_card` table. Append-only write service. Paginated query API. |
| FIFO Layer | `fifo_layers` table. Create on inbound. Consume on outbound. Query for valuation. |
| Movement Engine | Single `createMovement()` entry point handling all 12 movement types. Validation, card write, FIFO update, cache refresh, event publish. |
| BOM Consumption | Multi-level recipe explosion. Compute component costs via FIFO. |
| Inventory Projection Cache | `current_inventory` maintained as read cache, refreshed by Movement Engine after every write. |
| Projection Rebuild Tool | CLI or API endpoint that rebuilds ALL projections from Stock Card: `Rebuild Current Inventory`, `Rebuild FIFO Layers`. Must be executable on demand. |
| Inventory → Finance Events | All 12 event types published to `event_store`. |
| Finance Event Consumer | Consumes events, creates transactions + journal entries + ledger entries. |

### P0 Certification Gate

P0 is complete only if ALL conditions below are true:

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

A manually executable projection rebuild is mandatory.

```
npm run inventory:rebuild-projections
# or
POST /api/inventory/rebuild-projections
```

Executing this command must:
1. Truncate `current_inventory`
2. Replay every row in `stock_card` ordered by `id`
3. Reconstruct `current_inventory` to match `SUM(qty_change)` per `(branch_id, warehouse_id, item_type, item_id)`
4. Rebuild FIFO layers from inbound movements

After P0 is certified, P1 (goods receipt workflow, stock transfer workflow, return workflows) and P2 (health dashboard, categories, UOM) follow.
