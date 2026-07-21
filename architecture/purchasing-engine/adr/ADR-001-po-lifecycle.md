# ADR-001: Purchase Order Lifecycle with Approval Workflow

## Status

Accepted

## Context

Purchase Orders require an approval workflow before being sent to suppliers. Direct PO creation without approval creates financial liability without authorization.

## Decision

Implement a multi-stage PO lifecycle:

```
draft → submitted → approved → sent → partial → completed → cancelled
```

- **draft**: Creator is editing.
- **submitted**: Sent for approval.
- **approved**: Authorized by manager/owner.
- **sent**: Communicated to supplier.
- **partial**: Some items received.
- **completed**: All items received.
- **cancelled**: PO voided before completion.

Each transition creates a `purchase_event`.

## Consequences

- + Clear authorization chain for financial commitments
- + Full audit trail of PO changes
- + Prevents unauthorized purchasing
- - Requires approval logic in the PO service

## Trade-offs

Control and auditability are prioritised over speed of PO creation.
