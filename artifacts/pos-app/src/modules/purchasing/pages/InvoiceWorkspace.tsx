import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, CheckCircle, Clock, Shield, RefreshCw, Plus, Save, X } from "lucide-react";
import { useInvoices, useApproveInvoice, useSuppliers, usePurchaseOrders, useCreateInvoice } from "../hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState, InvDrawer, InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";
import { formatRp } from "@/lib/format";
import type { SupplierInvoice } from "../types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400", submitted: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400", paid: "bg-blue-500/15 text-blue-400",
  voided: "bg-rose-500/15 text-rose-400",
};
const MATCH_COLORS: Record<string, string> = {
  pending: "bg-slate-500/15 text-slate-400", passed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-rose-500/15 text-rose-400",
};

type Tab = "all" | "submitted" | "approved" | "paid";

export default function InvoiceWorkspace() {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { data: invoices, isLoading } = useInvoices();
  const { data: suppliers } = useSuppliers();
  const { data: pos } = usePurchaseOrders();
  const approveInvoice = useApproveInvoice();
  const createInvoice = useCreateInvoice();

  const [formPO, setFormPO] = useState<number>(0);
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formNotes, setFormNotes] = useState("");

  const invoicablePOs = useMemo(() => {
    if (!pos) return [];
    return pos.filter(po => ["partial", "completed", "sent"].includes(po.status));
  }, [pos]);

  const selectedPO = useMemo(() => {
    if (!formPO || !pos) return null;
    return pos.find(p => p.id === formPO) || null;
  }, [formPO, pos]);

  const handleCreateInvoice = () => {
    if (!formPO || !formInvoiceNo || !formAmount) return;
    createInvoice.mutate({
      invoiceNumber: formInvoiceNo, supplierId: selectedPO?.supplierId || 0, poId: formPO,
      invoiceDate: formInvoiceDate, dueDate: formDueDate || undefined, totalAmount: formAmount,
      notes: formNotes || undefined,
    }, { onSuccess: () => { setFormPO(0); setFormInvoiceNo(""); setFormAmount(0); setFormNotes(""); setShowForm(false); } });
  };

  const supplierMap = useMemo(() => {
    if (!suppliers) return new Map<number, string>();
    return new Map(suppliers.map(s => [s.id, s.name]));
  }, [suppliers]);

  const poMap = useMemo(() => {
    if (!pos) return new Map<number, string>();
    return new Map(pos.map(p => [p.id, p.poNumber]));
  }, [pos]);

  const counts = useMemo(() => {
    if (!invoices) return {} as Record<string, number>;
    const c: Record<string, number> = {};
    for (const inv of invoices) c[inv.status] = (c[inv.status] || 0) + 1;
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (tab === "all") return invoices;
    return invoices.filter(i => i.status === tab);
  }, [invoices, tab]);

  const tabs: [Tab, string][] = [["all", "Semua"], ["submitted", "Menunggu"], ["approved", "Approved"], ["paid", "Dibayar"]];

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <InvSectionHeader icon={Receipt} title="Supplier Invoices" subtitle={`${invoices?.length || 0} total invoice`} />
          <button onClick={() => setShowForm(true)}
            className="h-10 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Invoice Baru
          </button>
        </div>

        {/* KPI */}
        {isLoading ? (
          <InvLoadingSkeleton rows={1} cols={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <InvKpiCard title="Draft" value={String(counts.draft || 0)} icon={Receipt} color="bg-slate-500/15 text-slate-400" />
            <InvKpiCard title="Submitted" value={String(counts.submitted || 0)} icon={Clock} color="bg-amber-500/15 text-amber-400" />
            <InvKpiCard title="Approved" value={String(counts.approved || 0)} icon={CheckCircle} color="bg-emerald-500/15 text-emerald-400" />
            <InvKpiCard title="Paid" value={String(counts.paid || 0)} icon={CheckCircle} color="bg-blue-500/15 text-blue-400" />
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
          <InvLoadingSkeleton rows={5} cols={7} />
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">PO</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">Match</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, i) => (
                    <motion.tr key={inv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                      className={`border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors ${selected?.id === inv.id ? "bg-orange-500/[0.04]" : ""}`}>
                      <td className="px-4 py-3 text-orange-400 font-mono text-[10px]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-white/70 hidden sm:table-cell">{supplierMap.get(inv.supplierId) || `#${inv.supplierId}`}</td>
                      <td className="px-4 py-3 text-white/50 font-mono text-[10px] hidden sm:table-cell">{poMap.get(inv.poId) || `#${inv.poId}`}</td>
                      <td className="px-4 py-3 text-white/50 hidden sm:table-cell">{inv.invoiceDate}</td>
                      <td className="px-4 py-3 text-right text-white/70 font-medium">{formatRp(inv.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${MATCH_COLORS[inv.threeWayMatchStatus || "pending"]}`}>
                          {inv.threeWayMatchStatus === "passed" ? "Match" : inv.threeWayMatchStatus === "failed" ? "Mismatch" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[inv.status] || "text-white/30"}`}>{inv.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === "submitted" && inv.threeWayMatchStatus === "passed" && (
                          <button
                            className="h-6 px-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/30"
                            onClick={(e) => { e.stopPropagation(); approveInvoice.mutate(inv.id); }} disabled={approveInvoice.isPending}>Approve</button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12">
                      <Receipt className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                      <p className="text-xs text-white/20">Tidak ada invoice</p>
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
          <InvDrawer open={!!selected} onClose={() => setSelected(null)} title={selected.invoiceNumber}>
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
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">PO</p>
                  <p className="text-sm text-white/70 mt-0.5 font-mono">{poMap.get(selected.poId) || `#${selected.poId}`}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Tanggal</p>
                  <p className="text-sm text-white/70 mt-0.5">{selected.invoiceDate}</p>
                </div>
              </div>
              <div className="bg-orange-500/[0.06] border border-orange-500/10 rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold text-orange-400 mt-0.5">{formatRp(selected.totalAmount)}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">3-Way Match</p>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-white/40" />
                  <span className={`text-sm font-medium ${selected.threeWayMatchStatus === "passed" ? "text-emerald-400" : selected.threeWayMatchStatus === "failed" ? "text-rose-400" : "text-white/50"}`}>
                    {selected.threeWayMatchStatus === "passed" ? "Matched" : selected.threeWayMatchStatus === "failed" ? "Mismatch" : "Pending"}
                  </span>
                </div>
              </div>
              {selected.status === "submitted" && selected.threeWayMatchStatus === "passed" && (
                <button onClick={() => { approveInvoice.mutate(selected.id); setSelected(null); }}
                  className="w-full h-10 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve Invoice
                </button>
              )}
            </div>
          </InvDrawer>
        )}
      </AnimatePresence>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-400" /> Invoice Baru</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Pilih PO *</label>
                  <select value={formPO} onChange={e => setFormPO(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50">
                    <option value={0} className="bg-[#0d1128]">Pilih PO...</option>
                    {invoicablePOs.map(po => (
                      <option key={po.id} value={po.id} className="bg-[#0d1128]">{po.poNumber} — {po.supplierName || `Supplier #${po.supplierId}`} ({formatRp(po.totalAmount)})</option>
                    ))}
                  </select>
                </div>

                {selectedPO && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-white/30">Supplier:</span> <span className="text-white/70">{selectedPO.supplierName || `#${selectedPO.supplierId}`}</span></div>
                    <div><span className="text-white/30">PO Total:</span> <span className="text-orange-400">{formatRp(selectedPO.totalAmount)}</span></div>
                    <div><span className="text-white/30">Status:</span> <span className="text-white/70">{selectedPO.status}</span></div>
                    <div><span className="text-white/30">Items:</span> <span className="text-white/70">{selectedPO.items?.length || 0}</span></div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Nomor Invoice *</label>
                    <input value={formInvoiceNo} onChange={e => setFormInvoiceNo(e.target.value)} placeholder="INV-XXXX"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Total Amount *</label>
                    <input type="number" min="0" value={formAmount || ""} onChange={e => setFormAmount(Number(e.target.value))} placeholder="0"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Tanggal Invoice *</label>
                    <input type="date" value={formInvoiceDate} onChange={e => setFormInvoiceDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Jatuh Tempo</label>
                    <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Catatan</label>
                  <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Catatan invoice..."
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                </div>
                <p className="text-[9px] text-white/20">3-way match akan otomatis dijalankan saat invoice dibuat. Invoice hanya bisa di-approve jika match status "passed".</p>
              </div>
              <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Batal</button>
                <button onClick={handleCreateInvoice} disabled={createInvoice.isPending || !formPO || !formInvoiceNo || !formAmount}
                  className="h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5">
                  <Save className="w-3 h-3" /> {createInvoice.isPending ? "Membuat..." : "Buat Invoice"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
