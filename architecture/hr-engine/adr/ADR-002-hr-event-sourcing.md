# ADR-002: HR Event Sourcing for Immutable Audit Trail

## Status

Accepted

## Context

Employee status changes (hire, promotion, resignation), attendance records, leave approvals, and payroll processing all need an immutable audit trail. Current HR practices require complete history of who did what and when.

## Decision

Every HR state change writes an immutable event to `hr_events`. Projections are rebuilt from this event log. The `hr_events` table is append-only — never updated, never deleted.

## Consequences

- + Full immutable audit trail for all HR actions
- + Enables point-in-time queries (who was employed on date X?)
- + Projection rebuild capability
- - Additional write per action

## Trade-offs

Audit integrity is prioritised over simplicity.
