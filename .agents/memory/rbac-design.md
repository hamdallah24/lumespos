---
name: RBAC Design
description: Role-based access control for Sayq POS with 3 roles enforced at API and UI levels.
---

**Roles:** owner | manager | cashier (stored in users.role, default: cashier)

**API enforcement:** requireRole(...roles) middleware in artifacts/api-server/src/middlewares/requireAuth.ts — checks DB user role.

**Frontend enforcement:** ProtectedApp in App.tsx checks me.role from GET /api/users/me; hides/redirects routes.

**Sidebar visibility:**
- cashier: Kasir + Riwayat only
- manager: adds Produk + Laporan
- owner: adds Pengguna page

**Dashboard/Laporan endpoints (owner+manager only):** /dashboard/summary, /dashboard/top-products, /dashboard/sales-chart, /dashboard/cashier-performance

**cashierId on orders:** Orders table has cashier_id FK → users.id. Cashier page passes me.id + me.name from useGetMe() hook.
