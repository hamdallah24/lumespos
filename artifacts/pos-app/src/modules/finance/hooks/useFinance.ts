import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type {
  FinanceAccount,
  FinanceTransaction,
  FinanceDashboardData,
  FinanceJournalEntry,
  TrialBalanceRow,
  BalanceSheetData,
  ProfitLossData,
  CashPosition,
  CashPositionItem,
  FinancialHealth,
  InsightData,
  TimelineItem,
  TimelineResult,
  DailySnapshot,
} from "../types";

export function useFinanceAccounts() {
  return useQuery<FinanceAccount[]>({
    queryKey: ["finance", "accounts"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/accounts");
      if (!res.ok) throw new Error("Gagal mengambil data akun");
      return res.json();
    },
  });
}

export function useFinanceDashboard(branchId?: number) {
  return useQuery<FinanceDashboardData>({
    queryKey: ["finance", "dashboard", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/finance/dashboard${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      branchId: number;
      type: string;
      category: string;
      description: string;
      amount: number;
      accountId?: number;
      referenceType?: string;
      referenceId?: number;
      referenceCode?: string;
      sourceModule?: string;
      notes?: string;
    }) => {
      const res = await apiFetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal membuat transaksi" }));
        throw new Error(err.error || "Gagal membuat transaksi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useFinanceTransactions(branchId?: number) {
  return useQuery<FinanceTransaction[]>({
    queryKey: ["finance", "transactions", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/finance/transactions${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data transaksi");
      return res.json();
    },
  });
}

export function useTimeline(filters: {
  branchId?: number;
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<TimelineResult>({
    queryKey: ["finance", "timeline", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.branchId) params.set("branchId", String(filters.branchId));
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const queryString = params.toString();
      const res = await apiFetch(`/api/finance/timeline${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data timeline");
      return res.json();
    },
  });
}

export function useCashPosition() {
  return useQuery<{ position: CashPosition; items: CashPositionItem[] }>({
    queryKey: ["finance", "cash-position"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/cash-position");
      if (!res.ok) throw new Error("Gagal mengambil data cash position");
      return res.json();
    },
  });
}

export function useFinancialHealth(branchId?: number) {
  return useQuery<FinancialHealth>({
    queryKey: ["finance", "health", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/finance/health${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data health");
      return res.json();
    },
    enabled: !!branchId,
  });
}

export function useInsight(branchId?: number) {
  return useQuery<InsightData>({
    queryKey: ["finance", "insight", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/finance/insight${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data insight");
      return res.json();
    },
    enabled: !!branchId,
  });
}

export function useTransactionDetail(transactionId?: number) {
  return useQuery<{
    transaction: FinanceTransaction;
    journal: FinanceJournalEntry[];
  }>({
    queryKey: ["finance", "transaction-detail", transactionId],
    queryFn: async () => {
      const res = await apiFetch(`/api/finance/journal/${transactionId}`);
      if (!res.ok) throw new Error("Gagal mengambil data transaksi");
      const journal = await res.json();
      return { transaction: null as any, journal };
    },
    enabled: !!transactionId,
  });
}

export function useTrialBalance() {
  return useQuery<TrialBalanceRow[]>({
    queryKey: ["finance", "trial-balance"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/trial-balance");
      if (!res.ok) throw new Error("Gagal mengambil data trial balance");
      return res.json();
    },
  });
}

export function useBalanceSheet() {
  return useQuery<BalanceSheetData>({
    queryKey: ["finance", "balance-sheet"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/balance-sheet");
      if (!res.ok) throw new Error("Gagal mengambil data balance sheet");
      return res.json();
    },
  });
}

export function useProfitLoss() {
  return useQuery<ProfitLossData>({
    queryKey: ["finance", "profit-loss"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/profit-loss");
      if (!res.ok) throw new Error("Gagal mengambil data profit loss");
      return res.json();
    },
  });
}

export function useAccountBalances() {
  return useQuery({
    queryKey: ["finance", "balances"],
    queryFn: async () => {
      const res = await apiFetch("/api/finance/balances");
      if (!res.ok) throw new Error("Gagal mengambil data saldo");
      return res.json();
    },
  });
}

export function useDailySnapshots(branchId?: number, days?: number) {
  return useQuery<DailySnapshot[]>({
    queryKey: ["finance", "snapshots", branchId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      if (days) params.set("days", String(days));
      const queryString = params.toString();
      const res = await apiFetch(`/api/finance/snapshots${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data snapshots");
      return res.json();
    },
    enabled: !!branchId,
  });
}

// ── T14B: Accounting Periods ──

export function useAccountingPeriods() {
  const queryClient = useQueryClient();
  return {
    ...useQuery<{ periods: any[]; currentPeriod: any }>({
      queryKey: ["finance", "periods"],
      queryFn: async () => {
        const res = await apiFetch("/api/finance/periods");
        if (!res.ok) throw new Error("Gagal mengambil periode");
        return res.json();
      },
      refetchInterval: 60000,
    }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["finance", "periods"] }),
  };
}

export function useClosePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiFetch(`/api/finance/periods/${periodId}/execute-closing`, { method: "POST" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useValidateClosing(periodId?: number) {
  return useQuery({
    queryKey: ["finance", "validate-closing", periodId],
    queryFn: async () => {
      const res = await apiFetch(`/api/finance/periods/${periodId}/validate-closing`);
      if (!res.ok) throw new Error("Gagal validasi");
      return res.json();
    },
    enabled: !!periodId,
  });
}

export function useReopenPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, reason }: { periodId: number; reason: string }) => {
      const res = await apiFetch(`/api/finance/periods/${periodId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useFinanceAuditLogs(periodId?: number) {
  return useQuery({
    queryKey: ["finance", "audit-logs", periodId],
    queryFn: async () => {
      const params = periodId ? `?periodId=${periodId}` : "";
      const res = await apiFetch(`/api/finance/audit-logs${params}`);
      if (!res.ok) throw new Error("Gagal mengambil audit logs");
      return res.json();
    },
  });
}
