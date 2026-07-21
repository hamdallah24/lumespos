# Finance-Inventory Integration Contract

## Status

Adopted — applies to Finance Core v1.0 (LOCKED) and Inventory Engine (IN DEVELOPMENT).

## Invariant

**Finance Core schema and architecture are frozen.** All integration must occur through:

## Cardinal Rule — Journal Separation

**Inventory must never create accounting journals.**

Inventory only publishes business events to `event_store`.

Finance is the only module allowed to create `finance_transactions`, `journal_entries`, and `ledger_entries`.

This separation is non-negotiable. It exists because:

1. **Finance Core v1.0 is LOCKED** — Inventory must not introduce coupling into Finance.
2. **Single source of truth for accounting** — All journal entries flow through the Finance engine's validation rules, period checks, and audit trail.
3. **Idempotency** — Finance controls event replay and deduplication. If Inventory wrote journals directly, replay would create duplicates.
4. **Boundary enforcement** — Bugs in Inventory must never produce incorrect journal entries without Finance validation.

### Enforced By

- `movementService.createMovement()` does NOT import or call any Finance module.
- Inventory's `package.json` does not depend on Finance.
- Finance `inventoryEventConsumer` is the ONLY code path that creates inventory-related journal entries.
- Code review gate: any PR where Inventory code imports from Finance is rejected.

### Integration must occur through:

1. **`event_store`** — Inventory publishes events; Finance consumes them.
2. **`financial_snapshots`** — Inventory writes valuation snapshots to this existing table.
3. **`orders.total_cogs`** — Already populated by POS order flow (existing field).

---

## 1. Chart of Accounts — Inventory-Related

These accounts must exist for Inventory→Finance integration. Create via standard COA initialization if not present:

| Code | Name | Type | Normal Balance |
|---|---|---|---|
| 1400 | Persediaan Bahan Baku | asset | debit |
| 1410 | Persediaan Barang Setengah Jadi | asset | debit |
| 1420 | Persediaan Barang Jadi | asset | debit |
| 5000 | Beban Pokok Penjualan | expense | debit |
| 5100 | Beban Penyesuaian Persediaan | expense | debit |
| 6100 | Pembelian | expense | debit |

---

## 2. Movement Event Mapping

Every movement type in `MOVEMENT_TYPES.md` has a corresponding event. The mapping below shows the Finance action for each.

| Event | Direction | Debit Account | Credit Account | Notes |
|---|---|---|---|---|
| `inventory.supplier_receipt` | In | 1400/1410 (Inventory) | 6100 (Purchases) / AP | Cost basis enters ledger |
| `inventory.warehouse_transfer` | Internal | None | None | No value change |
| `inventory.branch_transfer` | Internal | 1400/1410 (dest) | 1400/1410 (source) | Reclassify between branches |
| `inventory.sales_consumed` | Out | 5000 (COGS) | 1400/1410 (Inventory) | POS sale COGS |
| `inventory.recipe_consumed` | Out | WIP account | 1400/1410 (Inventory) | Production consumption |
| `inventory.production_output` | In | 1410 (Semi-finished) | WIP account | Production output |
| `inventory.manual_adjustment` | In/Out | 1400/1410 or 5100 | 5100 or 1400/1410 | Depends on direction |
| `inventory.stock_opname` | In/Out | 1400/1410 or 5100 | 5100 or 1400/1410 | Physical count diff |
| `inventory.return_to_supplier` | Out | 6100 (Purchases) / AP | 1400/1410 (Inventory) | Reversal of receipt |
| `inventory.customer_return` | In | 1400/1410 (Inventory) | 5000 (COGS) | Reversal of sale COGS |
| `inventory.waste_damage` | Out | 5100 (Loss Expense) | 1400/1410 (Inventory) | Waste disposal |
| `inventory.expired_goods` | Out | 5100 (Loss Expense) | 1400/1410 (Inventory) | Expired disposal |

---

## 3. Event Payloads

### 3.1 `inventory.sales_consumed`

**Published by:** Inventory Engine, when a POS order is completed.

**Payload:**
```typescript
{
  eventType: "inventory.sales_consumed",
  data: {
    orderId: number;
    branchId: number;
    totalCogs: number;           // computed from FIFO consumption
    items: Array<{
      itemType: "ingredient" | "semi_finished";
      itemId: number;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    transactionDate: string;      // ISO date
  }
}
```

**Finance Action:**
1. Create a `finance_transaction` with `type="expense"`, `category="cogs"`, `transaction_class="ACCOUNTING_TRANSACTION"`
2. Create journal entries:
   - Debit: Account 5000 (COGS) — amount = totalCogs
   - Credit: Account 1400/1410 (Inventory) — amount = totalCogs
3. Create ledger entries from journal entries
4. Link via `reference_type="order"`, `reference_id=orderId`

### 2.2 `inventory.purchase_received`

**Payload:**
```typescript
{
  eventType: "inventory.purchase_received",
  data: {
    receiptId: number;
    branchId: number;
    supplier: string;
    items: Array<{
      itemType: "ingredient" | "semi_finished";
      itemId: number;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    totalAmount: number;
    transactionDate: string;
  }
}
```

**Finance Action:**
1. Create a `finance_transaction` with `type="expense"`, `category="raw_material"`, `transaction_class="CASH_TRANSACTION"`
2. Create journal entries:
   - Debit: Account 1400/1410 (Inventory) — totalAmount
   - Credit: Account 6100 (Purchases) or AP — totalAmount
3. Link via `reference_type="goods_receipt"`, `reference_id=receiptId`

### 2.3 `inventory.adjustment_applied`

**Payload:**
```typescript
{
  eventType: "inventory.adjustment_applied",
  data: {
    adjustmentId: number;
    branchId: number;
    adjustmentType: "in" | "out" | "loss";
    items: Array<{
      itemType: "ingredient" | "semi_finished";
      itemId: number;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    transactionDate: string;
  }
}
```

**Finance Action:**
- If `adjustmentType="loss"` or `"out"`:
  - Debit: Account 5100 (Inventory Adjustment Expense)
  - Credit: Account 1400/1410 (Inventory)
- If `adjustmentType="in"`:
  - Debit: Account 1400/1410 (Inventory)
  - Credit: Account 6100 (Purchases)

### 2.4 `inventory.valuation_snapshot`

**Payload:**
```typescript
{
  eventType: "inventory.valuation_snapshot",
  data: {
    branchId: number;
    totalValue: number;      // SUM of all item costs
    ingredientValue: number;
    semiFinishedValue: number;
    finishedGoodValue: number;
    asOfDate: string;
  }
}
```

**Finance Action:**
- UPSERT into `financial_snapshots`:
  - Set `inventory = totalValue`
  - Set `cogs` from current period's accumulated COGS
  - Other fields recalculated from actual ledger data

---

## 3. Idempotency

Every event in `event_store` has a `sequence` (PK, auto-increment). The Finance consumer tracks the last processed sequence per event type in `finance_audit_logs`. If a duplicate event arrives (same sequence), it is skipped.

---

## 4. Reconciliation

A nightly reconciliation job verifies:

```
Total COGS from inventory events this period
  = Total debit to account 5000 this period
  = SUM(orders.total_cogs) for orders in this period
```

If mismatch > threshold (default: IDR 1,000), an alert is logged in `finance_audit_logs` with action="RECONCILIATION_MISMATCH".
