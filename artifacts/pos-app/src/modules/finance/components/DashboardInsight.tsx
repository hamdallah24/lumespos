import React from "react";
import { useInsight } from "../hooks/useFinance";
import { useBranch } from "@/lib/branch";
import { useWorkspace } from "@/platform/workspace";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

function InsightCard({
  title,
  current,
  previous,
  change,
  direction,
  isCurrency,
}: {
  title: string;
  current: number;
  previous: number;
  change: number;
  direction: "up" | "down" | "flat";
  isCurrency?: boolean;
}) {
  const getDirectionIcon = () => {
    if (direction === "up") return <TrendingUp className="w-3 h-3" />;
    if (direction === "down") return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getDirectionColor = () => {
    if (title === "Pengeluaran") {
      return direction === "up" ? "text-red-600" : direction === "down" ? "text-green-600" : "text-muted-foreground";
    }
    return direction === "up" ? "text-green-600" : direction === "down" ? "text-red-600" : "text-muted-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3"
    >
      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{title}</p>
      <p className="text-lg font-bold mt-1">
        {isCurrency ? formatRp(current) : `${current.toFixed(0)}%`}
      </p>
      <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${getDirectionColor()}`}>
        {getDirectionIcon()}
        <span>
          {direction === "flat" ? "Sama" : `${Math.abs(change).toFixed(0)}% vs Kemarin`}
        </span>
      </div>
    </motion.div>
  );
}

export default function DashboardInsight() {
  const { state: filter } = useWorkspace();
  const { branchId: defaultBranchId } = useBranch();
  const branchId = filter.branchIds.length === 1 ? filter.branchIds[0] : defaultBranchId;
  const { data, isLoading } = useInsight(branchId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.hasHistory) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            AI Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Mulai transaksi untuk melihat insight
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          AI Insight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <InsightCard
            title="Pendapatan"
            current={data.income.current}
            previous={data.income.previous}
            change={data.income.change}
            direction={data.income.direction}
            isCurrency
          />
          <InsightCard
            title="Pengeluaran"
            current={data.totalExpense.current}
            previous={data.totalExpense.previous}
            change={data.totalExpense.change}
            direction={data.totalExpense.direction}
            isCurrency
          />
          <InsightCard
            title="Margin Laba"
            current={data.profitMargin}
            previous={0}
            change={0}
            direction="flat"
          />
        </div>
      </CardContent>
    </Card>
  );
}
