import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type {
  Supplier, PurchaseOrder, GoodsReceipt, SupplierInvoice,
  PurchasingDashboard, PurchasingValidation, SupplierAISuggestion,
} from "../types";

/* ── Items (for PO creation) ── */
export function useIngredients(branchId?: number) {
  return useQuery<{ id: number; name: string; unit: string; costPricePerUnit: string }[]>({
    queryKey: ["purchasing", "ingredients", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/ingredients${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data bahan");
      return res.json();
    },
    enabled: !!branchId,
  });
}

export function useSemiFinished(branchId?: number) {
  return useQuery<{ id: number; name: string; unit: string; costPricePerUnit: string }[]>({
    queryKey: ["purchasing", "semi-finished", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/semi-finished${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data semi-finished");
      return res.json();
    },
    enabled: !!branchId,
  });
}

export function useWarehouses(branchId?: number) {
  return useQuery<{ id: number; name: string }[]>({
    queryKey: ["purchasing", "warehouses", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/inventory/warehouses${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data gudang");
      return res.json();
    },
    enabled: !!branchId,
  });
}

/* ── Suppliers ── */
export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["purchasing", "suppliers"],
    queryFn: async () => {
      const res = await apiFetch("/api/purchasing/suppliers");
      if (!res.ok) throw new Error("Gagal mengambil data supplier");
      return res.json();
    },
  });
}

export function useSupplier(id: number | null) {
  return useQuery<Supplier>({
    queryKey: ["purchasing", "supplier", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/purchasing/suppliers/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil detail supplier");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; contactPerson?: string; phone?: string; email?: string; address?: string; taxId?: string; paymentTerms?: string }) => {
      const res = await apiFetch("/api/purchasing/suppliers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat supplier");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing", "suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Supplier> }) => {
      const res = await apiFetch(`/api/purchasing/suppliers/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal update supplier");
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["purchasing", "suppliers"] });
      qc.invalidateQueries({ queryKey: ["purchasing", "supplier", vars.id] });
    },
  });
}

/* ── Purchase Orders ── */
export function usePurchaseOrders(branchId?: number, status?: string) {
  return useQuery<PurchaseOrder[]>({
    queryKey: ["purchasing", "purchase-orders", branchId, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await apiFetch(`/api/purchasing/purchase-orders${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data PO");
      return res.json();
    },
  });
}

export function usePurchaseOrder(id: number | null) {
  return useQuery<PurchaseOrder>({
    queryKey: ["purchasing", "po", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/purchasing/purchase-orders/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil detail PO");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      supplierId: number; branchId: number; orderDate: string;
      expectedDate?: string; notes?: string; shippingCost?: number; taxAmount?: number;
      items: { itemType: string; itemId: number; quantityOrdered: number; unitCost: number }[];
    }) => {
      const res = await apiFetch("/api/purchasing/purchase-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat PO");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing"] }),
  });
}

export function useTransitionPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiFetch(`/api/purchasing/purchase-orders/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Gagal update status PO");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing"] }),
  });
}

/* ── Goods Receipts ── */
export function useGoodsReceipts(poId?: number) {
  return useQuery<GoodsReceipt[]>({
    queryKey: ["purchasing", "goods-receipts", poId],
    queryFn: async () => {
      const params = poId ? `?poId=${poId}` : "";
      const res = await apiFetch(`/api/purchasing/goods-receipts${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data GR");
      return res.json();
    },
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { poId: number; branchId: number; warehouseId: number; receivedDate: string; notes?: string }) => {
      const res = await apiFetch("/api/purchasing/goods-receipts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat GR");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing"] }),
  });
}

/* ── Invoices ── */
export function useInvoices(poId?: number, status?: string) {
  return useQuery<SupplierInvoice[]>({
    queryKey: ["purchasing", "invoices", poId, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (poId) params.set("poId", String(poId));
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await apiFetch(`/api/purchasing/invoices${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data invoice");
      return res.json();
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      invoiceNumber: string; supplierId: number; poId: number;
      invoiceDate: string; dueDate?: string; totalAmount: number; notes?: string;
    }) => {
      const res = await apiFetch("/api/purchasing/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat invoice");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing"] }),
  });
}

export function useApproveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/purchasing/invoices/${id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Gagal approve invoice");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasing"] }),
  });
}

/* ── Dashboard & Validation ── */
export function usePurchasingDashboard() {
  return useQuery<PurchasingDashboard>({
    queryKey: ["purchasing", "dashboard"],
    queryFn: async () => {
      const res = await apiFetch("/api/purchasing/dashboard");
      if (!res.ok) throw new Error("Gagal mengambil dashboard");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function usePurchasingValidation() {
  return useQuery<PurchasingValidation>({
    queryKey: ["purchasing", "validation"],
    queryFn: async () => {
      const res = await apiFetch("/api/purchasing/validation");
      if (!res.ok) throw new Error("Gagal mengambil validasi");
      return res.json();
    },
  });
}

/* ── AI Suggestions (client-side rule engine) ── */
export function useProcurementAI() {
  return useQuery<SupplierAISuggestion[]>({
    queryKey: ["purchasing", "ai"],
    queryFn: async () => {
      const suppliersRes = await apiFetch("/api/purchasing/suppliers");
      const poRes = await apiFetch("/api/purchasing/purchase-orders");
      const invoiceRes = await apiFetch("/api/purchasing/invoices");
      const grRes = await apiFetch("/api/purchasing/goods-receipts");

      if (!suppliersRes.ok || !poRes.ok || !invoiceRes.ok || !grRes.ok) return [];

      const suppliers: Supplier[] = await suppliersRes.json();
      const pos: PurchaseOrder[] = await poRes.json();
      const invoices: SupplierInvoice[] = await invoiceRes.json();
      const grs: GoodsReceipt[] = await grRes.json();

      const suggestions: SupplierAISuggestion[] = [];
      const now = new Date();

      // Supplier tanpa kontak
      for (const s of suppliers) {
        if (!s.contactPerson && !s.phone && !s.email) {
          suggestions.push({
            type: "supplier_no_contact", severity: "warning",
            title: `${s.name} tanpa kontak`,
            detail: "Supplier ini tidak memiliki informasi kontak. Hubungi untuk melengkapi data.",
            supplierId: s.id, supplierName: s.name,
          });
        }
      }

      // Supplier belum dipakai 180 hari
      const usedSupplierIds = new Set(pos.map(p => p.supplierId));
      for (const s of suppliers) {
        if (!usedSupplierIds.has(s.id)) {
          suggestions.push({
            type: "supplier_unused", severity: "info",
            title: `${s.name} belum digunakan`,
            detail: "Supplier ini belum memiliki PO. Pertimbangkan untuk memulai kerja sama.",
            supplierId: s.id, supplierName: s.name,
          });
        }
      }

      // PO menunggu approval > 5 hari
      for (const po of pos) {
        if (po.status === "submitted") {
          const created = new Date(po.createdAt);
          const daysDiff = Math.floor((now.getTime() - created.getTime()) / 86400000);
          if (daysDiff > 5) {
            suggestions.push({
              type: "po_approval_delay", severity: "critical",
              title: `${po.poNumber} menunggu ${daysDiff} hari`,
              detail: `PO ini menunggu approval lebih dari 5 hari. Segera tindak lanjuti.`,
            });
          }
        }
      }

      // Invoice 3-way match failed
      for (const inv of invoices) {
        if (inv.threeWayMatchStatus === "failed") {
          suggestions.push({
            type: "invoice_mismatch", severity: "critical",
            title: `${inv.invoiceNumber} mismatch`,
            detail: "Invoice tidak cocok dengan GR/PO. Periksa kembali data.",
          });
        }
      }

      // Outstanding invoices > 30 hari
      for (const inv of invoices) {
        if (inv.status === "approved" && inv.dueDate) {
          const due = new Date(inv.dueDate);
          if (due < now) {
            suggestions.push({
              type: "invoice_overdue", severity: "warning",
              title: `${inv.invoiceNumber} jatuh tempo`,
              detail: `Jatuh tempo ${inv.dueDate}. Segera lakukan pembayaran.`,
            });
          }
        }
      }

      // PO partial receipt > 14 hari
      for (const po of pos) {
        if (po.status === "partial" || po.status === "sent") {
          const created = new Date(po.createdAt);
          const daysDiff = Math.floor((now.getTime() - created.getTime()) / 86400000);
          if (daysDiff > 14) {
            suggestions.push({
              type: "po_receipt_delay", severity: "warning",
              title: `${po.poNumber} belum diterima`,
              detail: `PO sudah ${daysDiff} hari tapi belum diterima sepenuhnya.`,
            });
          }
        }
      }

      return suggestions;
    },
    refetchInterval: 60000,
  });
}
