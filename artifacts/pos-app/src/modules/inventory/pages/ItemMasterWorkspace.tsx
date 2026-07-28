import { useState } from "react";
import { useBranch } from "@/lib/branch";
import { useItems, useItemCategories, useCreateItem, useUpdateItem, useDeleteItem, useCreateItemCategory, useItem } from "../hooks/useInventory";
import { formatRp } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Package, Tag, Edit3, Trash2, X, Save, Filter, RefreshCw, ChevronLeft, ChevronRight, Hash, DollarSign, Box, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const itemTypes = ["raw_material", "semi_finished", "finished_good", "service", "packaging", "asset"];

const typeColors: Record<string, string> = {
  raw_material: "bg-blue-500/10 text-blue-400",
  semi_finished: "bg-amber-500/10 text-amber-400",
  finished_good: "bg-emerald-500/10 text-emerald-400",
  service: "bg-purple-500/10 text-purple-400",
  packaging: "bg-cyan-500/10 text-cyan-400",
  asset: "bg-rose-500/10 text-rose-400",
};

const typeLabels: Record<string, string> = {
  raw_material: "Raw Material",
  semi_finished: "Semi Finished",
  finished_good: "Finished Good",
  service: "Service",
  packaging: "Packaging",
  asset: "Asset",
};

function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data: categories, isLoading } = useItemCategories();
  const createCat = useCreateItemCategory();
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createCat.mutateAsync({ name: newName.trim() });
    setNewName("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Tag className="w-4 h-4 text-amber-400" /> Categories</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name..."
              className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 outline-none focus:border-amber-500/50" />
            <button onClick={handleAdd} disabled={createCat.isPending}
              className="h-10 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50">Add</button>
          </div>
          {isLoading ? (
            <p className="text-xs text-white/30 text-center py-4">Loading...</p>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                    <span className="text-xs text-white/80">{cat.name}</span>
                  </div>
                  <span className="text-[9px] text-white/20">#{cat.id}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30 text-center py-4">No categories yet</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ItemFormModal({ id, onClose }: { id?: number | null; onClose: () => void }) {
  const { data: editItem, isLoading: loadingItem } = useItem(id || 0);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { data: categories } = useItemCategories();
  const { branchId } = useBranch();

  const [form, setForm] = useState<any>({ code: "", name: "", type: "raw_material", baseUnit: "pcs", barcode: "", categoryId: "", purchasePrice: "", standardCost: "", reorderPoint: "0", minStock: "0", maxStock: "0", leadTime: 0, safetyStock: "0", description: "", defaultSupplierId: "", defaultWarehouseId: "" });

  const isEdit = !!id;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" /> {isEdit ? "Edit Item" : "New Item"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. RM-001"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Barcode</label>
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan barcode"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name"
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
                {itemTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Base Unit</label>
              <input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} placeholder="pcs"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
                <option value="">— No Category —</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Purchase Price</label>
              <input value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Standard Cost</label>
              <input value={form.standardCost} onChange={(e) => setForm({ ...form, standardCost: e.target.value })} placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Lead Time (days)</label>
              <input value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: Number(e.target.value) })} placeholder="0" type="number" min="0"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Stock Thresholds</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[8px] text-white/20 block mb-0.5">Reorder Point</label>
                <input value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="text-[8px] text-white/20 block mb-0.5">Min Stock</label>
                <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="text-[8px] text-white/20 block mb-0.5">Max Stock</label>
                <input value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: e.target.value })} placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="text-[8px] text-white/20 block mb-0.5">Safety Stock</label>
                <input value={form.safetyStock} onChange={(e) => setForm({ ...form, safetyStock: e.target.value })} placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..."
              className="w-full h-16 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50 resize-none" />
          </div>
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Cancel</button>
          <button onClick={async () => {
            if (!form.code || !form.name) return;
            const payload = { ...form, branchId: branchId || 1, categoryId: form.categoryId ? Number(form.categoryId) : undefined, defaultSupplierId: form.defaultSupplierId ? Number(form.defaultSupplierId) : undefined, defaultWarehouseId: form.defaultWarehouseId ? Number(form.defaultWarehouseId) : undefined };
            if (isEdit) await updateItem.mutateAsync({ id, ...payload });
            else await createItem.mutateAsync(payload);
            onClose();
          }} disabled={createItem.isPending || updateItem.isPending}
            className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3 h-3" /> {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ItemMasterWorkspace() {
  const { branchId } = useBranch();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCategories, setShowCategories] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = useItems({ branchId: branchId || 1, q: search || undefined, type: typeFilter || undefined, categoryId: catFilter ? Number(catFilter) : undefined, page, limit: 30 });
  const { data: categories } = useItemCategories();
  const deleteItem = useDeleteItem();

  const clearFilters = () => { setSearch(""); setTypeFilter(""); setCatFilter(""); setPage(1); };

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><Package className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-base font-bold text-white">Item Master</h1>
              <p className="text-[10px] text-white/30">Central item registry — {data?.total || 0} items</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCategories(true)}
              className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Categories</button>
            <button onClick={() => { setEditId(null); setShowForm(true); }}
              className="h-9 px-3 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Item</button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or code..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none min-w-[120px] focus:border-amber-500/50">
            <option value="">All Types</option>
            {itemTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </select>
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none min-w-[130px] focus:border-amber-500/50">
            <option value="">All Categories</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => refetch()} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60"><RefreshCw className="w-4 h-4" /></button>
          {(search || typeFilter || catFilter) && (
            <button onClick={clearFilters} className="h-10 px-3 rounded-xl bg-white/5 text-white/40 text-xs hover:text-white/60 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Items</p>
            <p className="text-lg font-bold text-white mt-0.5">{data?.total || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Categories</p>
            <p className="text-lg font-bold text-white mt-0.5">{categories?.length || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Page</p>
            <p className="text-lg font-bold text-white mt-0.5">{page}/{data?.totalPages || 1}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Results</p>
            <p className="text-lg font-bold text-white mt-0.5">{data?.items?.length || 0}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Price</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-white/20 text-xs">Loading items...</td></tr>
                ) : data?.items && data.items.length > 0 ? (
                  data.items.map((item, i) => (
                    <motion.tr key={item.id} {...fadeUp} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white/40 font-mono text-[10px]">{item.code}</span>
                        {item.barcode && <p className="text-[8px] text-white/20 font-mono">{item.barcode}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium truncate max-w-[160px]">{item.name}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {item.categoryId ? (
                          <span className="text-white/50 text-[10px]">{categories?.find(c => c.id === item.categoryId)?.name || `#${item.categoryId}`}</span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={"px-2 py-0.5 rounded-md text-[9px] font-medium " + (typeColors[item.type] || "bg-white/5 text-white/40")}>{typeLabels[item.type] || item.type}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <p className="text-white text-xs">{formatRp(Number(item.purchasePrice))}</p>
                        <p className="text-[8px] text-white/20">Cost: {formatRp(Number(item.standardCost))}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80"><CheckCircle className="w-2.5 h-2.5" />Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] text-rose-400/80"><XCircle className="w-2.5 h-2.5" />Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditId(item.id); setShowForm(true); }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm("Deactivate this item?")) deleteItem.mutate(item.id); }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center py-12">
                    <Package className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/20">No items found</p>
                    <button onClick={() => { setEditId(null); setShowForm(true); }}
                      className="mt-3 h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30">Add First Item</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-[9px] text-white/20">Page {page} of {data.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60 disabled:opacity-20"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60 disabled:opacity-20"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>{showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}</AnimatePresence>
      <AnimatePresence>{showForm && <ItemFormModal id={editId} onClose={() => { setShowForm(false); setEditId(null); }} />}</AnimatePresence>
    </div>
  );
}