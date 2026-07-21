# ADR-002: Goods Receipt Triggers Inventory Movement

## Status

Accepted

## Context

When goods are received from a supplier, inventory stock must increase. Inventory Engine v1.0 is LOCKED and only accepts movements through `InventoryMovementEngine.createMovement()`.

## Decision

Goods Receipt completion calls `InventoryMovementEngine.createMovement()` with `movementType = "supplier_receipt"`. This is the only code path that translates a purchasing event into an inventory stock increase.

### Flow

```
Purchasing: Goods Receipt completed
Purchasing: publish goods.received event
    │
    ▼
Purchasing Receiver Service:
    └── Call InventoryMovementEngine.createMovement({
          movementType: "supplier_receipt",
          itemType, itemId, quantity, unitCost,
          referenceType: "goods_receipt", referenceId
        })
            ├── Stock Card (append)
            ├── FIFO Layer (create)
            ├── Projection Cache (update)
            └── Event Store (publish)
```

## Consequences

- + Inventory remains the immutable source of stock truth
- + Goods receipt creates auditable FIFO cost layers
- + PO `quantity_received` is updated for partial receipt tracking
- - Purchasing must call Inventory engine synchronously

## Trade-offs

Inventory integrity is prioritised over loose coupling between Purchasing and Inventory.
