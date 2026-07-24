import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type { Warehouse, StockCardResult, StockCardSearchItem, MovementPayload, MovementResult, ValuationItem } from "../types";
import type { InventoryDashboard, InventoryValidationReport, RecentMovement } from "../types/workspace";

export function useWarehouses(branchId?: number) {
  return useQuery<Warehouse[]>({
    queryKey: ["inventory", "warehouses", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/inventory/warehouses${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data gudang");
      return res.json();
    },
  });
}

export function useStockCard(branchId: number, warehouseId: number, itemType: string, itemId: number, page = 1, limit = 25) {
  return useQuery<StockCardResult>({
    queryKey: ["inventory", "stock-card", branchId, warehouseId, itemType, itemId, page, limit],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/inventory/stock-card/${itemType}/${itemId}?branchId=${branchId}&warehouseId=${warehouseId}&page=${page}&limit=${limit}`,
      );
      if (!res.ok) throw new Error("Gagal mengambil stock card");
      return res.json();
    },
    enabled: !!branchId && !!warehouseId && !!itemType && !!itemId,
  });
}

export function useStockCardSearch(branchId: number, q: string) {
  return useQuery<StockCardSearchItem[]>({
    queryKey: ["inventory", "stock-card", "search", branchId, q],
    queryFn: async () => {
      const res = await apiFetch(`/api/inventory/stock-card/items/search?branchId=${branchId}&q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Gagal mencari item");
      return res.json();
    },
    enabled: !!branchId && q.length >= 2,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  return useMutation<MovementResult, Error, MovementPayload>({
    mutationFn: async (data) => {
      const res = await apiFetch("/api/inventory/movements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Gagal" })); throw new Error(err.error || "Gagal membuat movement"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); },
  });
}

export function useInventoryValuation(branchId: number, warehouseId?: number) {
  return useQuery<ValuationItem[]>({
    queryKey: ["inventory", "valuation", branchId, warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: String(branchId) });
      if (warehouseId) params.set("warehouseId", String(warehouseId));
      const res = await apiFetch(`/api/inventory/valuation?${params}`);
      if (!res.ok) throw new Error("Gagal mengambil valuasi");
      return res.json();
    },
    enabled: !!branchId,
  });
}

export function useRebuildProjections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/inventory/rebuild-projections", { method: "POST" });
      if (!res.ok) throw new Error("Gagal rebuild");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); },
  });
}

export function useInventoryDashboard(branchId?: number) {
  return useQuery<InventoryDashboard>({
    queryKey: ["inventory", "dashboard", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/inventory/dashboard${params}`);
      if (!res.ok) throw new Error("Gagal mengambil dashboard");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useInventoryValidation(branchId?: number) {
  return useQuery<InventoryValidationReport>({
    queryKey: ["inventory", "validation", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/inventory/validation${params}`);
      if (!res.ok) throw new Error("Gagal mengambil validasi");
      return res.json();
    },
  });
}

import type { Item, ItemCategory, ItemListResponse } from "../types/item";

export function useItemCategories() {
  return useQuery<ItemCategory[]>({
    queryKey: ["items", "categories"],
    queryFn: async () => {
      const res = await apiFetch("/api/items/categories");
      if (!res.ok) throw new Error("Gagal mengambil kategori");
      return res.json();
    },
  });
}

export function useCreateItemCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; parentId?: number; color?: string }) => {
      const res = await apiFetch("/api/items/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Gagal membuat kategori");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", "categories"] }),
  });
}

export function useItems(params: { branchId: number; q?: string; categoryId?: number; type?: string; page?: number; limit?: number }) {
  return useQuery<ItemListResponse>({
    queryKey: ["items", "list", params],
    queryFn: async () => {
      const sp = new URLSearchParams({ branchId: String(params.branchId) });
      if (params.q) sp.set("q", params.q);
      if (params.categoryId) sp.set("categoryId", String(params.categoryId));
      if (params.type) sp.set("type", params.type);
      if (params.page) sp.set("page", String(params.page));
      if (params.limit) sp.set("limit", String(params.limit));
      const res = await apiFetch(`/api/items?${sp}`);
      if (!res.ok) throw new Error("Gagal mengambil items");
      return res.json();
    },
    enabled: !!params.branchId,
  });
}

export function useItem(id: number) {
  return useQuery<Item>({
    queryKey: ["items", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/items/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil item");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: "Gagal" })); throw new Error(e.error || "Gagal membuat item"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiFetch(`/api/items/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: "Gagal" })); throw new Error(e.error || "Gagal update item"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus item");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useRecentMovements(limit = 20) {
  return useQuery<RecentMovement[]>({
    queryKey: ["inventory", "recent-movements", limit],
    queryFn: async () => {
      const res = await apiFetch(`/api/inventory/recent-movements?limit=${limit}`);
      if (!res.ok) throw new Error("Gagal mengambil pergerakan");
      return res.json();
    },
    refetchInterval: 15000,
  });
}
