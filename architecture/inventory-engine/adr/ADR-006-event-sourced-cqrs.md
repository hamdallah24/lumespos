# ADR-006: Event-Sourced Inventory with CQRS-lite

## Status

Accepted

## Context

Inventory Engine must be a fully reproducible operational engine. Every inventory state must be derivable from movement history. This has three implications:

1. **Current stock must be rebuildable from scratch** — if the cache is deleted, Inventory must reconstruct itself from Stock Card.
2. **Reads must never write** — query paths should be projection-based, not operationally coupled to the write path.
3. **Write path must be a single atomic transaction** — Stock Card, FIFO layers, event publishing, and cache refresh must succeed or fail together.

## Decision

Implement an **event-sourced operational engine** with **CQRS-lite** (Command Query Responsibility Segregation, lightweight version).

### Event-Sourced

- Stock Card is the event store for inventory operations.
- Every movement is an event row in Stock Card.
- Current inventory, FIFO layers, and all aggregated views are **projections** of Stock Card.
- Projections can be rebuilt at any time by replaying Stock Card from genesis.

### CQRS-lite

| Aspect | Write Model | Read Model |
|---|---|---|
| Entry point | `movementService.createMovement()` | `queryService.getCurrentStock()` etc. |
| Tables written | `stock_card`, `fifo_layers`, `current_inventory`, `event_store` | None |
| Tables read | Stock Card (FOR UPDATE lock) | `current_inventory`, precomputed summaries |
| Concurrency | Serialized via `FOR UPDATE` on last Stock Card row | No locks — read from cache |
| Transaction | Single DB transaction | No transaction |
| Cache | Updates projection after every write | Reads projection |

### Why CQRS-lite (not full CQRS)

Full CQRS would require separate read databases, asynchronous projection updates, and eventual consistency on every read. For a POS system where:

- Write throughput is moderate (hundreds of movements per hour, not millions)
- Read latency requirements are low (sub-100ms is fine)
- Strong consistency on current stock is often desirable

...a lightweight approach is appropriate: same database, same transaction for the write path, but a separate read cache that is updated synchronously within the write transaction.

### Projection Rebuild Tool

A mandatory CLI/API tool must exist:

```bash
# Rebuild all projections from Stock Card
npm run inventory:rebuild-projections

# Or via API
POST /api/inventory/rebuild-projections
```

The tool:
1. Truncates `current_inventory`
2. Replays every Stock Card row ordered by `id` ASC
3. Recomputes `current_inventory` as `SUM(qty_change)` per `(branch_id, warehouse_id, item_type, item_id)`
4. Rebuilds FIFO layers from inbound Stock Card rows
5. Logs the rebuild to `finance_audit_logs`

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| **Full CQRS (separate read DB)** | Overengineered for this scale; added operational complexity for marginal benefit |
| **No caching (always SUM stock_card)** | Every stock read would scan entire movement history — slow at scale |
| **Inventory as CRUD (update in place)** | Loses audit trail; cannot rebuild; not event-sourced |

## Consequences

- **Positive:** Fully reproducible from history; read/write separation simplifies reasoning; projection rebuild is deterministic.
- **Negative:** Slightly more complex write path (must update projection); `FOR UPDATE` lock contention under high concurrency for the same item.
- **Mitigation for contention:** For extreme edge cases (thousands of movements per second for one item), batch-commit before the Movement Engine. Not required at current scale.

## Trade-offs

Data integrity and reproducibility are prioritised over peak write throughput.
