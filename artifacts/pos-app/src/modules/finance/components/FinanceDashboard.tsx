import React, { useState } from "react";
import { useFinanceDashboard, useCreateTransaction, useFinanceAccounts } from "../hooks/useFinance";
import { useBranch } from "@/lib/branch";
import { useFinanceFilter, FinanceFilterProvider } from "../context/FinanceFilterContext";
import FinanceFilterBar from "./FinanceFilterBar";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { TRANSACTION_CATEGORIES } from "../types";
import CashPosition from "./CashPosition";
import FinancialHealth from "./FinancialHealth";
import DashboardInsight from "./DashboardInsight";
import FinancialTimeline from "./FinancialTimeline";
import TransactionDetailDrawer from "./TransactionDetailDrawer";
import ExportMenu from "./ExportMenu";

const PAYMENT_METHODS = [
  { id: "cash", label: "Tunai", accountCode: "1000", icon: "💵" },
  { id: "bank", label: "Transfer Bank", accountCode: "1100", icon: "🏦" },
  { id: "ewallet", label: "E-Wallet", accountCode: "1250", icon: "📱" },
  { id: "piutang", label: "Piutang Usaha", accountCode: "1300", icon: "📋" },
  { id: "hutang", label: "Hutang Usaha", accountCode: "2000", icon: "📝" },
];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-3 sm:p-4"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {title}
          </p>
          <p className="text-lg font-bold mt-1 tracking-tight truncate">
            {formatRp(value)}
          </p>
        </div>
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ml-2 sm:ml-3 ${color}`}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function TransactionForm({
  branchId,
  onSuccess,
}: {
  branchId: number;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const createTransaction = useCreateTransaction();
  const { data: accounts = [] } = useFinanceAccounts();

  const filteredCategories = Object.entries(TRANSACTION_CATEGORIES).filter(
    ([, v]) => v.type === type
  );

  const getAccountId = (): number | undefined => {
    const method = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (!method) return undefined;
    const account = accounts.find((a) => a.code === method.accountCode);
    return account?.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description || !amount) return;

    await createTransaction.mutateAsync({
      branchId,
      type,
      category,
      description,
      amount: Number(amount),
      accountId: getAccountId(),
      notes: notes || undefined,
    });

    setDescription("");
    setAmount("");
    setNotes("");
    setCategory("");
    setPaymentMethod("cash");
    onSuccess();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Transaksi Baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setType("income");
                setCategory("");
              }}
              className="flex-1"
            >
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Pemasukan
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setType("expense");
                setCategory("");
              }}
              className="flex-1"
            >
              <ArrowDownRight className="w-3 h-3 mr-1" />
              Pengeluaran
            </Button>
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Metode Bayar" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  <span className="flex items-center gap-2">
                    <span>{method.icon}</span>
                    <span>{method.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            required
          />

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Jumlah (Rp)"
            min="0"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            required
          />

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
          />

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={createTransaction.isPending || !category || !description || !amount}
          >
            {createTransaction.isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboard() {
  return (
    <FinanceFilterProvider>
      <FinanceDashboardInner />
    </FinanceFilterProvider>
  );
}

function FinanceDashboardInner() {
  const { branchId } = useBranch();
  const { state: filter } = useFinanceFilter();
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useFinanceDashboard(
    filter.branchIds.length > 0 ? filter.branchIds : undefined,
    filter.startDate,
    filter.endDate,
  );

  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cashBalance = dashboard?.cashBalance || 0;
  const todayIncome = dashboard?.todayIncome || 0;
  const todayOperatingExpense = dashboard?.todayOperatingExpense || 0;
  const profitToday = dashboard?.profitToday || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <FinanceFilterBar />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Keuangan</h2>
          <p className="text-xs text-muted-foreground">
            {dashboardLoading ? "Memuat..." : dashboard?.accountingPeriod
              ? `${dashboard.accountingPeriod.name} · ${dashboard.accountingPeriod.status === "OPEN" ? "OPEN" : "LOCKED"}`
              : "Data live"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dashboard?.accountingPeriod?.status === "OPEN" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
              {dashboard.accountingPeriod.remainingDays}d left
            </span>
          )}
          {dashboard?.accountingPeriod?.status === "CLOSED" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium">
              LOCKED
            </span>
          )}
          <ExportMenu />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {dashboardLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-3 sm:p-4 animate-pulse">
                <div className="h-3 w-16 bg-muted rounded mb-2" />
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Kas"
              value={cashBalance}
              icon={Wallet}
              color="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              title="Pemasukan Hari Ini"
              value={todayIncome}
              icon={TrendingUp}
              color="bg-green-500/10 text-green-600"
            />
            <StatCard
              title="Pengeluaran Hari Ini"
              value={todayOperatingExpense}
              icon={TrendingDown}
              color="bg-red-500/10 text-red-600"
            />
            <StatCard
              title="Laba Hari Ini"
              value={profitToday}
              icon={Banknote}
              color="bg-purple-500/10 text-purple-600"
            />
          </>
        )}
      </div>

      <CashPosition branchIds={filter.branchIds} />
      <FinancialHealth branchId={filter.branchIds[0] || branchId || undefined} />
      <DashboardInsight branchId={filter.branchIds[0] || branchId || undefined} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Transaksi Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialTimeline
            branchId={filter.branchIds[0] || branchId || undefined}
            startDate={filter.startDate || undefined}
            endDate={filter.endDate || undefined}
          />
        </CardContent>
      </Card>

      <TransactionForm branchId={branchId} onSuccess={() => refetch()} />

      <TransactionDetailDrawer
        transactionId={selectedTransactionId}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTransactionId(null);
        }}
      />
      </div>
    </div>
  );
}
