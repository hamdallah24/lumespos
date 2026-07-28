import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, CheckCircle, XCircle, Clock, AlertTriangle, Truck, RefreshCw, Save, X, Trash2 } from "lucide-react";
import { usePurchaseOrders, useTransitionPO, useSuppliers, useCreatePurchaseOrder, useIngredients, useSemiFinished } from "../hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState, InvDrawer, InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";
import { formatRp } from "@/lib/format";
import { useBranch } from "@/lib/branch";
import type { PurchaseOrder } from "../types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400", submitted: "bg-amber-500/15 text-amber-400",
  approved: "bg-blue-500/15 text-blue-400", sent: "bg-violet-500/15 text-violet-400",
  partial: "bg-orange-500/15 text-orange-400", completed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-rose-500/15 text-rose-400",
};
const STATUS_FLOW: Record<string, string[]> = {
  draft: ["submitted", "cancelled"], submitted: ["approved", "cancelled"],
  approved: ["sent", "cancelled"], sent: ["partial", "completed", "cancelled"],
  partial: ["completed", "cancelled"], completed: [], cancelled: [],
};

type Tab = "all" | "pending" | "approved" | "active" | "completed";

export default function PurchaseOrderWorkspace() {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { branchId } = useBranch();
  const { data: pos, isLoading } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: ingredients } = useIngredients(branchId);
  const { data: semiFinished } = useSemiFinished(branchId);
  const transitionPO = useTransitionPO();
  const createPO = useCreatePurchaseOrder();

  const [formSupplier, setFormSupplier] = useState<number>(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExpected, setFormExpected] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formShipping, setFormShipping] = useState(0);
  const [formTax, setFormTax] = useState(0);
  const [formItems, setFormItems] = useState<{ itemType: string; itemId: number; name: string; quantity: number; unitCost: number }[]>([]);

  const allItems = useMemo(() => {
    const list: { type: string; id: number; name: string; cost: number }[] = [];
    if (ingredients) for (const i of ingredients) list.push({ type: "ingredient", id: i.id, name: i.name, cost: parseFloat(i.costPricePerUnit) || 0 });
    if (semiFinished) for (const s of semiFinished) list.push({ type: "semi_finished", id: s.id, name: s.name, cost: parseFloat(s.costPricePerUnit) || 0 });
    return list;
  }, [ingredients, semiFinished]);

  const formTotal = useMemo(() => {
    const items = formItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    return items + formShipping + formTax;
  }, [formItems, formShipping, formTax]);

  const supplierMap = useMemo(() => {
    if (!suppliers) return new Map<number, string>();
    return new Map(suppliers.map(s => [s.id, s.name]));
  }, [suppliers]);

  const counts = useMemo(() => {
    if (!pos) return {} as Record<string, number>;
    const c: Record<string, number> = {};
    for (const po of pos) c[po.status] = (c[po.status] || 0) + 1;
    return c;
  }, [pos]);

  const filtered = useMemo(() => {
    if (!pos) return [];
    if (tab === "all") return pos;
    if (tab === "pending") return pos.filter(po => po.status === "submitted");
    if (tab === "approved") return pos.filter(po => po.status === "approved" || po.status === "sent");
    if (tab === "active") return pos.filter(po => ["sent", "partial"].includes(po.status));
    if (tab === "completed") return pos.filter(po => po.status === "completed");
    return pos;
  }, [pos, tab]);

  const tabs: [Tab, string][] = [["all", "Semua"], ["pending", "Pending"], ["approved", "Approved"], ["active", "Active"], ["completed", "Selesai"]];

  const resetForm = () => {
    setFormSupplier(0); setFormDate(new Date().toISOString().slice(0, 10)); setFormExpected("");
    setFormNotes(""); setFormShipping(0); setFormTax(0); setFormItems([]);
  };

  const handleCreatePO = () => {
    if (!formSupplier || !branchId || formItems.length === 0) return;
    createPO.mutate({
      supplierId: formSupplier, branchId, orderDate: formDate,
      expectedDate: formExpected || undefined, notes: formNotes || undefined,
      shippingCost: formShipping || undefined, taxAmount: formTax || undefined,
      items: formItems.map(i => ({ itemType: i.itemType, itemId: i.itemId, quantityOrdered: i.quantity, unitCost: i.unitCost })),
    }, { onSuccess: () => { resetForm(); setShowForm(false); } });
  };

  const addItem = (type: string, id: number, name: string, cost: number) => {
    if (formItems.some(i => i.itemType === type && i.itemId === id)) return;
    setFormItems(prev => [...prev, { itemType: type, itemId: id, name, quantity: 1, unitCost: cost }]);
  };

  const updateItemQty = (idx: number, qty: number) => {
    setFormItems(prev => prev.map((i, j) => j === idx ? { ...i, quantity: Math.max(0, qty) } : i));
  };

  const updateItemCost = (idx: number, cost: number) => {
    setFormItems(prev => prev.map((i, j) => j === idx ? { ...i, unitCost: Math.max(0, cost) } : i));
  };

  const removeItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, j) => j !== idx));
  };

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <InvSectionHeader icon={FileText} title="Purchase Orders" subtitle={`${pos?.length || 0} total PO`} />
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="h-10 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Buat PO
          </button>
        </div>

        {/* KPI Grid */}
        {isLoading ? (
          <InvLoadingSkeleton rows={1} cols={7} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <InvKpiCard title="Draft" value={String(counts.draft || 0)} icon={FileText} color="bg-slate-500/15 text-slate-400" />
            <InvKpiCard title="Submitted" value={String(counts.submitted || 0)} icon={Clock} color="bg-amber-500/15 text-amber-400" />
            <InvKpiCard title="Approved" value={String(counts.approved || 0)} icon={CheckCircle} color="bg-blue-500/15 text-blue-400" />
            <InvKpiCard title="Sent" value={String(counts.sent || 0)} icon={Truck} color="bg-violet-500/15 text-violet-400" />
            <InvKpiCard title="Partial" value={String(counts.partial || 0)} icon={AlertTriangle} color="bg-orange-500/15 text-orange-400" />
            <InvKpiCard title="Completed" value={String(counts.completed || 0)} icon={CheckCircle} color="bg-emerald-500/15 text-emerald-400" />
            <InvKpiCard title="Cancelled" value={String(counts.cancelled || 0)} icon={XCircle} color="bg-rose-500/15 text-rose-400" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all min-h-10 flex-shrink-0 ${
                tab === key ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"
              }`}>{label}</button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <InvLoadingSkeleton rows={5} cols={6} />
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">PO Number</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po, i) => {
                    const nextStatuses = STATUS_FLOW[po.status] || [];
                    return (
                      <motion.tr key={po.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => setSelected(selected?.id === po.id ? null : po)}
                        className={`border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors ${selected?.id === po.id ? "bg-orange-500/[0.04]" : ""}`}>
                        <td className="px-4 py-3 text-orange-400 font-mono text-[10px]">{po.poNumber}</td>
                        <td className="px-4 py-3 text-white/70 hidden sm:table-cell">{supplierMap.get(po.supplierId) || `#${po.supplierId}`}</td>
                        <td className="px-4 py-3 text-white/50 hidden sm:table-cell">{po.orderDate}</td>
                        <td className="px-4 py-3 text-right text-white/70 font-medium">{formatRp(po.totalAmount)}</td>
                        <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[po.status] || "text-white/30"}`}>{po.status}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {nextStatuses.filter(s => s !== "cancelled").map(s => (
                              <button key={s}
                                className="h-6 px-2 rounded-lg bg-orange-500/20 text-orange-400 text-[10px] font-medium hover:bg-orange-500/30"
                                onClick={(e) => { e.stopPropagation(); transitionPO.mutate({ id: po.id, status: s }); }}>
                                {s === "approved" ? "Approve" : s === "submitted" ? "Submit" : s === "sent" ? "Send" : s === "completed" ? "Complete" : s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12">
                      <FileText className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                      <p className="text-xs text-white/20">Tidak ada PO</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <InvDrawer open={!!selected} onClose={() => setSelected(null)} title={selected.poNumber}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Supplier</p>
                  <p className="text-sm text-white/70 mt-0.5">{supplierMap.get(selected.supplierId) || `#${selected.supplierId}`}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Status</p>
                  <p className={`text-sm font-medium mt-0.5 ${STATUS_COLORS[selected.status]?.split(" ")[1]}`}>{selected.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Order Date</p>
                  <p className="text-sm text-white/70 mt-0.5">{selected.orderDate}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Expected</p>
                  <p className="text-sm text-white/70 mt-0.5">{selected.expectedDate || "-"}</p>
                </div>
              </div>
              <div className="bg-orange-500/[0.06] border border-orange-500/10 rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold text-orange-400 mt-0.5">{formatRp(selected.totalAmount)}</p>
              </div>
              {selected.items && selected.items.length > 0 && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-1">
                    {selected.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs text-white/60">{item.itemType} #{item.itemId}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/30">{item.quantityOrdered} x {formatRp(item.unitCost)}</span>
                          <span className="text-xs text-orange-400 font-medium">{formatRp(item.totalCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nextStatuses(selected.status).length > 0 && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Actions</p>
                  <div className="flex gap-2">
                    {nextStatuses(selected.status).filter(s => s !== "cancelled").map(s => (
                      <button key={s}
                        className="h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30"
                        onClick={() => { transitionPO.mutate({ id: selected.id, status: s }); setSelected(null); }}>
                        {s === "approved" ? "Approve" : s === "submitted" ? "Submit" : s === "sent" ? "Send" : s === "completed" ? "Complete" : s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </InvDrawer>
        )}
      </AnimatePresence>
      {/* Create PO Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400" /> Buat PO Baru</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Supplier & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Supplier *</label>
                    <select value={formSupplier} onChange={e => setFormSupplier(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50">
                      <option value={0} className="bg-[#0d1128]">Pilih supplier...</option>
                      {suppliers?.map(s => <option key={s.id} value={s.id} className="bg-[#0d1128]">{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Tanggal Order *</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Estimasi Datang</label>
                    <input type="date" value={formExpected} onChange={e => setFormExpected(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                {/* Add Items */}
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Item yang Dipesan *</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {allItems.filter(i => !formItems.some(fi => fi.itemType === i.type && fi.itemId === i.id)).slice(0, 20).map(i => (
                      <button key={`${i.type}-${i.id}`} onClick={() => addItem(i.type, i.id, i.name, i.cost)}
                        className="h-7 px-2.5 rounded-lg bg-white/5 text-white/50 text-[10px] hover:bg-orange-500/10 hover:text-orange-400 border border-white/5 transition-colors">
                        {i.name}
                      </button>
                    ))}
                  </div>
                  {formItems.length === 0 && <p className="text-[10px] text-white/20">Klik item di atas untuk menambahkan ke PO</p>}
                </div>

                {/* Items Table */}
                {formItems.length > 0 && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                          <th className="text-left px-3 py-2 font-medium">Item</th>
                          <th className="text-left px-3 py-2 font-medium">Tipe</th>
                          <th className="text-right px-3 py-2 font-medium">Qty</th>
                          <th className="text-right px-3 py-2 font-medium">Harga/Unit</th>
                          <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                          <th className="w-8 px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.map((item, idx) => (
                          <tr key={`${item.itemType}-${item.itemId}`} className="border-b border-white/[0.02]">
                            <td className="px-3 py-2 text-white/70">{item.name}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.itemType === "ingredient" ? "bg-blue-500/15 text-blue-400" : "bg-violet-500/15 text-violet-400"}`}>
                                {item.itemType === "ingredient" ? "Bahan" : "Setengah Jadi"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min="0" step="1" value={item.quantity} onChange={e => updateItemQty(idx, Number(e.target.value))}
                                className="w-16 h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] text-right outline-none focus:border-orange-500/50" />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min="0" step="100" value={item.unitCost} onChange={e => updateItemCost(idx, Number(e.target.value))}
                                className="w-24 h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] text-right outline-none focus:border-orange-500/50" />
                            </td>
                            <td className="px-3 py-2 text-right text-orange-400 font-medium text-[10px]">{formatRp(item.quantity * item.unitCost)}</td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Notes & Costs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Catatan</label>
                    <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Catatan PO..."
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Ongkir</label>
                    <input type="number" min="0" value={formShipping} onChange={e => setFormShipping(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Pajak</label>
                    <input type="number" min="0" value={formTax} onChange={e => setFormTax(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                {/* Total */}
                <div className="bg-orange-500/[0.06] border border-orange-500/10 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">Total PO</span>
                  <span className="text-lg font-bold text-orange-400">{formatRp(formTotal)}</span>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Batal</button>
                <button onClick={handleCreatePO} disabled={createPO.isPending || !formSupplier || formItems.length === 0}
                  className="h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5">
                  <Save className="w-3 h-3" /> {createPO.isPending ? "Membuat..." : "Buat PO"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function nextStatuses(status: string): string[] {
  const flow: Record<string, string[]> = {
    draft: ["submitted"], submitted: ["approved"], approved: ["sent"],
    sent: ["partial", "completed"], partial: ["completed"], completed: [], cancelled: [],
  };
  return flow[status] || [];
}
