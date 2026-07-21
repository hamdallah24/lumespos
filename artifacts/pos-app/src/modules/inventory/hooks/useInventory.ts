import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type { Warehouse, StockCardResult, MovementPayload, MovementResult, ValuationItem } from "../types";
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

export function useStockCard(branchId: number, warehouseId: number, itemType: string, itemId: number, page = 1) {
  return useQuery<StockCardResult>({
    queryKey: ["inventory", "stock-card", branchId, warehouseId, itemType, itemId, page],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/inventory/stock-card/${itemType}/${itemId}?branchId=${branchId}&warehouseId=${warehouseId}&page=${page}`,
      );
      if (!res.ok) throw new Error("Gagal mengambil stock card");
      return res.json();
    },
    enabled: !!branchId && !!warehouseId && !!itemType && !!itemId,
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
