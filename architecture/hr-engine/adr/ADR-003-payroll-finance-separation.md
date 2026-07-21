# ADR-003: HR Owns Payroll Data, Finance Creates Journals

## Status

Accepted

## Context

Payroll processing produces salary expense and salary payable amounts. These must flow into the general ledger. Finance Core v1.0 is LOCKED and Finance Core v2.0 is LOCKED — both must not be modified architecturally.

## Decision

HR Engine computes payroll and publishes events. Finance event consumer creates the journal entries. HR never directly writes to `finance_transactions`, `journal_entries`, or `ledger_entries`.

### Flow

```
HR: Process Payroll Batch
HR: Compute payslips (base + allowances - deductions = net)
HR: Publish payroll.batch_approved event
    │
    ▼
Finance: Consume event
Finance: Debit 6000 (Salary Expense) = total gross
Finance: Credit 2100 (Salary Payable) = total net
Finance: Debit 2100 when salary is paid → Credit 1000 (Cash)
```

## Consequences

- + Follows the same pattern as Inventory → Finance
- + Finance remains locked
- + Consistent architecture across all ERP modules
- - Payroll processing requires HR data + event publishing

## Trade-offs

Architecture consistency is prioritised over payroll implementation simplicity.
