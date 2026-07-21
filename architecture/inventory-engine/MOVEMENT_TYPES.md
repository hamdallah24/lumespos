# Movement Types — Detailed Specification

Every inventory movement goes through `movementService.createMovement()`. This document specifies the behavior for each of the 12 movement types.

## Notation

- `qty` is always a positive number. `direction` determines sign in Stock Card.
- `unit_cost` is sourced from FIFO layers (outbound) or from input (inbound).
- Stock Card `value_change` = `qty × unit_cost`.

---

## 1. `supplier_receipt`

**Direction:** In

**Trigger:** Goods received from supplier (manual entry or purchase order integration)

**Validation:**
- Supplier must exist (optional: free-text supplier name if no supplier master)
- Unit cost must be provided

**FIFO Action:**
- Create new FIFO layer: `{ qty, unit_cost, received_at: now(), stock_card_id }`

**Stock Card:**
- `movement_type = 'supplier_receipt'`
- `qty_before` = current stock
- `qty_change` = +qty
- `qty_after` = current stock + qty
- `value_before` = current valuation
- `value_change` = +total_cost
- `value_after` = current valuation + total_cost
- `unit_cost` = provided unit cost

**Event:** `inventory.supplier_receipt`

**Finance Journal:**
- Debit: Inventory asset account (1400/1410)
- Credit: Purchases account (6100) or Accounts Payable

---

## 2. `warehouse_transfer`

**Direction:** Internal (out from source warehouse, in to destination warehouse)

**Trigger:** Movement between warehouses within the same branch

**Validation:**
- Source warehouse and destination warehouse must belong to same branch
- Sufficient stock in source warehouse

**FIFO Action:**
- Consume from source warehouse FIFO layers
- Create new FIFO layers in destination warehouse with same unit costs

**Stock Card:** 2 entries
1. Source: `movement_type = 'warehouse_transfer'`, `direction = 'out'`
2. Destination: `movement_type = 'warehouse_transfer'`, `direction = 'in'`

**Event:** `inventory.warehouse_transfer` (internal — no Finance impact)

**Finance Journal:** None — no change in total inventory value

---

## 3. `branch_transfer`

**Direction:** Out from source branch, in to destination branch

**Trigger:** Stock moved between branches (e.g., central → branch, or branch → branch)

**Validation:**
- Branches must be different
- Sufficient stock in source branch warehouse

**FIFO Action:**
- Consume from source branch FIFO layers
- Create new FIFO layers in destination branch with same unit costs

**Stock Card:** 2 entries
1. Source branch: `direction = 'out'`
2. Destination branch: `direction = 'in'`

**Event:** `inventory.branch_transfer`

**Finance Journal:**
- Reclassify inventory value: Credit source branch inventory, Debit destination branch inventory
- (If branches share the same legal entity, this may be a non-journaling internal transfer)

---

## 4. `sales_consumption`

**Direction:** Out

**Trigger:** POS order completed with stock-required products

**Validation:**
- Product must have `requires_stock = true`
- BOM must exist for the product (or have recipe rows)
- Sufficient stock of all BOM components

**FIFO Action:**
- For each BOM component: consume from FIFO layers oldest-first
- Compute total COGS = SUM(consumed_qty × layer_unit_cost)

**Stock Card:** 1 entry per BOM component (multi-row)
- `movement_type = 'sales_consumption'`
- `reference_type = 'order'`, `reference_id = orderId`
- `description = "Consumed for Order #ID"`

**Event:** `inventory.sales_consumed`
- Payload includes `totalCogs`, `orderId`, `branchId`, `items[]`

**Finance Journal:**
- Debit: COGS expense (5000)
- Credit: Inventory asset (1400/1410)

---

## 5. `recipe_consumption`

**Direction:** Out

**Trigger:** Production of semi-finished goods (BOM components consumed)

**Validation:**
- BOM exists for the semi-finished good being produced
- Sufficient stock of all components

**FIFO Action:**
- For each BOM component: consume from FIFO layers oldest-first

**Stock Card:** 1 entry per component
- `movement_type = 'recipe_consumption'`
- `reference_type = 'production'`, `reference_id = productionBatchId`

**Event:** `inventory.recipe_consumed`

**Finance Journal:**
- Debit: Work-in-Progress (WIP) account
- Credit: Inventory asset (1400/1410)

---

## 6. `production_output`

**Direction:** In

**Trigger:** Semi-finished production completed (output received)

**Validation:**
- Production batch must exist
- Yield quantity must be positive

**FIFO Action:**
- Create new FIFO layer: `{ qty: yield_qty, unit_cost: total_cost / yield_qty }`

**Stock Card:**
- `movement_type = 'production_output'`
- `value_change = total_cost_of_consumed_components`

**Event:** `inventory.production_output`

**Finance Journal:**
- Debit: Inventory asset (1410 — semi-finished)
- Credit: Work-in-Progress (WIP)

---

## 7. `manual_adjustment`

**Direction:** In or Out

**Trigger:** Owner/manager manually corrects stock without a physical count

**Validation:**
- Reason/notes required
- Owner/manager role required

**FIFO Action:**
- If In: create new FIFO layer with provided unit_cost (or current moving average)
- If Out: consume from FIFO layers oldest-first

**Stock Card:**
- `movement_type = 'manual_adjustment'`
- `description` must include reason

**Event:** `inventory.manual_adjustment`

**Finance Journal:**
- If In: Debit Inventory, Credit Gain account
- If Out: Debit Loss/Adjustment expense (5100), Credit Inventory

---

## 8. `stock_opname`

**Direction:** In or Out (net correction)

**Trigger:** Physical count vs system count discrepancy

**Validation:**
- Physical count document required
- Discrepancy = physical_count - system_count

**FIFO Action:**
- If discrepancy > 0 (gain): create new FIFO layer at weighted average cost
- If discrepancy < 0 (loss): consume from FIFO layers

**Stock Card:**
- `movement_type = 'stock_opname'`
- `qty_change = discrepancy` (signed)
- `description` must reference the opname document

**Event:** `inventory.stock_opname`

**Finance Journal:**
- If gain: Debit Inventory, Credit Adjustment Gain
- If loss: Debit Loss Expense (5100), Credit Inventory

---

## 9. `return_to_supplier`

**Direction:** Out

**Trigger:** Goods returned to vendor

**Validation:**
- Original receipt must exist (reference)
- Quantity cannot exceed original receipt quantity minus previous returns

**FIFO Action:**
- Consume from FIFO layers (preferably the layers created by the original receipt)

**Stock Card:**
- `movement_type = 'return_to_supplier'`
- `reference_type = 'goods_receipt'`, `reference_id = receiptId`

**Event:** `inventory.return_to_supplier`

**Finance Journal:**
- Debit: AP/Purchases (6100)
- Credit: Inventory (1400/1410)

---

## 10. `customer_return`

**Direction:** In

**Trigger:** Customer returns goods from a previous sale

**Validation:**
- Original order must exist
- Item must match original order item
- Condition check (returnable or damaged)

**FIFO Action:**
- Create new FIFO layer at the original sale's COGS unit cost (reverse COGS)

**Stock Card:**
- `movement_type = 'customer_return'`
- `reference_type = 'order'`, `reference_id = orderId`

**Event:** `inventory.customer_return`

**Finance Journal:**
- Debit: Inventory (1400/1410)
- Credit: COGS (5000) — reversal

---

## 11. `waste_damage`

**Direction:** Out

**Trigger:** Goods damaged, spoiled, or otherwise unusable

**Validation:**
- Must be inspected and approved (owner/manager)
- Reason required

**FIFO Action:**
- Consume from FIFO layers oldest-first (standard outbound)

**Stock Card:**
- `movement_type = 'waste_damage'`
- `description` must include reason

**Event:** `inventory.waste_damage`

**Finance Journal:**
- Debit: Loss/Waste Expense (5100)
- Credit: Inventory (1400/1410)

---

## 12. `expired_goods`

**Direction:** Out

**Trigger:** Goods past expiry date — auto-detected or manually entered

**Validation:**
- Batch/expiry date must be specified
- Must be approved

**FIFO Action:**
- Consume from FIFO layers (preferentially consume from expired batches first)

**Stock Card:**
- `movement_type = 'expired_goods'`
- `description` must include expiry date

**Event:** `inventory.expired_goods`

**Finance Journal:**
- Debit: Loss/Waste Expense (5100)
- Credit: Inventory (1400/1410)

---

## Summary Table

| # | Movement Type | Direction | FIFO | Event Published | Finance Impact |
|---|---|---|---|---|---|
| 1 | supplier_receipt | In | Create layer | ✅ | Debit Inventory, Credit AP |
| 2 | warehouse_transfer | Internal | Consume + Create | ✅ | None |
| 3 | branch_transfer | Internal | Consume + Create | ✅ | Reclassify |
| 4 | sales_consumption | Out | Consume | ✅ | Debit COGS, Credit Inventory |
| 5 | recipe_consumption | Out | Consume | ✅ | Debit WIP, Credit Inventory |
| 6 | production_output | In | Create layer | ✅ | Debit Inventory, Credit WIP |
| 7 | manual_adjustment | In/Out | Create/Consume | ✅ | Debit/Credit Loss/Gain |
| 8 | stock_opname | In/Out | Create/Consume | ✅ | Debit/Credit Loss/Gain |
| 9 | return_to_supplier | Out | Consume | ✅ | Debit AP, Credit Inventory |
| 10 | customer_return | In | Create layer | ✅ | Debit Inventory, Credit COGS |
| 11 | waste_damage | Out | Consume | ✅ | Debit Loss, Credit Inventory |
| 12 | expired_goods | Out | Consume | ✅ | Debit Loss, Credit Inventory |
