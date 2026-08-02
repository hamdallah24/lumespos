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
  CashflowData,
  GeneralLedgerRow,
  EquityStatementData,
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

export function useFinanceDashboard(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<FinanceDashboardData>({
    queryKey: ["finance", "dashboard", branchIds, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchIds && branchIds.length > 0) params.set("branchIds", branchIds.join(","));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const url = `/api/finance/dashboard${qs ? "?" + qs : ""}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown");
        console.error("[Finance] Dashboard API error:", res.status, errText);
        throw new Error("Gagal mengambil data dashboard");
      }
      return res.json();
    },
    refetchInterval: 60000,
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

export function useCashPosition(branchId?: number) {
  return useQuery<{ position: CashPosition; items: CashPositionItem[] }>({
    queryKey: ["finance", "cash-position", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/finance/cash-position${params}`);
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
  return useQuery<FinanceJournalEntry[]>({
    queryKey: ["finance", "transaction-detail", transactionId],
    queryFn: async () => {
      const res = await apiFetch(`/api/finance/journal/${transactionId}`);
      if (!res.ok) throw new Error("Gagal mengambil data transaksi");
      return res.json();
    },
    enabled: !!transactionId,
  });
}

function reportQueryKey(prefix: string, branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return ["finance", prefix, { branchIds, startDate, endDate }];
}

function reportQueryFn(path: string, branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return async () => {
    const params = new URLSearchParams();
    if (branchIds && branchIds.length > 0) params.set("branchIds", branchIds.join(","));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    const res = await apiFetch(`/api/finance/${path}${qs ? "?" + qs : ""}`);
    if (!res.ok) throw new Error(`Gagal mengambil data ${path}`);
    return res.json();
  };
}

export function useTrialBalance(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<TrialBalanceRow[]>({
    queryKey: reportQueryKey("trial-balance", branchIds, startDate, endDate),
    queryFn: reportQueryFn("trial-balance", branchIds, startDate, endDate),
  });
}

export function useBalanceSheet(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<BalanceSheetData>({
    queryKey: reportQueryKey("balance-sheet", branchIds, startDate, endDate),
    queryFn: reportQueryFn("balance-sheet", branchIds, startDate, endDate),
  });
}

export function useProfitLoss(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<ProfitLossData>({
    queryKey: reportQueryKey("profit-loss", branchIds, startDate, endDate),
    queryFn: reportQueryFn("profit-loss", branchIds, startDate, endDate),
  });
}

export function useCashflow(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<CashflowData>({
    queryKey: reportQueryKey("cashflow", branchIds, startDate, endDate),
    queryFn: reportQueryFn("cashflow", branchIds, startDate, endDate),
  });
}

export function useGeneralLedger(accountId?: number, branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<GeneralLedgerRow[]>({
    queryKey: ["finance", "general-ledger", { accountId, branchIds, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountId) params.set("accountId", String(accountId));
      if (branchIds && branchIds.length > 0) params.set("branchIds", branchIds.join(","));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const res = await apiFetch(`/api/finance/general-ledger${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data general ledger");
      return res.json();
    },
  });
}

export function useEquityStatement(branchIds?: number[], startDate?: string | null, endDate?: string | null) {
  return useQuery<EquityStatementData>({
    queryKey: reportQueryKey("equity-statement", branchIds, startDate, endDate),
    queryFn: reportQueryFn("equity-statement", branchIds, startDate, endDate),
  });
}

export function useLedgerByAccount(accountId?: number) {
  return useQuery({
    queryKey: ["finance", "ledger", accountId],
    queryFn: async () => {
      const res = await apiFetch(`/api/finance/ledger/${accountId}`);
      if (!res.ok) throw new Error("Gagal mengambil data ledger");
      return res.json();
    },
    enabled: !!accountId,
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
