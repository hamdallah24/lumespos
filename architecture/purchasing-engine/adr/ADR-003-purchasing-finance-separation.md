# ADR-003: Purchasing Computes Receipt Value, Finance Creates Journals

## Status

Accepted

## Context

Goods receipt creates an inventory asset. Supplier invoices create an accounts payable liability. Both must flow into the general ledger. Finance Core v1.0 is LOCKED and must not be modified.

## Decision

Purchasing Engine computes receipt and invoice values and publishes events. Finance event consumer creates the journal entries. Purchasing never directly writes to `finance_transactions`, `journal_entries`, or `ledger_entries`.

### Flow — Goods Receipt

```
Purchasing: Goods Receipt completed (items + costs)
Purchasing: publish goods.received event
    │
    ▼
Finance: Consume event
Finance: Debit 1400 (Inventory Asset) = total cost
Finance: Credit 2100 (AP Accrued Purchases) = total cost
```

### Flow — Supplier Invoice

```
Purchasing: Invoice approved
Purchasing: publish invoice.approved event
    │
    ▼
Finance: Consume event
Finance: Debit 2100 (AP Accrued) = invoice amount
Finance: Credit 2101 (AP Supplier) = invoice amount
```

### Flow — Payment

```
Finance: Payment made (manual or automated)
Finance: Debit 2101 (AP Supplier)
Finance: Credit 1000 (Cash)
```

## Consequences

- + Same pattern as Inventory → Finance and HR → Finance
- + Finance remains locked
- + Consistent architecture across all ERP modules

## Trade-offs

Architecture consistency is prioritised over implementation simplicity.
