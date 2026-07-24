import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, CheckCircle, Clock, AlertTriangle, RefreshCw, Plus, Save, X } from "lucide-react";
import { useGoodsReceipts, usePurchaseOrders, useCreateGoodsReceipt, useWarehouses } from "../hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState, InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";
import { formatRp } from "@/lib/format";
import { useBranch } from "@/lib/branch";
import type { GoodsReceipt } from "../types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400", completed: "bg-emerald-500/15 text-emerald-400",
  voided: "bg-rose-500/15 text-rose-400",
};

export default function GoodsReceiptWorkspace() {
  const { data: grs, isLoading } = useGoodsReceipts();
  const { data: pos } = usePurchaseOrders();
  const [selectedGR, setSelectedGR] = useState<GoodsReceipt | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { branchId } = useBranch();
  const { data: warehouses } = useWarehouses(branchId);
  const createGR = useCreateGoodsReceipt();

  const [formPO, setFormPO] = useState<number>(0);
  const [formWH, setFormWH] = useState<number>(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");

  const receivablePOs = useMemo(() => {
    if (!pos) return [];
    return pos.filter(po => ["sent", "partial"].includes(po.status));
  }, [pos]);

  const selectedPO = useMemo(() => {
    if (!formPO || !pos) return null;
    return pos.find(p => p.id === formPO) || null;
  }, [formPO, pos]);

  const handleCreateGR = () => {
    if (!formPO || !formWH || !branchId) return;
    createGR.mutate({
      poId: formPO, branchId, warehouseId: formWH, receivedDate: formDate, notes: formNotes || undefined,
    }, { onSuccess: () => { setFormPO(0); setFormWH(0); setFormDate(new Date().toISOString().slice(0, 10)); setFormNotes(""); setShowForm(false); } });
  };

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <InvSectionHeader icon={Package} title="Goods Receipt" subtitle={`${grs?.length || 0} receipt, ${receivablePOs.length} PO menunggu`} />
          {receivablePOs.length > 0 && (
            <button onClick={() => setShowForm(true)}
              className="h-10 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Terima Barang
            </button>
          )}
        </div>

        {/* KPI */}
        {isLoading ? (
          <InvLoadingSkeleton rows={1} cols={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <InvKpiCard title="Total Receipt" value={String(grs?.length || 0)} icon={Package} color="bg-emerald-500/15 text-emerald-400" />
            <InvKpiCard title="Menunggu Diterima" value={String(receivablePOs.length)} icon={Clock} color="bg-amber-500/15 text-amber-400" />
            <InvKpiCard title="Selesai" value={String((grs || []).filter(g => g.status === "completed").length)} icon={CheckCircle} color="bg-blue-500/15 text-blue-400" />
            <InvKpiCard title="VOID" value={String((grs || []).filter(g => g.status === "voided").length)} icon={AlertTriangle} color="bg-rose-500/15 text-rose-400" />
          </div>
        )}

        {/* Incoming PO Queue */}
        <InvGlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-white">PO Menunggu Receipt</h3>
            <span className="text-[9px] text-white/20 ml-auto">{receivablePOs.length} PO</span>
          </div>
          <div className="space-y-2">
            {receivablePOs.length > 0 ? receivablePOs.map((po, i) => (
              <motion.div key={po.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs text-white/70 font-mono">{po.poNumber}</span>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {po.items?.length || 0} items · {formatRp(po.totalAmount)}
                    </div>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${po.status === "partial" ? "bg-orange-500/15 text-orange-400" : "bg-violet-500/15 text-violet-400"}`}>
                  {po.status}
                </span>
              </motion.div>
            )) : (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                <p className="text-xs text-white/20">Semua PO sudah diterima</p>
              </div>
            )}
          </div>
        </InvGlassCard>

        {/* Receipt History Table */}
        {isLoading ? (
          <InvLoadingSkeleton rows={5} cols={4} />
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">GR Number</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">PO</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(grs || []).map((gr, i) => (
                    <motion.tr key={gr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      onClick={() => setSelectedGR(selectedGR?.id === gr.id ? null : gr)}
                      className={`border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedGR?.id === gr.id ? "bg-orange-500/[0.04]" : ""}`}>
                      <td className="px-4 py-3 text-emerald-400 font-mono text-[10px]">{gr.grNumber}</td>
                      <td className="px-4 py-3 text-white/50 font-mono text-[10px] hidden sm:table-cell">{gr.poNumber || `#${gr.poId}`}</td>
                      <td className="px-4 py-3 text-white/50 hidden sm:table-cell">{gr.receivedDate}</td>
                      <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[gr.status] || "text-white/30"}`}>{gr.status}</span></td>
                    </motion.tr>
                  ))}
                  {(!grs || grs.length === 0) && (
                    <tr><td colSpan={4} className="text-center py-12">
                      <Package className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                      <p className="text-xs text-white/20">Belum ada receipt</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create GR Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Package className="w-4 h-4 text-orange-400" /> Terima Barang</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Pilih PO *</label>
                  <select value={formPO} onChange={e => setFormPO(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50">
                    <option value={0} className="bg-[#0d1128]">Pilih PO yang akan diterima...</option>
                    {receivablePOs.map(po => (
                      <option key={po.id} value={po.id} className="bg-[#0d1128]">{po.poNumber} — {po.supplierName || `Supplier #${po.supplierId}`} ({po.items?.length || 0} item)</option>
                    ))}
                  </select>
                </div>

                {/* PO Detail Preview */}
                {selectedPO && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-white/30">Supplier:</span> <span className="text-white/70">{selectedPO.supplierName || `#${selectedPO.supplierId}`}</span></div>
                      <div><span className="text-white/30">Status:</span> <span className="text-orange-400">{selectedPO.status}</span></div>
                      <div><span className="text-white/30">Total:</span> <span className="text-white/70">{formatRp(selectedPO.totalAmount)}</span></div>
                      <div><span className="text-white/30">Items:</span> <span className="text-white/70">{selectedPO.items?.length || 0}</span></div>
                    </div>
                    {selectedPO.items && selectedPO.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                        {selectedPO.items.map(item => (
                          <div key={item.id} className="flex justify-between text-[10px]">
                            <span className="text-white/50">{item.itemType === "ingredient" ? "Bahan" : "Setengah Jadi"} #{item.itemId}</span>
                            <span className="text-white/40">{item.quantityOrdered} dipesan · {item.quantityReceived} diterima</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Gudang *</label>
                    <select value={formWH} onChange={e => setFormWH(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50">
                      <option value={0} className="bg-[#0d1128]">Pilih gudang...</option>
                      {warehouses?.map(w => <option key={w.id} value={w.id} className="bg-[#0d1128]">{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Tanggal Diterima *</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Catatan</label>
                  <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Catatan receipt..."
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                </div>

                <p className="text-[9px] text-white/20">Semua item pada PO akan otomatis diterima sesuai qty yang belum diterima.</p>
              </div>
              <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Batal</button>
                <button onClick={handleCreateGR} disabled={createGR.isPending || !formPO || !formWH}
                  className="h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5">
                  <Save className="w-3 h-3" /> {createGR.isPending ? "Memproses..." : "Terima Barang"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
