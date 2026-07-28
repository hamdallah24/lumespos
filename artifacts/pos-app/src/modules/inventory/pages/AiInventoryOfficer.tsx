import { useMemo } from "react";
import { useInventoryDashboard, useInventoryValuation, useInventoryValidation } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Package, Warehouse, Target, Lightbulb, ArrowRightLeft, Scale, Eye, Sparkles, ChevronRight, DollarSign } from "lucide-react";
import { KpiCard } from "../components/Widgets";
import { formatRp } from "@/lib/format";
import { useBranch } from "@/lib/branch";
import type { AiRecommendation } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function RecommendationCard({ rec, rank }: { rec: AiRecommendation; rank: number }) {
  const colors: Record<string, string> = {
    reorder: "bg-amber-500/10 border-amber-500/20",
    transfer: "bg-sky-500/10 border-sky-500/20",
    overstock: "bg-rose-500/10 border-rose-500/20",
    slow: "bg-violet-500/10 border-violet-500/20",
    imbalance: "bg-orange-500/10 border-orange-500/20",
    abnormal: "bg-red-500/10 border-red-500/20",
  };
  const icons: Record<string, any> = {
    reorder: Package, transfer: ArrowRightLeft, overstock: TrendingDown,
    slow: Eye, imbalance: Scale, abnormal: AlertTriangle,
  };
  const Icon = icons[rec.type] || Lightbulb;
  const color = colors[rec.type] || "bg-white/5 border-white/10";

  return (
    <div className={`p-3 rounded-xl ${color} border`}>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-white/60" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 uppercase font-medium">{rank}.</span>
            <span className="text-[10px] text-white/70 font-medium capitalize">{rec.title}</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${rec.severity === "high" ? "bg-rose-500/20 text-rose-300" : rec.severity === "medium" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>{rec.severity}</span>
          </div>
          <p className="text-[9px] text-white/40 mt-0.5">{rec.description}</p>
          {rec.action && <p className="text-[8px] text-white/30 mt-0.5">→ {rec.action}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AiInventoryOfficer() {
  const { branchId: ctxBranchId } = useBranch();
  const { data: dashboard, refetch, isFetching } = useInventoryDashboard(ctxBranchId);
  const { data: valuation } = useInventoryValuation(ctxBranchId || 1);
  const { data: validation } = useInventoryValidation(ctxBranchId);

  const recommendations = useMemo((): AiRecommendation[] => {
    const recs: AiRecommendation[] = [];
    if (!dashboard || !valuation) return recs;

    // Low stock / reorder recommendations
    const lowItems = valuation.filter((v) => v.quantity > 0 && v.quantity < 10);
    lowItems.slice(0, 5).forEach((v) => {
      recs.push({
        type: "reorder", severity: v.quantity <= 3 ? "high" : "medium",
        title: `${v.itemName} low stock`,
        description: `Only ${v.quantity} units remaining (value: ${formatRp(v.totalValue)})`,
        action: `Reorder at least ${Math.max(20 - v.quantity, 10)} units`,
      });
    });

    // Out of stock
    const outItems = valuation.filter((v) => v.quantity <= 0);
    outItems.slice(0, 3).forEach((v) => {
      recs.push({
        type: "reorder", severity: "high",
        title: `${v.itemName} out of stock`,
        description: `Item is out of stock — immediate reorder needed`,
        action: "Place urgent purchase order",
      });
    });

    // Overstock (top 5% by value)
    const sortedByValue = [...valuation].sort((a, b) => b.totalValue - a.totalValue);
    sortedByValue.slice(0, 3).forEach((v) => {
      if (v.quantity > 50) {
        recs.push({
          type: "overstock", severity: "medium",
          title: `Overstock: ${v.itemName}`,
          description: `${v.quantity} units worth ${formatRp(v.totalValue)} — above normal threshold`,
          action: "Consider transfer to other warehouses or promotion",
        });
      }
    });

    // Negative stock
    if (dashboard.negativeStockCount > 0) {
      recs.push({
        type: "abnormal", severity: "high",
        title: "Negative stock detected",
        description: `${dashboard.negativeStockCount} items have negative stock levels`,
        action: "Run validation and adjust inventory immediately",
      });
    }

    // Warehouse imbalance
    const whValues = dashboard.warehouseDetail || [];
    if (whValues.length >= 2) {
      const maxVal = Math.max(...whValues.map((w) => w.totalValue));
      const minVal = Math.min(...whValues.map((w) => w.totalValue));
      if (maxVal > 0 && minVal > 0 && maxVal / minVal > 3) {
        recs.push({
          type: "imbalance", severity: "medium",
          title: "Warehouse value imbalance",
          description: `Highest value WH has ${Math.round(maxVal / minVal)}x more inventory value than lowest`,
          action: "Consider redistributing inventory across warehouses",
        });
      }
    }

    // Utilization alert
    whValues.filter((w) => w.utilization > 85).forEach((w) => {
      recs.push({
        type: "overstock", severity: "low",
        title: `${w.warehouseName} near capacity`,
        description: `Warehouse at ${w.utilization}% utilization`,
        action: "Consider expanding or redistributing to other warehouses",
      });
    });

    // Validation based
    if (validation) {
      const failed = validation.checks.filter((c) => c.status === "failed");
      failed.forEach((c) => {
        recs.push({
          type: "abnormal", severity: "high",
          title: `Validation: ${c.name.replace(/_/g, " ")}`,
          description: c.detail,
          action: "Run full validation and resolve issues",
        });
      });
    }

    return recs.slice(0, 15);
  }, [dashboard, valuation, validation]);

  const highCount = recommendations.filter((r) => r.severity === "high").length;
  const medCount = recommendations.filter((r) => r.severity === "medium").length;
  const lowCount = recommendations.filter((r) => r.severity === "low").length;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Breadcrumb className="mb-1">
              <BreadcrumbList className="text-[10px] text-white/30">
                <BreadcrumbItem><BreadcrumbLink href="/inventory-workspace" className="text-white/40 hover:text-white/60">Inventory</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-white/70">AI Officer</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> AI Inventory Officer</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* Executive Summary */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Recommendations" value={String(recommendations.length)} icon={Lightbulb} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Critical" value={String(highCount)} icon={AlertTriangle} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="Warning" value={String(medCount)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Info" value={String(lowCount)} icon={Eye} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Stock Health" value={dashboard ? `${dashboard.validationScore}%` : "—"} icon={Target} color={dashboard?.validationLabel === "Good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} />
          <KpiCard title="Total Value" value={dashboard ? formatRp(dashboard.totalValue) : "—"} icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" />
        </motion.div>

        {/* Summary Cards */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-[9px] text-rose-300 uppercase">Negative Stock</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{dashboard?.negativeStockCount || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-[9px] text-amber-300 uppercase">Low Stock</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{dashboard?.lowStockCount || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <p className="text-[9px] text-sky-300 uppercase">Out of Stock</p>
            <p className="text-xl font-bold text-sky-400 mt-0.5">{dashboard?.outOfStockCount || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[9px] text-emerald-300 uppercase">Active Items</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{dashboard?.totalItems || 0}</p>
          </div>
        </motion.div>

        {/* All Recommendations */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Intelligence Report</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No recommendations — inventory is healthy</p>
                </div>
              ) : recommendations.map((rec, i) => (
                <RecommendationCard key={`${rec.type}-${i}`} rec={rec} rank={i + 1} />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}