import React, { useState, useMemo } from "react";
import { useTimeline } from "../hooks/useFinance";
import { useBranch } from "@/lib/branch";
import { useFinanceFilter } from "../context/FinanceFilterContext";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import { formatRp, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { TRANSACTION_CATEGORIES } from "../types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function TimelineItemCard({
  item,
  onClick,
  onVoid,
}: {
  item: any;
  onClick: () => void;
  onVoid?: (id: number) => void;
}) {
  const isIncome = item.type === "income";
  const categoryInfo = TRANSACTION_CATEGORIES[item.category];
  const canVoid = item.referenceType !== "order" && item.status !== "voided";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isIncome ? "bg-green-500/10" : "bg-red-500/10"
          }`}
        >
          {isIncome ? (
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          ) : (
            <ArrowDownRight className="w-5 h-5 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {categoryInfo?.label || item.category}
                {item.status === "voided" && <span className="ml-2 text-red-500">(Voided)</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-bold ${
                  item.status === "voided" ? "text-muted-foreground line-through" : isIncome ? "text-green-600" : "text-red-600"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatRp(item.amount)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(item.createdAt), "HH:mm", { locale: id })}</span>
            </div>
            <div className="flex items-center gap-2">
              {canVoid && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onVoid?.(item.id); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 active:bg-red-500/20 transition-colors touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Void
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                Saldo: {formatRp(item.balanceAfter)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function FinancialTimeline() {
  const { state: filter } = useFinanceFilter();
  const { branchId: defaultBranchId } = useBranch();
  const branchId = filter.branchIds.length === 1 ? filter.branchIds[0] : null;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const handleVoid = async (id: number) => {
    if (!confirm("Void transaksi ini?")) return;
    try {
      const res = await apiFetch(`/api/finance/transactions/${id}/void`, { method: "PATCH" });
      if (!res.ok) throw new Error("Gagal void");
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    } catch (err) {
      alert("Gagal void transaksi");
    }
  };

  const filters = useMemo(
    () => ({
      branchId: branchId || defaultBranchId || undefined,
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
      search: search || undefined,
      category: category || undefined,
      page,
      limit: 20,
    }),
    [branchId, search, category, page]
  );

  const { data, isLoading } = useTimeline(filters);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? "" : value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Timeline Keuangan</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 shrink-0"
        >
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-2 flex-wrap"
        >
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {Object.entries(TRANSACTION_CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Belum ada transaksi
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.items.map((item) => (
            <TimelineItemCard
              key={item.id}
              item={item}
              onClick={() => {}}
              onVoid={handleVoid}
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {data.page} dari {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(data.totalPages, page + 1))}
              disabled={page === data.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
