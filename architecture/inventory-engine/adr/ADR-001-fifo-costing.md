# ADR-001: FIFO Costing Over Moving Average

## Status

Accepted

## Context

The existing inventory system uses moving average costing — whenever stock is received with a purchase price, the ingredient's `cost_price_per_unit` is recalculated as a weighted average of old and new stock. While simple, this approach has limitations:

1. **COGS accuracy:** Moving average smooths cost fluctuations. When ingredient prices rise, COGS understates the actual cost of goods sold (old cheap stock averaged with new expensive stock).
2. **Audit complexity:** The cost history is lost — only the current blended cost is stored.
3. **Non-compliance:** Standard accounting practice (PSAK 14 / IAS 2) permits FIFO or weighted average, but FIFO provides better matching of revenue with actual costs.

## Decision

Implement FIFO cost layers as the primary costing method. Moving average is retained as a display-only field.

- Each inbound stock movement (goods receipt, production output) creates one or more FIFO layers storing `(quantity, unit_cost, received_at)`.
- Each outbound movement (sales consumption, production consumption, transfer, adjustment) consumes from the oldest FIFO layer first.
- When a layer is fully consumed, it is marked as closed.
- The total inventory value at any time is `SUM(qty × unit_cost)` across all open layers.
- COGS for a sale is the sum of `consumed_qty × unit_cost` from the layers that supplied it.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Moving Average (current)** | Simple, single cost per item | Hides cost volatility, less accurate COGS |
| **LIFO** | Better matching for rising costs | Not permitted under IFRS/IAS 2, complex |
| **Specific Identification** | Perfect traceability | Impractical for high-volume ingredients |

## Consequences

- **Positive:** More accurate COGS matching; better audit trail; IFRS-compliant.
- **Negative:** Additional table (fifo_layers) and write overhead per consumption.
- **Migration:** Existing moving-average cost values become the initial FIFO layer. On first migration, all current stock is seeded as one layer with `cost = current_stock × cost_price_per_unit`.

## Trade-offs

Accuracy and auditability are prioritised over computational simplicity.
