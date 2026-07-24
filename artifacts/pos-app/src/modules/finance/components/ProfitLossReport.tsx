import React from "react";
import { useProfitLoss } from "../hooks/useFinance";
import { useWorkspace } from "@/platform/workspace";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

function LineItem({ code, name, balance, type }: { code: string; name: string; balance: number; type: "revenue" | "expense" }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${type === "revenue" ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-xs text-muted-foreground font-mono">{code}</span>
        <span className="text-sm truncate">{name}</span>
      </div>
      <span className={`text-sm font-semibold shrink-0 ml-4 ${type === "revenue" ? "text-green-600" : "text-red-600"}`}>
        {type === "revenue" ? "" : "-"}{formatRp(balance)}
      </span>
    </div>
  );
}

function CollapsibleSection({ title, count, icon: Icon, color, children, defaultOpen = true }: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function SummaryRow({ label, value, positive, negative, highlight, border }: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
  border?: boolean;
}) {
  const valColor = positive && value > 0 ? "text-green-600"
    : negative && value < 0 ? "text-red-600"
    : highlight ? "text-foreground"
    : "text-muted-foreground";

  return (
    <div className={`flex items-center justify-between py-2 px-3 ${border ? "border-t border-border" : ""} ${highlight ? "bg-muted/50 rounded-lg" : ""}`}>
      <span className={`text-sm ${highlight ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-bold ${valColor}`}>{formatRp(value)}</span>
    </div>
  );
}

function MarginBadge({ margin }: { margin: number }) {
  const isPositive = margin > 0;
  const isNegative = margin < 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      isPositive ? "bg-green-500/10 text-green-600"
      : isNegative ? "bg-red-500/10 text-red-600"
      : "bg-muted text-muted-foreground"
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" />
        : isNegative ? <TrendingDown className="w-3 h-3" />
        : <Minus className="w-3 h-3" />}
      {margin.toFixed(1)}%
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ProfitLossReport() {
  const { state: filter } = useWorkspace();
  const { branchId: defaultBranchId } = useBranch();
  const branchIds = filter.branchIds.length > 0 ? filter.branchIds : undefined;

  const { data, isLoading } = useProfitLoss(
    branchIds,
    filter.startDate,
    filter.endDate,
  );

  if (isLoading) return <SkeletonCard />;

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Gagal memuat laporan laba rugi
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.totalRevenue || 0;
  const totalExpenses = data.totalExpenses || 0;
  const netIncome = data.netIncome || 0;
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Laporan Laba Rugi</h3>
          <p className="text-xs text-muted-foreground">
            {filter.startDate || filter.endDate ? "Periode terfilter" : "Semua periode"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MarginBadge margin={grossMargin} />
          <span className="text-[10px] text-muted-foreground">Margin</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
          <p className="text-[10px] text-green-600 font-medium">Pendapatan</p>
          <p className="text-sm font-bold text-green-600 mt-1">{formatRp(totalRevenue)}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
          <p className="text-[10px] text-red-600 font-medium">Beban</p>
          <p className="text-sm font-bold text-red-600 mt-1">{formatRp(totalExpenses)}</p>
        </div>
        <div className={`${netIncome >= 0 ? "bg-blue-500/5 border border-blue-500/10" : "bg-red-500/5 border border-red-500/10"} rounded-xl p-3`}>
          <p className={`text-[10px] font-medium ${netIncome >= 0 ? "text-blue-600" : "text-red-600"}`}>Laba Bersih</p>
          <p className={`text-sm font-bold mt-1 ${netIncome >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatRp(netIncome)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pendapatan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.revenue.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data pendapatan</p>
          ) : (
            <div className="space-y-0.5">
              {data.revenue.map((r) => (
                <LineItem key={r.code} {...r} type="revenue" />
              ))}
            </div>
          )}
          <SummaryRow label="Total Pendapatan" value={totalRevenue} positive border highlight />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Beban
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.expenses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data beban</p>
          ) : (
            <div className="space-y-0.5">
              {data.expenses.map((e) => (
                <LineItem key={e.code} {...e} type="expense" />
              ))}
            </div>
          )}
          <SummaryRow label="Total Beban" value={totalExpenses} negative border highlight />
        </CardContent>
      </Card>

      <Card className={netIncome >= 0 ? "border-green-500/20" : "border-red-500/20"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                netIncome >= 0 ? "bg-blue-500/10 text-blue-600" : "bg-red-500/10 text-red-600"
              }`}>
                {netIncome >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold">Laba / Rugi Bersih</p>
                <p className="text-[10px] text-muted-foreground">
                  Rasio Beban: {expenseRatio.toFixed(1)}% dari pendapatan
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${netIncome >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatRp(netIncome)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}