# ADR-003: Inventory Owns Data, Finance Reads via Events — Separation Enforcement

## Status

Accepted

## Context

Finance Core (v1.0, LOCKED) needs COGS and inventory valuation data from Inventory Engine. Two non-negotiable constraints:

1. **Finance schema must not change (Lock Policy).**
2. **Inventory must never create accounting journals.** Finance is the only module allowed to create `finance_transactions`, `journal_entries`, and `ledger_entries`.

## Decision

**Inventory Engine owns all inventory tables.** Inventory publishes business events to `event_store`. Finance subscribes to those events and creates the corresponding accounting entries.

### Separation Enforcement

The following rules are enforced by architecture and code review:

1. `movementService.createMovement()` does NOT import any Finance module.
2. Inventory's `package.json` does not depend on `@workspace/finance-services` or equivalent.
3. Finance `inventoryEventConsumer` is the ONLY code path that creates inventory-related journal entries.
4. Any PR where Inventory code imports from Finance is rejected.

### Event Contract

| Event | Trigger | Payload | Finance Action |
|---|---|---|---|
| `inventory.sales_consumed` | POS order completed | `{ orderId, branchId, totalCogs, items[], date }` | Debit COGS (5000), Credit Inventory (1400/1410) |
| `inventory.supplier_receipt` | Goods received from supplier | `{ receiptId, branchId, supplier, items[], totalAmount }` | Debit Inventory (1400/1410), Credit AP/Purchases (6100) |
| `inventory.branch_transfer` | Transfer between branches | `{ transferId, fromBranch, toBranch, items[] }` | Reclassify between branch inventory accounts |
| `inventory.warehouse_transfer` | Transfer within branch | `{ transferId, fromWarehouse, toWarehouse, items[] }` | None (no value change) |
| `inventory.recipe_consumed` | BOM components consumed | `{ productionBatchId, branchId, items[], totalCost }` | Debit WIP, Credit Inventory |
| `inventory.production_output` | Production output received | `{ productionBatchId, branchId, itemType, itemId, qty, unitCost }` | Debit Inventory (1410), Credit WIP |
| `inventory.manual_adjustment` | Owner/manager adjustment | `{ adjustmentId, branchId, items[], direction }` | Debit/Credit Loss/Gain, Credit/Debit Inventory |
| `inventory.stock_opname` | Physical count result | `{ opnameId, branchId, items[], discrepancies[] }` | Debit/Credit Loss/Gain as needed |
| `inventory.return_to_supplier` | Return goods to vendor | `{ returnId, branchId, items[], totalAmount }` | Debit AP (6100), Credit Inventory |
| `inventory.customer_return` | Customer returns goods | `{ returnId, branchId, items[], totalCogs }` | Debit Inventory, Credit COGS (5000) |
| `inventory.waste_damage` | Waste/damage disposal | `{ adjustmentId, branchId, items[], totalCost }` | Debit Loss (5100), Credit Inventory |
| `inventory.expired_goods` | Expired goods disposal | `{ adjustmentId, branchId, items[], totalCost }` | Debit Loss (5100), Credit Inventory |
| `inventory.valuation_snapshot` | Periodic/triggered | `{ branchId, totalValue, asOfDate }` | Update `financial_snapshots.inventory` |

### Implementation

- Inventory publishes events by inserting into `event_store` within the same DB transaction as the Stock Card write.
- Finance consumes events via `inventoryEventConsumer` (polling).
- The consumer creates `finance_transactions` → `journal_entries` → `ledger_entries`.
- Idempotency: Each event is processed at most once, tracked by event `sequence`.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| **Direct DB reads** (Finance reads `current_inventory`) | Creates coupling, violates Finance Lock |
| **Synchronous API call** (Inventory calls Finance) | Distributed transaction risk, tight coupling |
| **Shared DB transaction** (same tx writes both) | Couples schemas, violates separation principle |

## Consequences

- **Positive:** Loose coupling; Finance remains locked; event-sourced architecture; journal separation is enforced.
- **Negative:** Eventual consistency (sub-second delay); consumer must handle replay and idempotency.
- **Operational:** Reconciliation job runs nightly to verify COGS totals match between Inventory events and Finance journal entries.

## Trade-offs

Decoupling and schema stability are prioritised over strong consistency.
