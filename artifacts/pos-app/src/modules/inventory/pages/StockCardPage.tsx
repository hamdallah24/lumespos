import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useStockCard, useWarehouses, useStockCardSearch, useInventoryValuation, useInventoryDashboard } from "../hooks/useInventory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { formatRp } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpRight, ArrowDownRight, Download, Package, RotateCw, TrendingUp, TrendingDown, Grid3X3, Clock, DollarSign, X, ChevronLeft, ChevronRight, Filter, RefreshCw, User, Tag, FileText, Layers, Hash, ExternalLink, SlidersHorizontal } from "lucide-react";
import type { StockCardEntry } from "../types";
import { KpiCard } from "../components/Widgets";
import { useBranch } from "@/lib/branch";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function MovementDetailPanel({ entry, onClose, itemName }: { entry: StockCardEntry; onClose: () => void; itemName?: string }) {
  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0d1128] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className={entry.direction === "in" ? "text-emerald-400" : "text-rose-400"}>
            {entry.direction === "in" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </span>
          Movement Detail
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <InfoBlock label="Movement Type" value={entry.movementType.replace(/_/g, " ")} capitalize />
          <InfoBlock label="Direction" value={entry.direction} badge={entry.direction === "in" ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"} capitalize />
          <InfoBlock label="Date" value={format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: id })} />
          <InfoBlock label="Item" value={itemName || `${entry.itemType} #${entry.itemId}`} />
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2 font-medium">Running Balance</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoBlock label="Qty Before" value={String(entry.qtyBefore)} />
            <InfoBlock label="Qty After" value={String(entry.qtyAfter)} />
            <InfoBlock label="Value Before" value={formatRp(entry.valueBefore)} />
            <InfoBlock label="Value After" value={formatRp(entry.valueAfter)} />
          </div>
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2 font-medium">Transaction</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoBlock label="Qty Change" value={`${entry.direction === "in" ? "+" : "-"}${entry.qtyChange}`} />
            <InfoBlock label="Value Change" value={formatRp(entry.valueChange)} />
            <InfoBlock label="Unit Cost" value={entry.unitCost ? formatRp(entry.unitCost) : "—"} />
          </div>
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2 font-medium">Reference</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoBlock label="Reference Type" value={entry.referenceType || "—"} />
            <InfoBlock label="Reference ID" value={entry.referenceId ? `#${entry.referenceId}` : "—"} />
            <InfoBlock label="Batch ID" value={entry.batchId || "—"} />
            <InfoBlock label="Created By" value={entry.createdBy ? `User #${entry.createdBy}` : "—"} />
          </div>
        </div>

        {entry.description && (
          <div className="border-t border-white/5 pt-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 font-medium">Description</p>
            <p className="text-white/60">{entry.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoBlock({ label, value, badge, capitalize }: { label: string; value: string; badge?: string; capitalize?: boolean }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
      <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-medium mt-0.5 ${badge || "text-white/70"} ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function TimelineRow({ entry, maxQty, onClick }: { entry: StockCardEntry; maxQty: number; onClick: () => void }) {
  const pct = maxQty > 0 ? (entry.qtyAfter / maxQty) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-white/[0.03] last:border-0 group"
    >
      {/* Time */}
      <div className="w-14 shrink-0 text-right">
        <p className="text-[10px] text-white/40">{format(new Date(entry.createdAt), "dd MMM", { locale: id })}</p>
        <p className="text-[8px] text-white/20">{format(new Date(entry.createdAt), "HH:mm")}</p>
      </div>

      {/* Direction icon + type */}
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${entry.direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
          {entry.direction === "in" ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowDownRight className="w-2.5 h-2.5 text-rose-400" />}
        </span>
        <span className="text-[10px] text-white/60 capitalize truncate">{entry.movementType.replace(/_/g, " ")}</span>
      </div>

      {/* Qty Before */}
      <div className="w-10 shrink-0 text-right">
        <p className="text-[10px] text-white/40">{entry.qtyBefore}</p>
      </div>

      {/* Qty Change */}
      <div className="w-10 shrink-0 text-right">
        <p className={`text-[10px] font-medium ${entry.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>
          {entry.direction === "in" ? "+" : "-"}{entry.qtyChange}
        </p>
      </div>

      {/* Qty After + bar */}
      <div className="flex-1 min-w-[60px] flex items-center gap-1.5">
        <span className="text-[10px] text-white font-medium w-6 text-right">{entry.qtyAfter}</span>
        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden hidden sm:block">
          <div className={`h-full rounded-full transition-all ${pct > 60 ? "bg-emerald-400" : pct > 30 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      {/* Value Before */}
      <div className="w-16 shrink-0 text-right hidden md:block">
        <p className="text-[9px] text-white/30">{formatRp(entry.valueBefore)}</p>
      </div>

      {/* Value After */}
      <div className="w-16 shrink-0 text-right hidden md:block">
        <p className="text-[9px] text-white/60">{formatRp(entry.valueAfter)}</p>
      </div>

      {/* Ref */}
      <div className="w-12 shrink-0 text-right hidden lg:block">
        {entry.referenceType ? <p className="text-[8px] text-white/30">{entry.referenceType}#{entry.referenceId}</p> : <p className="text-[8px] text-white/20">—</p>}
      </div>

      {/* Chevron */}
      <div className="w-4 shrink-0 text-white/20 group-hover:text-white/40 transition-colors hidden sm:block">
        <ChevronRight className="w-3 h-3 ml-auto" />
      </div>
    </motion.div>
  );
}

export default function StockCardPage() {
  const { branchId: ctxBranchId } = useBranch();
  const [branchId, setBranchId] = useState<number>(ctxBranchId || 1);
  const [warehouseId, setWarehouseId] = useState<number>(0);
  const [itemType, setItemType] = useState<string>("ingredient");
  const [itemId, setItemId] = useState<number>(0);
  const [itemName, setItemName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<StockCardEntry | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRef, setFilterRef] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ctxBranchId) setBranchId(ctxBranchId); }, [ctxBranchId]);

  const { data: warehouses } = useWarehouses(branchId);
  const effectiveWh = warehouseId || warehouses?.[0]?.id || 0;
  const { data, isLoading, refetch, isFetching } = useStockCard(branchId, effectiveWh, itemType, itemId, page, 25);
  const { data: searchResults, isFetching: searchLoading } = useStockCardSearch(branchId, searchQuery);
  const { data: valuation } = useInventoryValuation(branchId, effectiveWh);
  const { data: dashboard } = useInventoryDashboard(branchId);

  const itemValuation = useMemo(() => {
    if (!valuation) return null;
    return valuation.find((v) => v.itemType === itemType && v.itemId === itemId) || null;
  }, [valuation, itemType, itemId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectItem = (item: { itemType: string; itemId: number; itemName: string }) => {
    setItemType(item.itemType);
    setItemId(item.itemId);
    setItemName(item.itemName);
    setSearchQuery("");
    setShowSearch(false);
    setPage(1);
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (filterType !== "all") items = items.filter((e) => e.movementType === filterType);
    if (filterRef) items = items.filter((e) => (e.referenceType && e.referenceType.toLowerCase().includes(filterRef.toLowerCase())) || String(e.referenceId).includes(filterRef));
    return items;
  }, [data, filterType, filterRef]);

  const movementTypes = useMemo(() => {
    if (!data?.items) return [];
    return [...new Set(data.items.map((e) => e.movementType))];
  }, [data]);

  const totalIn = useMemo(() => filteredItems.filter((e) => e.direction === "in").reduce((s, e) => s + e.qtyChange, 0) || 0, [filteredItems]);
  const totalOut = useMemo(() => filteredItems.filter((e) => e.direction === "out").reduce((s, e) => s + e.qtyChange, 0) || 0, [filteredItems]);
  const lastEntry = data?.items?.[0];
  const currentBalance = lastEntry?.qtyAfter || 0;
  const maxQty = useMemo(() => Math.max(...(filteredItems.map((e) => e.qtyAfter) || [1]), 1), [filteredItems]);
  const avgCost = itemValuation?.unitCost || (currentBalance > 0 && lastEntry ? lastEntry.valueAfter / currentBalance : 0);

  const clearItem = () => { setItemId(0); setItemName(""); setSearchQuery(""); };

  const exportCSV = useCallback(() => {
    if (!filteredItems.length) return;
    const headers = ["Date", "Type", "Direction", "Qty Before", "Qty Change", "Qty After", "Value Before", "Value Change", "Value After", "Unit Cost", "Reference", "Batch", "Description"];
    const rows = filteredItems.map((e) => [
      format(new Date(e.createdAt), "yyyy-MM-dd HH:mm:ss"),
      e.movementType, e.direction, e.qtyBefore, e.qtyChange, e.qtyAfter,
      e.valueBefore, e.valueChange, e.valueAfter, e.unitCost || "",
      e.referenceType ? `${e.referenceType}#${e.referenceId}` : "",
      e.batchId || "", e.description || ""
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `stock-card-${itemName || itemId}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [filteredItems, itemName, itemId]);

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto">
        {/* BREADCRUMB + HEADER */}
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Breadcrumb className="mb-1">
              <BreadcrumbList className="text-[10px] text-white/30">
                <BreadcrumbItem><BreadcrumbLink href="/inventory-workspace" className="text-white/40 hover:text-white/60">Inventory</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Stock Card</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Stock Card</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={exportCSV} disabled={!filteredItems.length} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </motion.div>

        {/* FILTERS ROW */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <select value={branchId} onChange={(e) => { setBranchId(Number(e.target.value)); clearItem(); }} className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white/70 focus:outline-none focus:border-white/20 appearance-none touch-manipulation">
            <option value={1}>Branch 1</option>
            <option value={2}>Branch 2</option>
          </select>
          <select value={warehouseId} onChange={(e) => { setWarehouseId(Number(e.target.value)); setPage(1); }} className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white/70 focus:outline-none focus:border-white/20 appearance-none touch-manipulation">
            <option value={0}>All Warehouses</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          {/* Item Search */}
          <div className="relative col-span-2 sm:col-span-2 lg:col-span-3" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={itemName || searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setItemName(""); setItemId(0); setShowSearch(true); }}
                onFocus={() => { if (!itemName && searchQuery.length >= 2) setShowSearch(true); }}
                placeholder="Search item by name..." className="h-10 pl-9 pr-9 text-xs bg-white/5 border-white/10 text-white/70 rounded-lg placeholder:text-white/20" />
              {itemName && <button onClick={clearItem} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 touch-manipulation"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {showSearch && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1128] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {searchLoading ? <div className="p-3 text-xs text-white/30 text-center">Searching...</div>
                : searchResults?.length === 0 ? <div className="p-3 text-xs text-white/30 text-center">No items found</div>
                : searchResults?.map((item) => (
                    <button key={`${item.itemType}-${item.itemId}`} onClick={() => selectItem(item)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <span className="text-[10px] uppercase text-white/30 w-20 shrink-0">{item.itemType.replace(/_/g, " ")}</span>
                      <span className="text-xs text-white font-medium truncate">{item.itemName}</span>
                      <span className="text-[10px] text-white/30 ml-auto">#{item.itemId}</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </motion.div>

        {/* SELECTED ITEM + TIMELINE FILTERS */}
        {itemId > 0 && itemName && (
          <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400/10 flex items-center justify-center"><Package className="w-2.5 h-2.5 text-amber-400" /></span>
              <span className="text-xs text-white/60">{itemName}</span>
              <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{itemType.replace(/_/g, " ")} #{itemId}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 rounded-lg bg-white/5 border border-white/10 px-2.5 text-[10px] text-white/50 focus:outline-none appearance-none touch-manipulation">
                <option value="all">All Types</option>
                {movementTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </motion.div>
        )}

        {/* KPI CARDS */}
        {itemId > 0 && (
          <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <KpiCard title="Movement Today" value={String(dashboard?.recentMovements || 0)} icon={Clock} color="bg-violet-500/10 text-violet-400" />
            <KpiCard title="Inbound Qty" value={String(totalIn)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
            <KpiCard title="Outbound Qty" value={String(totalOut)} icon={TrendingDown} color="bg-rose-500/10 text-rose-400" />
            <KpiCard title="Inventory Value" value={itemValuation ? formatRp(itemValuation.totalValue) : "—"} icon={DollarSign} color="bg-amber-500/10 text-amber-400" />
            <KpiCard title="Average Cost" value={avgCost ? formatRp(avgCost) : "—"} icon={Tag} color="bg-sky-500/10 text-sky-400" />
            <KpiCard title="Current Stock" value={String(currentBalance)} icon={Grid3X3} color="bg-blue-500/10 text-blue-400" />
          </motion.div>
        )}

        {/* TIMELINE */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><RotateCw className="w-5 h-5 text-white/30 animate-spin" /></div>
        ) : effectiveWh && itemId ? (
          <motion.div {...fadeUp}>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs text-white/60">Movement Timeline <span className="text-white/30">({data?.total || 0} entries)</span></span>
                </div>
                {/* Column headers */}
                <div className="hidden md:flex items-center gap-3 text-[8px] text-white/20 uppercase tracking-wider">
                  <span className="w-16 text-right">V. Before</span>
                  <span className="w-16 text-right">V. After</span>
                </div>
              </div>
              <CardContent className="p-0">
                {/* Timeline column labels (sticky) */}
                <div className="px-2 sm:px-3 py-1.5 border-b border-white/[0.03] flex items-center gap-2 sm:gap-3 text-[8px] text-white/20 uppercase tracking-wider">
                  <span className="w-14 shrink-0 text-right">Date</span>
                  <span className="w-24 shrink-0">Type</span>
                  <span className="w-10 shrink-0 text-right">Before</span>
                  <span className="w-10 shrink-0 text-right">Δ</span>
                  <span className="flex-1 min-w-[60px]">Balance</span>
                  <span className="w-16 shrink-0 text-right hidden md:block">V.Before</span>
                  <span className="w-16 shrink-0 text-right hidden md:block">V.After</span>
                  <span className="w-12 shrink-0 text-right hidden lg:block">Ref</span>
                  <span className="w-4 shrink-0 hidden sm:block" />
                </div>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-xs">No movements match the selected filters</div>
                ) : (
                  filteredItems.map((entry) => (
                    <TimelineRow key={entry.id} entry={entry} maxQty={maxQty} onClick={() => setSelectedEntry(entry)} />
                  ))
                )}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/5">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-30 touch-manipulation">
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-[10px] text-white/30">Page {page} of {data.totalPages}</span>
                    <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-30 touch-manipulation">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div {...fadeUp}>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardContent className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3"><Search className="w-4 h-4 text-white/30" /></div>
                <p className="text-sm text-white/40">Select a warehouse and search for an item</p>
                <p className="text-xs text-white/20 mt-1">Type at least 2 characters to search by item name</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* MOVEMENT DETAIL PANEL */}
      <AnimatePresence>
        {selectedEntry && <><div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedEntry(null)} /><MovementDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} itemName={itemName} /></>}
      </AnimatePresence>
    </div>
  );
}