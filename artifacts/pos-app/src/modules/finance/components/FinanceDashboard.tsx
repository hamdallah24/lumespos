import React, { useState } from "react";
import { useFinanceDashboard, useCreateTransaction, useFinanceTransactions } from "../hooks/useFinance";
import { useBranch } from "@/lib/branch";
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
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  const [notes, setNotes] = useState("");
  const createTransaction = useCreateTransaction();

  const filteredCategories = Object.entries(TRANSACTION_CATEGORIES).filter(
    ([, v]) => v.type === type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description || !amount) return;

    await createTransaction.mutateAsync({
      branchId,
      type,
      category,
      description,
      amount: Number(amount),
      notes: notes || undefined,
    });

    setDescription("");
    setAmount("");
    setNotes("");
    setCategory("");
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
  const { branchId } = useBranch();
  const { data: dashboard, isLoading: dashboardLoading } = useFinanceDashboard(branchId);
  const { data: transactions = [], refetch } = useFinanceTransactions(branchId);

  const [showMock, setShowMock] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasData = dashboard?.hasData || transactions.length > 0;
  const showLiveData = hasData && !showMock;

  const cashBalance = showLiveData ? dashboard?.cashBalance || 0 : 0;
  const todayIncome = showLiveData ? dashboard?.todayIncome || 0 : 0;
  const todayExpense = showLiveData ? dashboard?.todayExpense || 0 : 0;
  const profitToday = showLiveData ? dashboard?.profitToday || 0 : 0;

  const mockData = {
    cashBalance: 0,
    todayIncome: 0,
    todayExpense: 0,
    profitToday: 0,
  };

  const displayData = showLiveData ? { cashBalance, todayIncome, todayExpense, profitToday } : mockData;

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Keuangan</h2>
          <p className="text-xs text-muted-foreground">
            {showLiveData ? "Data live" : "Belum ada data transaksi"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu />
          {!hasData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMock(!showMock)}
              className="text-xs"
            >
              {showMock ? "Sembunyikan Mock" : "Lihat Contoh"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Kas"
          value={displayData.cashBalance}
          icon={Wallet}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Pemasukan Hari Ini"
          value={displayData.todayIncome}
          icon={TrendingUp}
          color="bg-green-500/10 text-green-600"
        />
        <StatCard
          title="Pengeluaran Hari Ini"
          value={displayData.todayExpense}
          icon={TrendingDown}
          color="bg-red-500/10 text-red-600"
        />
        <StatCard
          title="Laba Hari Ini"
          value={displayData.profitToday}
          icon={Banknote}
          color="bg-purple-500/10 text-purple-600"
        />
      </div>

      <CashPosition />
      <FinancialHealth />
      <DashboardInsight />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Transaksi Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showLiveData ? (
            <FinancialTimeline />
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Belum ada transaksi
            </div>
          )}
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
  );
}
