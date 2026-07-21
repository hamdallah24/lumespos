# ADR-002: Stock Card as Immutable Audit Trail

## Status

Accepted

## Context

Every inventory movement needs to be auditable. Currently:

- `stock_adjustments` tracks adjustments but does NOT capture production consumption, sales consumption, or transfers.
- `current_inventory` only stores the latest quantity — no history.
- There is no way to answer "what was my stock of ingredient X on date Y?"
- Debugging stock discrepancies requires manual log spelunking.

## Decision

Create a `stock_card` table as the single append-only ledger for every inventory movement. Every mutation writes one or more rows:

| Movement Type | Stock Card Entries |
|---|---|
| Sales consumption | 1 row per BOM component consumed |
| Purchase receipt | 1 row per item received |
| Production consumption | 1 row per ingredient consumed |
| Production output | 1 row for the output item |
| Stock transfer (out) | 1 row per item at source branch |
| Stock transfer (in) | 1 row per item at destination branch |
| Adjustment (in/out/loss) | 1 row per adjustment |
| Opening balance | 1 row per item at migration |

Each row captures `qty_before`, `qty_change`, `qty_after`, `value_before`, `value_change`, `value_after`, `reference_type`, `reference_id`, and `created_by`.

**Rules:**
- Rows are NEVER updated or deleted after creation.
- The `qty_after` of the most recent row for a given `(branch_id, item_type, item_id)` MUST match `current_inventory.current_stock`.
- Any reconciliation compares the stock card sequence against physical counts.

## Alternatives Considered

- **Update existing adjustment log:** Would not provide full before/after state.
- **Temporal tables (PostgreSQL built-in):** More complex queries and indexing; not portable across DB versions.

## Consequences

- **Positive:** Full immutable audit trail; enables point-in-time queries; simplifies debugging.
- **Negative:** Storage grows faster (mitigated by partitioning by branch + year).
- **Operational:** Monthly archival job for card entries older than 2 years.

## Trade-offs

Audit integrity and queryability are prioritised over storage efficiency.
