import React from "react";
import { useFinancialHealth } from "../hooks/useFinance";
import { useBranch } from "@/lib/branch";
import { usePlatformFilter } from "@/platform/filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { motion } from "framer-motion";

function HealthScoreCard({
  title,
  score,
  label,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  score: number;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</p>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <p className="text-xs font-medium mt-0.5">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        </div>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${color}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}

export default function FinancialHealth() {
  const { state: filter } = usePlatformFilter();
  const { branchId: defaultBranchId } = useBranch();
  const branchId = filter.branchIds.length === 1 ? filter.branchIds[0] : defaultBranchId;
  const { data, isLoading } = useFinancialHealth(branchId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Belum ada data kesehatan keuangan
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          Kesehatan Bisnis
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {data.overallLabel} ({data.overallScore})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
          <HealthScoreCard
            title="Kas"
            score={data.cashHealth.score}
            label={data.cashHealth.label}
            description={data.cashHealth.description}
            icon={DollarSign}
            color="bg-blue-500/10 text-blue-600"
          />
          <HealthScoreCard
            title="Profitabilitas"
            score={data.profitability.score}
            label={data.profitability.label}
            description={data.profitability.description}
            icon={TrendingUp}
            color="bg-green-500/10 text-green-600"
          />
          <HealthScoreCard
            title="Rasio Pengeluaran"
            score={data.expenseRatio.score}
            label={data.expenseRatio.label}
            description={data.expenseRatio.description}
            icon={TrendingDown}
            color="bg-orange-500/10 text-orange-600"
          />
          <HealthScoreCard
            title="Tren Pendapatan"
            score={data.revenueTrend.score}
            label={data.revenueTrend.label}
            description={data.revenueTrend.description}
            icon={Activity}
            color="bg-purple-500/10 text-purple-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}
