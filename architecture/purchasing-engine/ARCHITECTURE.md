# Purchasing Engine — Architecture

## 1. Core Principle

**Purchasing Engine owns the procurement lifecycle.**

It is the bridge between Inventory and Finance.

Supplier → Purchase Requisition → Purchase Order → Goods Receipt → Supplier Invoice → Inventory → Finance

The engine answers one question:

> **"What did we order, from whom, did it arrive, and what do we owe?"**

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Purchasing Engine (Write Model)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Supplier      │  │ PO           │  │ Goods Receipt    │  │
│  │ Service       │  │ Engine       │  │ Service          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│         ▼                 ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Purchasing Event Engine                   │   │
│  │  Every change → immutable purchase_event → Projection │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Projection Cache                         │   │
│  │  supplier_summary  po_summary  receipt_summary       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Event Store (publish)                    │   │
│  └──────┬───────────────────────────────────────────┬───┘   │
└─────────┼───────────────────────────────────────────┼───────┘
          │                                           │
          ▼                                           ▼
┌──────────────────┐                    ┌──────────────────────┐
│  Inventory        │                    │  Finance Event       │
│  (goods receipt → │                    │  Consumer            │
│   stock increase) │                    │  (AP accrual,        │
└──────────────────┘                    │   inventory value)   │
                                        └──────────────────────┘
```

---

## 3. Entity Model

```
Supplier Master
    │
    ├── Purchase Requisitions
    │       │
    │       ├── Requisition Items
    │       │
    │       └── Approval Workflow
    │
    ├── Purchase Orders
    │       │
    │       ├── PO Items
    │       ├── PO Status (draft → submitted → approved → sent → partial → completed → cancelled)
    │       └── PO History
    │
    ├── Goods Receipts
    │       │
    │       ├── Receipt Items
    │       └── → Inventory (stock increase)
    │
    └── Supplier Invoices
            │
            ├── Invoice Items
            └── → Finance (AP journal)
```

---

## 4. Data Model

### 4.1 `suppliers`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| code | text UNIQUE | auto-generated SUP-XXXX |
| name | text NOT NULL | |
| contact_person | text | |
| phone | text | |
| email | text | |
| address | text | |
| tax_id | text | NPWP |
| payment_terms | text | e.g. "NET30", "COD" |
| is_active | boolean | default true |
| created_at | timestamptz | |

### 4.2 `purchase_requisitions`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| pr_number | text UNIQUE | auto-generated PR-YYYYMM-XXXX |
| branch_id | int FK→branches | |
| requested_by | int FK→users | |
| status | text | draft → submitted → approved → rejected → ordered |
| notes | text | |
| created_at | timestamptz | |

### 4.3 `purchase_requisition_items`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| requisition_id | int FK→purchase_requisitions | |
| item_type | text | 'ingredient' \| 'semi_finished' |
| item_id | int | |
| quantity | numeric(14,4) | |
| estimated_unit_cost | numeric(14,2) | |
| notes | text | |

### 4.4 `purchase_orders`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| po_number | text UNIQUE | auto-generated PO-YYYYMM-XXXX |
| supplier_id | int FK→suppliers | |
| branch_id | int FK→branches | |
| requisition_id | int FK→purchase_requisitions | nullable |
| status | text | draft → submitted → approved → sent → partial → completed → cancelled |
| order_date | date | |
| expected_date | date | |
| shipping_cost | numeric(14,2) | |
| tax_amount | numeric(14,2) | |
| total_amount | numeric(14,2) | computed |
| notes | text | |
| approved_by | int FK→users | |
| approved_at | timestamptz | |
| created_by | int FK→users | |
| created_at | timestamptz | |

### 4.5 `purchase_order_items`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| po_id | int FK→purchase_orders | |
| item_type | text | 'ingredient' \| 'semi_finished' |
| item_id | int | |
| quantity_ordered | numeric(14,4) | |
| quantity_received | numeric(14,4) | default 0 |
| unit_cost | numeric(14,2) | |
| total_cost | numeric(14,2) | computed |
| notes | text | |

### 4.6 `goods_receipts`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| gr_number | text UNIQUE | auto-generated GR-YYYYMM-XXXX |
| po_id | int FK→purchase_orders | |
| branch_id | int FK→branches | |
| warehouse_id | int FK→warehouses | |
| received_date | date | |
| status | text | draft → completed → voided |
| notes | text | |
| received_by | int FK→users | |
| created_at | timestamptz | |

### 4.7 `goods_receipt_items`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| receipt_id | int FK→goods_receipts | |
| po_item_id | int FK→purchase_order_items | |
| item_type | text | |
| item_id | int | |
| quantity_received | numeric(14,4) | |
| unit_cost | numeric(14,2) | |
| total_cost | numeric(14,2) | computed |

### 4.8 `supplier_invoices`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| invoice_number | text | supplier's invoice number |
| po_id | int FK→purchase_orders | |
| supplier_id | int FK→suppliers | |
| invoice_date | date | |
| due_date | date | |
| total_amount | numeric(14,2) | |
| status | text | draft → submitted → approved → paid → voided |
| notes | text | |
| created_at | timestamptz | |

### 4.9 `purchase_events` — Immutable Event Store

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| event_type | text | 'supplier.created' \| 'po.submitted' \| 'po.approved' \| 'goods.received' \| 'invoice.approved' |
| aggregate_type | text | 'supplier' \| 'purchase_order' \| 'goods_receipt' \| 'invoice' |
| aggregate_id | int | |
| data | jsonb | |
| metadata | jsonb | |
| created_at | timestamptz | |

---

## 5. Event → Integration Map

### Inventory Integration

| Event | Inventory Action |
|---|---|
| `goods.received` | Create `supplier_receipt` movement via `InventoryMovementEngine` → Stock Card → FIFO Layer |

### Finance Integration

**Purchasing never creates journals. Finance is the only journal creator.**

| Event | Debit | Credit |
|---|---|---|
| `goods.received` | 1400 (Inventory) | 2100 (AP/Accrued Purchases) |
| `invoice.approved` | 2100 (AP/Accrued) | 2101 (AP/Supplier) |
| `payment.made` | 2101 (AP/Supplier) | 1000 (Cash) |

---

## 6. CQRS-lite

```
Write Model:
  Supplier CRUD → purchase_events → supplier_summary
  PO Workflow   → purchase_events → po_summary
  Goods Receipt → purchase_events → receipt_summary → Inventory Movement Engine

Read Model:
  supplier_list (projection)
  po_status (projection)
  receipt_history (projection)
  ap_aging (computed from invoices)
```

---

## 7. Module Structure

```
artifacts/api-server/src/purchasing/
├── services/
│   ├── supplierService.ts
│   ├── requisitionService.ts
│   ├── poService.ts
│   ├── receiptService.ts
│   ├── invoiceService.ts
│   ├── purchaseEventPublisher.ts
│   └── projectionService.ts
├── routes/
│   ├── suppliers.ts
│   ├── requisitions.ts
│   ├── purchaseOrders.ts
│   ├── goodsReceipts.ts
│   └── invoices.ts
└── index.ts

artifacts/api-server/src/inventory/services/
└── purchaseReceiver.ts   # NEW: handles goods.received event → creates inventory movement

artifacts/api-server/src/finance/services/
└── purchaseEventConsumer.ts  # NEW: handles AP/inventory journal entries

artifacts/pos-app/src/modules/purchasing/
├── pages/
│   ├── SupplierListPage.tsx
│   ├── PurchaseOrderPage.tsx
│   └── GoodsReceiptPage.tsx
├── types/index.ts
├── hooks/usePurchasing.ts
└── components/
    ├── SupplierForm.tsx
    ├── PoForm.tsx
    └── ReceiptForm.tsx
```

---

## 8. Implementation Phases

### Phase P0 — Supplier + PO Core

| Component | Deliverable |
|---|---|
| Supplier Master | `suppliers` table, CRUD APIs, supplier list UI |
| Purchase Order | `purchase_orders` + `purchase_order_items`, full workflow |
| PO Approval | draft → submitted → approved → sent workflow |
| Purchase Events | `purchase_events` table, immutable event sourcing |

### Phase P1 — Goods Receipt + Inventory Integration

| Component | Deliverable |
|---|---|
| Goods Receipt | `goods_receipts` + `goods_receipt_items`, GRN workflow |
| Inventory Integration | Auto-create `supplier_receipt` movement in Inventory |
| PO Partial Receipt | Track `quantity_received` vs `quantity_ordered` |
| Purchase Return | Return to supplier workflow |

### Phase P2 — Invoicing + Finance Integration

| Component | Deliverable |
|---|---|
| Supplier Invoices | Invoice matching against PO + receipt |
| AP Accrual | Finance journal entries for inventory received |
| Approval Workflow | Multi-level approval for PO + invoices |
| Procurement Dashboard | PO aging, AP aging, spending by supplier |
