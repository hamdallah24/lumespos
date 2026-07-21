# ADR-004: Phased Implementation

## Status

Accepted

## Context

Purchasing Engine scope covers suppliers, purchase orders, goods receipt, supplier invoices, and approval workflows. Building everything at once delays value delivery.

## Decision

Deliver in 3 phases:

### Phase P0 — Supplier + PO Core

Tables: `suppliers`, `purchase_orders`, `purchase_order_items`, `purchase_events`
Services: supplier CRUD, PO workflow with approval
Routes: /purchasing/suppliers, /purchasing/purchase-orders
Frontend: Supplier list, PO create/list/approve

### Phase P1 — Goods Receipt + Inventory Link

Tables: `goods_receipts`, `goods_receipt_items`
Services: goods receipt with Inventory movement integration
Routes: /purchasing/goods-receipts
Feature: PO auto-updates quantity_received on receipt

### Phase P2 — Invoicing + AP

Tables: `supplier_invoices`
Services: invoice matching, AP accrual, Finance journal creation
Routes: /purchasing/invoices
Dashboard: PO aging, AP aging, spending by supplier

## Consequences

- + Value delivered every phase
- + P0 can ship quickly (supplier + PO are independent)
- + P1 benefits from existing Inventory Engine
- + P2 benefits from existing Finance Engine
