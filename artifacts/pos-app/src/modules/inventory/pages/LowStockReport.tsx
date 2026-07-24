import { useState } from "react";
import { useInventoryDashboard, useInventoryValuation, useWarehouses } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { RefreshCw, Package, AlertTriangle, Eye, TrendingDown, Warehouse, Clock, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KpiCard } from "../components/Widgets";
import { formatRp } from "@/lib/format";
import { useBranch } from "@/lib/branch";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function LowStockReport() {
  const { branchId: ctxBranchId } = useBranch();
  const [threshold, setThreshold] = useState(10);
  const [search, setSearch] = useState("");
  const { data: dashboard, refetch, isFetching } = useInventoryDashboard(ctxBranchId);
  const { data: valuation } = useInventoryValuation(ctxBranchId || 1);

  const lowItems = (valuation || []).filter((v) => v.quantity > 0 && v.quantity < threshold && v.itemName.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.quantity - b.quantity);
  const outItems = (valuation || []).filter((v) => v.quantity <= 0 && v.itemName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Breadcrumb className="mb-1">
              <BreadcrumbList className="text-[10px] text-white/30">
                <BreadcrumbItem><BreadcrumbLink href="/inventory-workspace" className="text-white/40 hover:text-white/60">Inventory</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-white/70">Low Stock</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Low Stock Report</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <KpiCard title="Low Stock" value={String(lowItems.length)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Out of Stock" value={String(outItems.length)} icon={Eye} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="Healthy" value={String((valuation || []).length - lowItems.length - outItems.length)} icon={Package} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Threshold" value={`< ${threshold}`} icon={Filter} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Critical" value={String(lowItems.filter((v) => v.quantity <= 3).length)} icon={TrendingDown} color="bg-red-500/10 text-red-400" />
        </motion.div>

        {/* Threshold + Search */}
        <motion.div {...fadeUp} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="h-10 pl-9 text-xs bg-white/5 border-white/10 text-white/70 rounded-lg placeholder:text-white/20" />
          </div>
          <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white/50 focus:outline-none appearance-none touch-manipulation">
            {[5, 10, 15, 20, 25, 50].map((t) => <option key={t} value={t}>&lt; {t}</option>)}
          </select>
        </motion.div>

        {/* Low Stock Items */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Low Stock <span className="text-white/30 font-normal">({lowItems.length})</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 max-h-[400px] overflow-y-auto">
              {lowItems.length === 0 ? <p className="text-xs text-white/20 text-center py-4">All items above threshold</p>
              : lowItems.map((v) => (
                  <div key={`${v.itemType}-${v.itemId}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate">{v.itemName}</span>
                    <span className={`text-[10px] font-medium ${v.quantity <= 3 ? "text-rose-400" : "text-amber-400"}`}>{v.quantity}</span>
                    <span className="text-[9px] text-white/30">{formatRp(v.totalValue)}</span>
                    <div className="w-10 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${v.quantity <= 3 ? "bg-rose-400" : "bg-amber-400"}`} style={{ width: `${(v.quantity / threshold) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-rose-400" /> Out of Stock <span className="text-white/30 font-normal">({outItems.length})</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 max-h-[400px] overflow-y-auto">
              {outItems.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No out-of-stock items</p>
              : outItems.map((v) => (
                  <div key={`${v.itemType}-${v.itemId}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate">{v.itemName}</span>
                    <span className="text-[10px] text-rose-400 font-medium">0</span>
                    <span className="text-[9px] text-white/30">—</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}