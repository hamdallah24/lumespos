# ADR-005: Stock Card as Single Source of Truth for Quantities

## Status

Accepted

## Context

The existing system stores current stock in `current_inventory.current_stock` and treats it as the primary source of truth. This has several failure modes:

1. **No audit trail:** If `current_stock` is wrong, there is no way to determine how it became wrong.
2. **Concurrent mutation bugs:** Two simultaneous movements can race — both read the same `current_stock`, both compute `new_stock`, and the second write overwrites the first without accounting for the first's change.
3. **No point-in-time queries:** Cannot answer "what was the stock on date X?"
4. **Reconciliation is impossible:** Physical count reveals a discrepancy, but there is no immutable log to replay and identify the source.

## Decision

**Stock Card is the single source of truth for all inventory quantities.**

`current_inventory` is demoted to a read cache — refreshed after every Stock Card insert.

### How It Works

1. Every inventory mutation calls `movementService.createMovement()`.
2. `createMovement()` writes exactly one row to `stock_card` (append-only).
3. After the Stock Card write succeeds, `current_inventory` is refreshed:
   - `INSERT ... ON CONFLICT DO UPDATE` setting `current_stock = (SELECT SUM(qty_change) FROM stock_card WHERE ...)`
4. All read queries read from `current_inventory` (fast, indexed).
5. If the cache is ever corrupted, it can be rebuilt entirely from Stock Card:

```sql
TRUNCATE current_inventory;
INSERT INTO current_inventory (branch_id, warehouse_id, item_type, item_id, current_stock)
SELECT branch_id, warehouse_id, item_type, item_id, SUM(qty_change)
FROM stock_card
GROUP BY branch_id, warehouse_id, item_type, item_id;
```

### Current Stock Derivation

```typescript
// In queryService.ts
async function getCurrentStock(branchId: number, warehouseId: number, itemType: string, itemId: number): Promise<number> {
  const [row] = await db
    .select({ stock: sql<number>`COALESCE(SUM(qty_change), 0)` })
    .from(stockCardTable)
    .where(and(
      eq(stockCardTable.branchId, branchId),
      eq(stockCardTable.warehouseId, warehouseId),
      eq(stockCardTable.itemType, itemType),
      eq(stockCardTable.itemId, itemId),
    ));
  return row?.stock ?? 0;
}
```

In practice, the cached `current_inventory` table is used for reads. The derivation query above is only used for cache rebuild or verification.

### Concurrency

Stock Card writes use PostgreSQL `SERIALIZABLE` isolation for the critical section:

```typescript
await db.transaction(async (tx) => {
  const lastRow = await tx.select()
    .from(stockCardTable)
    .where(...)
    .orderBy(desc(stockCardTable.id))
    .limit(1)
    .forUpdate();  // lock the last row

  const qtyBefore = lastRow[0]?.qty_after ?? 0;
  const qtyAfter = qtyBefore + (direction === 'out' ? -qty : qty);

  await tx.insert(stockCardTable).values({
    qty_before: qtyBefore,
    qty_change: direction === 'out' ? -qty : qty,
    qty_after: qtyAfter,
    // ...
  });

  await tx.update(currentInventoryTable)
    .set({ current_stock: qtyAfter })
    .where(...);
});
```

The `FOR UPDATE` lock prevents race conditions on concurrent movements for the same item.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| **Keep `current_inventory` as source of truth** | No audit trail, no point-in-time, no reconciliation |
| **Use PostgreSQL temporal tables** | Vendor-specific, complex query patterns, migration burden |
| **Event sourcing without cache** | Every stock read would require SUM over all history — slow at scale |

## Consequences

- **Positive:** Full audit trail; point-in-time queries; reconciliation is straightforward; cache rebuild is deterministic.
- **Negative:** Write path requires `FOR UPDATE` lock (contention under high concurrency for the same item).
- **Mitigation for contention:** For high-volume items (e.g., best-selling products), consider batch-committing movements every N seconds rather than per-transaction.

## Trade-offs

Audit integrity and data correctness are prioritised over peak write throughput.
