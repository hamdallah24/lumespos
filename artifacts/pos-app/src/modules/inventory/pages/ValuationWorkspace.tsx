import { useState, useMemo } from "react";
import { useInventoryValuation, useInventoryDashboard, useWarehouses } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Package, Warehouse, Search, Layers, ChevronRight, Hash, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KpiCard } from "../components/Widgets";
import { formatRp } from "@/lib/format";
import { useBranch } from "@/lib/branch";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ValuationWorkspace() {
  const { branchId: ctxBranchId } = useBranch();
  const [warehouseId, setWarehouseId] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "qty" | "cost">("value");

  const { data: warehouses } = useWarehouses(ctxBranchId);
  const { data: valuation, isLoading, refetch, isFetching } = useInventoryValuation(ctxBranchId || 1, warehouseId || undefined);
  const { data: dashboard } = useInventoryDashboard(ctxBranchId);

  const sorted = useMemo(() => {
    if (!valuation) return [];
    let items = [...valuation];
    if (search) items = items.filter((v) => v.itemName.toLowerCase().includes(search.toLowerCase()));
    items.sort((a, b) => sortBy === "value" ? b.totalValue - a.totalValue : sortBy === "qty" ? b.quantity - a.quantity : b.unitCost - a.unitCost);
    return items;
  }, [valuation, search, sortBy]);

  const totalValue = sorted.reduce((s, v) => s + v.totalValue, 0);
  const totalQty = sorted.reduce((s, v) => s + v.quantity, 0);
  const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

  const whValue = useMemo(() => {
    if (!dashboard?.warehouseDetail) return [];
    return dashboard.warehouseDetail.sort((a, b) => b.totalValue - a.totalValue);
  }, [dashboard]);

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Breadcrumb className="mb-1">
              <BreadcrumbList className="text-[10px] text-white/30">
                <BreadcrumbItem><BreadcrumbLink href="/inventory-workspace" className="text-white/40 hover:text-white/60">Inventory</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-white/70">Valuation</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Inventory Valuation</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <KpiCard title="Total Value" value={formatRp(totalValue)} icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Total Items" value={String(sorted.length)} icon={Hash} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Total Qty" value={String(Math.round(totalQty))} icon={Package} color="bg-violet-500/10 text-violet-400" />
          <KpiCard title="Avg Cost" value={formatRp(avgCost)} icon={TrendingDown} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Warehouses" value={String(whValue.length)} icon={Warehouse} color="bg-blue-500/10 text-blue-400" />
        </motion.div>

        {/* WH Value Breakdown + Filters */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 lg:col-span-1">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Warehouse className="w-3.5 h-3.5 text-amber-400" /> Value by WH</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 max-h-[260px] overflow-y-auto">
              {whValue.map((wh) => (
                <div key={wh.warehouseId} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/60 flex-1 truncate">{wh.warehouseName}</span>
                  <span className="text-[10px] text-white/70 font-medium">{formatRp(wh.totalValue)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="h-10 pl-9 text-xs bg-white/5 border-white/10 text-white/70 rounded-lg placeholder:text-white/20" />
              </div>
              <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))} className="h-10 rounded-lg bg-white/5 border border-white/10 px-2.5 text-xs text-white/50 focus:outline-none appearance-none touch-manipulation">
                <option value={0}>All WH</option>
                {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-10 rounded-lg bg-white/5 border border-white/10 px-2.5 text-xs text-white/50 focus:outline-none appearance-none touch-manipulation">
                <option value="value">By Value</option>
                <option value="qty">By Qty</option>
                <option value="cost">By Cost</option>
              </select>
            </div>

            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardContent className="p-0">
                {isLoading ? <div className="text-center py-8"><RefreshCw className="w-4 h-4 text-white/30 animate-spin mx-auto" /></div>
                : sorted.length === 0 ? <div className="text-center py-8 text-white/30 text-xs">No valuation data</div>
                : <div className="divide-y divide-white/[0.03] max-h-[400px] overflow-y-auto">
                    {sorted.map((v, i) => (
                      <div key={`${v.itemType}-${v.itemId}`} className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                        <span className="w-4 text-[9px] text-white/20 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/70 font-medium truncate">{v.itemName}</p>
                          <p className="text-[8px] text-white/30">Qty: {v.quantity} × {formatRp(v.unitCost)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white-70 font-medium">{formatRp(v.totalValue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}