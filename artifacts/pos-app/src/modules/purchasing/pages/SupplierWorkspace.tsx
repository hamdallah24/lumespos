import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Plus, Phone, Mail, MapPin, XCircle, Search, RefreshCw, Save, X } from "lucide-react";
import { useSuppliers, useCreateSupplier, useProcurementAI } from "../hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState, InvDrawer, InvLoadingSkeleton, InvSearchInput } from "@/lib/inventory/InventoryComponents";
import type { Supplier } from "../types";

export default function SupplierWorkspace() {
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const { data: aiSuggestions } = useProcurementAI();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "", taxId: "", paymentTerms: "" });

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.contactPerson || "").toLowerCase().includes(q));
  }, [suppliers, search]);

  const stats = useMemo(() => ({
    total: suppliers?.length || 0,
    withContact: suppliers?.filter(s => s.contactPerson || s.phone).length || 0,
    withoutContact: suppliers?.filter(s => !s.contactPerson && !s.phone && !s.email).length || 0,
  }), [suppliers]);

  const handleCreate = () => {
    if (!form.name) return;
    createSupplier.mutate({
      name: form.name, contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined, email: form.email || undefined,
      address: form.address || undefined, taxId: form.taxId || undefined,
      paymentTerms: form.paymentTerms || undefined,
    });
    setForm({ name: "", contactPerson: "", phone: "", email: "", address: "", taxId: "", paymentTerms: "" });
    setShowForm(false);
  };

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <InvSectionHeader icon={Truck} title="Supplier Explorer" subtitle={`${stats.total} supplier aktif`} />
          <button onClick={() => setShowForm(true)}
            className="h-10 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Supplier
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <InvKpiCard title="Total Supplier" value={String(stats.total)} icon={Truck} color="bg-orange-500/15 text-orange-400" />
          <InvKpiCard title="Berkontak" value={String(stats.withContact)} icon={Phone} color="bg-emerald-500/15 text-emerald-400" />
          <InvKpiCard title="Tanpa Kontak" value={String(stats.withoutContact)} icon={XCircle} color="bg-amber-500/15 text-amber-400" />
        </div>

        {/* Search */}
        <InvSearchInput value={search} onChange={setSearch} placeholder="Cari supplier..." />

        {/* Table */}
        {isLoading ? (
          <InvLoadingSkeleton rows={5} cols={6} />
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Kode</th>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Kontak</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Telepon</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Payment</th>
                    <th className="text-right px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <motion.tr key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      onClick={() => setSelected(selected?.id === s.id ? null : s)}
                      className={`border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors ${selected?.id === s.id ? "bg-orange-500/[0.04]" : ""}`}>
                      <td className="px-4 py-3 text-orange-400 font-mono text-[10px]">{s.code}</td>
                      <td className="px-4 py-3 text-white/80 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-white/50 hidden sm:table-cell">{s.contactPerson || "-"}</td>
                      <td className="px-4 py-3 text-white/40 hidden sm:table-cell">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-white/40 hidden md:table-cell">{s.email || "-"}</td>
                      <td className="px-4 py-3 text-white/30 text-[10px] hidden md:table-cell">{s.paymentTerms || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] text-white/20">{selected?.id === s.id ? "Tutup" : "Detail"}</span>
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12">
                      <Truck className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                      <p className="text-xs text-white/20">Tidak ada supplier</p>
                      <button onClick={() => setShowForm(true)}
                        className="mt-3 h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30">Buat Supplier</button>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Truck className="w-4 h-4 text-orange-400" /> Supplier Baru</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Nama *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama supplier"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Contact Person</label>
                    <input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Nama kontak"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Telepon</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxx"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Alamat</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap"
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Tax ID</label>
                    <input value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="NPWP"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Payment Terms</label>
                    <input value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="NET 30"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-orange-500/50" />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Batal</button>
                <button onClick={handleCreate} disabled={createSupplier.isPending || !form.name}
                  className="h-9 px-4 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5">
                  <Save className="w-3 h-3" /> Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <InvDrawer open={!!selected} onClose={() => setSelected(null)} title={selected.name}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Kode</p>
                  <p className="text-sm text-orange-400 font-mono mt-0.5">{selected.code}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Payment Terms</p>
                  <p className="text-sm text-white/70 mt-0.5">{selected.paymentTerms || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Kontak</p>
                  <p className="text-sm text-white/70 mt-0.5">{selected.contactPerson || "-"}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Telepon</p>
                  <p className="text-sm text-white/70 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone || "-"}</p>
                </div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Email</p>
                <p className="text-sm text-white/70 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email || "-"}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Alamat</p>
                <p className="text-xs text-white/50 mt-0.5 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{selected.address || "-"}</p>
              </div>
              {(aiSuggestions || []).filter(s => s.supplierId === selected.id).length > 0 && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">AI Insights</p>
                  <div className="space-y-1.5">
                    {(aiSuggestions || []).filter(s => s.supplierId === selected.id).map((s, i) => (
                      <div key={i} className={`px-2.5 py-2 rounded-lg ${s.severity === "critical" ? "bg-rose-500/[0.04] border border-rose-500/10" : "bg-amber-500/[0.04] border border-amber-500/10"}`}>
                        <p className={`text-[10px] font-medium ${s.severity === "critical" ? "text-rose-400" : "text-amber-400"}`}>{s.title}</p>
                        <p className="text-[9px] text-white/30 mt-0.5">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </InvDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}
