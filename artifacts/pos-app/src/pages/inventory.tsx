import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventory,
  useListIngredients,
  useListSemiFinished,
  useCreateIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useCreateSemiFinished,
  useDeleteSemiFinished,
  useCreateStockAdjustment,
  useProduceSemiFinished,
  useGetRecipe,
  useSetRecipe,
  getListInventoryQueryKey,
  getGetLowStockQueryKey,
  getListIngredientsQueryKey,
  getListSemiFinishedQueryKey,
} from "@workspace/api-client-react";
import type {
  InventoryItem,
  SetRecipeInputComponentsItem,
  SetRecipeInputParentType,
} from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatRp, formatQty, formatUnit, formatRecipeQty } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { Package, Plus, PackagePlus, Boxes, FlaskConical, Trash2, ChefHat, Minus, AlertTriangle, ClipboardCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

function isLow(item: { currentStock: number; minimalStock?: number | null }): boolean {
  const min = item.minimalStock ?? 0;
  return min > 0 && item.currentStock <= min;
}

export default function InventoryPage() {
  const { branchId } = useBranch();
  return (
    <div className="flex flex-col h-full">
      <div className="h-[52px] border-b border-slate-100 dark:border-slate-800 px-4 lg:px-6 flex items-center gap-3 bg-white dark:bg-[#0F1D32] shrink-0 sticky top-0 z-20 ">
        <h1 className="font-bold text-lg tracking-tight">Stok & Bahan</h1>
        <Badge variant="outline" className="ml-3 text-xs">Multi-Cabang</Badge>
      </div>
      <Tabs defaultValue="stock" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 md:px-6 pt-3 md:pt-4 shrink-0">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="stock"><Boxes className="w-4 h-4 mr-1.5" />Stok</TabsTrigger>
            <TabsTrigger value="ingredients"><Package className="w-4 h-4 mr-1.5" />Bahan Baku</TabsTrigger>
            <TabsTrigger value="semi"><FlaskConical className="w-4 h-4 mr-1.5" />Setengah Jadi</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="stock" className="flex-1 min-h-0 m-0">
          <StockTab branchId={branchId ?? 0} />
        </TabsContent>
        <TabsContent value="ingredients" className="flex-1 min-h-0 m-0">
          <IngredientsTab branchId={branchId ?? 0} />
        </TabsContent>
        <TabsContent value="semi" className="flex-1 min-h-0 m-0">
          <SemiFinishedTab branchId={branchId ?? 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── STOCK TAB ───────────────────────────────────────────────────────────────
function StockTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useListInventory({ branchId });
  const createAdj = useCreateStockAdjustment();

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [action, setAction] = useState<"in" | "out" | "loss" | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => { setSelectedItem(null); setAction(null); setQty(""); setPrice(""); setNotes(""); };

  const submitAdj = () => {
    if (!selectedItem || !action || !branchId) return;
    const quantity = parseFloat(qty);
    if (!quantity || quantity <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    createAdj.mutate(
      {
        data: {
          branchId,
          itemType: selectedItem.itemType,
          itemId: selectedItem.itemId,
          adjustmentType: action,
          quantity,
          purchasePriceTotal: action === "in" && price ? parseFloat(price) : null,
          notes: notes || null,
        },
      },
      {
        onSuccess: () => {
          const label = action === "in" ? "ditambahkan" : action === "out" ? "dikoreksi" : "dicatat sebagai kehilangan";
          toast.success(`Stok berhasil ${label}`);
          reset();
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getGetLowStockQueryKey({ branchId }) });
        },
        onError: () => toast.error("Gagal menyesuaikan stok"),
      },
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
        ) : items.length === 0 ? (
          <Empty icon={Boxes} text="Belum ada bahan/stok di cabang ini" />
        ) : (
          items.map((item) => {
            const low = isLow(item);
            return (
              <motion.div
                key={`${item.itemType}-${item.itemId}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border cursor-pointer active:scale-[0.98] transition-all ${
                  low
                    ? "border-destructive/30 bg-destructive/[0.03] hover:bg-destructive/[0.06]"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
                onClick={() => { setSelectedItem(item); setAction(null); }}
              >
                <div className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    low ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  }`}>
                    {item.itemType === "semi_finished" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{item.name}</span>
                      {item.itemType === "semi_finished" && <Badge variant="secondary" className="text-[10px]">Setengah Jadi</Badge>}
                      {low && <Badge variant="destructive" className="text-[10px] animate-pulse">Stok Menipis</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      HPP {formatRp(item.costPricePerUnit ?? 0)}/{item.unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base md:text-lg font-bold ${low ? "text-destructive" : ""}`}>
                      {formatUnit(item.currentStock, item.unit)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.unit}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={(o) => { if (!o) reset(); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
          {!action ? (
            <div>
              <div className="p-5 text-center border-b border-border/50">
                <div className={`w-12 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  selectedItem && isLow(selectedItem) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  {selectedItem?.itemType === "semi_finished" ? <FlaskConical className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                </div>
                <h3 className="font-bold text-lg">{selectedItem?.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stok saat ini: <span className="font-semibold text-foreground">
                    {formatUnit(selectedItem?.currentStock ?? 0, selectedItem?.unit ?? "")} {selectedItem?.unit}
                  </span>
                </p>
              </div>
              <div className="p-4 space-y-2.5">
                <button onClick={() => { setQty(""); setPrice(""); setNotes(""); setAction("in"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-50/50 border border-green-200 hover:from-green-100 hover:to-green-100/50 active:scale-[0.98] transition-all">
                  <div className="w-11 h-11 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-sm">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm text-green-800">Tambah Stok</p>
                    <p className="text-xs text-green-600 mt-px">Barang masuk & perbarui HPP</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-green-400" />
                </button>
                <button onClick={() => { setQty(""); setPrice(""); setNotes(""); setAction("out"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-50/50 border border-orange-200 hover:from-orange-100 hover:to-orange-100/50 active:scale-[0.98] transition-all">
                  <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Minus className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm text-orange-800">Koreksi</p>
                    <p className="text-xs text-orange-600 mt-px">Kurangi stok secara manual</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-400" />
                </button>
                <button onClick={() => { setQty(""); setPrice(""); setNotes(""); setAction("loss"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 hover:from-red-100 hover:to-red-100/50 active:scale-[0.98] transition-all">
                  <div className="w-11 h-11 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm text-red-800">Hilang</p>
                    <p className="text-xs text-red-600 mt-px">Catat kehilangan / kerusakan</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-400" />
                </button>
              </div>
              <div className="px-4 pb-4">
                <Button variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={reset}>Tutup</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-4 border-b border-border/50 flex items-center gap-3">
                <button onClick={() => setAction(null)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center -ml-1">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <p className="font-semibold text-sm">{selectedItem?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {action === "in" ? "Tambah Stok" : action === "out" ? "Koreksi Stok" : "Catat Kehilangan"}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stok saat ini</span>
                  <span className="font-bold text-lg">{formatUnit(selectedItem?.currentStock ?? 0, selectedItem?.unit ?? "")} {selectedItem?.unit}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Jumlah ({selectedItem?.unit})</label>
                  <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" autoFocus className="h-10 rounded-xl" />
                </div>
                {action === "in" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Total Harga Beli (Rp)</label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="cth. 150000" className="h-10 rounded-xl" />
                    <p className="text-[11px] text-muted-foreground">Dipakai menghitung HPP moving average.</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Catatan (opsional)</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan catatan..." className="h-10 rounded-xl" />
                </div>
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={reset}>Batal</Button>
                <Button className="flex-[2] rounded-xl h-10" onClick={submitAdj} disabled={createAdj.isPending}>
                  {createAdj.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

// ─── INGREDIENTS TAB ─────────────────────────────────────────────────────────
type IngredientItem = {
  id: number;
  branchId: number;
  name: string;
  unit: string;
  costPricePerUnit: number;
  minimalStock: number;
  currentStock: number;
  trackInShift: boolean;
};

function IngredientsTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: ingredients = [], isLoading } = useListIngredients({ branchId });
  const createIng = useCreateIngredient();
  const updateIng = useUpdateIngredient();
  const deleteIng = useDeleteIngredient();

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<IngredientItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<IngredientItem | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [costPricePerUnit, setCostPricePerUnit] = useState("");
  const [minStock, setMinStock] = useState("");
  const [trackInShift, setTrackInShift] = useState(true);

  const resetForm = () => {
    setName(""); setUnit(""); setCostPricePerUnit(""); setMinStock(""); setEditItem(null); setTrackInShift(true);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (ing: IngredientItem) => {
    setEditItem(ing);
    setName(ing.name);
    setUnit(ing.unit);
    setCostPricePerUnit(String(ing.costPricePerUnit));
    setMinStock(String(ing.minimalStock));
    setTrackInShift(ing.trackInShift ?? true);
    setOpen(true);
  };

  const submitDelete = () => {
    if (!deleteItem) return;
    deleteIng.mutate(
      { id: deleteItem.id },
      {
        onSuccess: () => {
          toast.success(`"${deleteItem.name}" berhasil dihapus`);
          setDeleteItem(null);
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.error ?? "Gagal menghapus bahan baku";
          toast.error(msg);
          setDeleteItem(null);
        },
      },
    );
  };

  const submit = () => {
    if (!branchId) return;
    if (!name.trim() || !unit.trim()) { toast.error("Nama dan satuan wajib diisi"); return; }
    if (editItem) {
      const updateData: Record<string, unknown> = {};
      if (name.trim() !== editItem.name) updateData.name = name.trim();
      if (unit.trim() !== editItem.unit) updateData.unit = unit.trim();
      const newPrice = costPricePerUnit ? parseFloat(costPricePerUnit) : 0;
      if (newPrice !== editItem.costPricePerUnit) updateData.costPricePerUnit = newPrice;
      const newMin = minStock ? parseFloat(minStock) : 0;
      if (newMin !== editItem.minimalStock) updateData.minimalStock = newMin;
      if (trackInShift !== (editItem.trackInShift ?? true)) updateData.trackInShift = trackInShift;
      if (Object.keys(updateData).length === 0) { setOpen(false); resetForm(); return; }
      updateIng.mutate(
        { id: editItem.id, data: updateData },
        {
          onSuccess: () => {
            toast.success("Bahan baku diperbarui");
            setOpen(false); resetForm();
            qc.invalidateQueries({ queryKey: getListIngredientsQueryKey({ branchId }) });
            qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
          },
          onError: () => toast.error("Gagal memperbarui bahan baku"),
        },
      );
      return;
    }
    createIng.mutate(
      {
        data: {
          branchId,
          name: name.trim(),
          unit: unit.trim(),
          costPricePerUnit: costPricePerUnit ? parseFloat(costPricePerUnit) : undefined,
          minimalStock: minStock ? parseFloat(minStock) : undefined,
          trackInShift,
        } as any,
      },
      {
        onSuccess: () => {
          toast.success("Bahan baku ditambahkan");
          setOpen(false); resetForm();
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
        },
        onError: () => toast.error("Gagal menambah bahan baku"),
      },
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />Tambah Bahan
          </Button>
        </div>
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
        ) : ingredients.length === 0 ? (
          <Empty icon={Package} text="Belum ada bahan baku" />
        ) : (
          (ingredients as IngredientItem[]).map((ing) => (
            <Card key={ing.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(ing)}>
                  <span className="font-medium text-sm">{ing.name}</span>
                  <p className="text-xs text-muted-foreground">
                    HPP {formatRp(ing.costPricePerUnit)} / {ing.unit} · Min {formatQty(ing.minimalStock)}
                  </p>
                </div>
                <div className="shrink-0 mr-1">
                  {ing.trackInShift ? (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 gap-1">
                      <ClipboardCheck className="w-3 h-3" />Diaudit
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">Lewati</Badge>
                  )}
                </div>
                <div className="text-right shrink-0 mr-2 cursor-pointer" onClick={() => openEdit(ing)}>
                  <p className="font-bold text-sm md:text-base">{formatQty(ing.currentStock)}</p>
                  <p className="text-[11px] text-muted-foreground">{ing.unit}</p>
                </div>
                <Button size="icon" variant="ghost" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteItem(ing); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Kopi Arabika" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Satuan</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cth. gram, ml, pcs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Harga Satuan (Rp / unit)</label>
              <Input type="number" value={costPricePerUnit} onChange={(e) => setCostPricePerUnit(e.target.value)} placeholder="cth. 5000" />
              <p className="text-[11px] text-muted-foreground">Harga dasar per satuan untuk menghitung HPP otomatis.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stok Minimal (alert)</label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="200" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary" />Wajib Audit Kasir</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Aktifkan agar bahan ini muncul di form Tutup Shift kasir.</p>
              </div>
              <Switch checked={trackInShift} onCheckedChange={setTrackInShift} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={submit} disabled={createIng.isPending || updateIng.isPending}>
              {createIng.isPending || updateIng.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Hapus Bahan Baku
            </DialogTitle>
            <DialogDescription>Yakin ingin menghapus <strong>"{deleteItem?.name}"</strong>? Tindakan ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={deleteIng.isPending}>
              {deleteIng.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

// ─── SEMI FINISHED TAB (LENGKAP DENGAN YIELD & WEIGHT-BASED PRODUCTION) ──────
// ─── SEMI FINISHED TAB (dengan produksi weight-based sederhana) ─────────────
type SemiFinishedItem = {
  id: number;
  branchId: number;
  name: string;
  unit: string;
  costPricePerUnit: number;
  currentStock: number;
  yieldQuantity: number;
  yieldUnit: string;
  trackInShift: boolean;
};

function SemiFinishedTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useListSemiFinished({ branchId });
  const createSf = useCreateSemiFinished();
  const deleteSf = useDeleteSemiFinished();
  const produce = useProduceSemiFinished();

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<SemiFinishedItem | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("");
  const [yieldUnit, setYieldUnit] = useState("");
  const [deleteItem, setDeleteItem] = useState<SemiFinishedItem | null>(null);
  const [trackInShift, setTrackInShift] = useState(true);

  // State produksi
  const [produceFor, setProduceFor] = useState<{ id: number; name: string; yieldUnit: string } | null>(null);
  const [producedWeight, setProducedWeight] = useState("");
  const [recipeFor, setRecipeFor] = useState<{ id: number; name: string } | null>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListSemiFinishedQueryKey({ branchId }) });
    qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
  };

  const resetForm = () => {
    setName(""); setUnit(""); setYieldQuantity(""); setYieldUnit(""); setEditItem(null); setTrackInShift(true);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (sf: SemiFinishedItem) => {
    setEditItem(sf);
    setName(sf.name);
    setUnit(sf.unit);
    setYieldQuantity(String(sf.yieldQuantity ?? 1));
    setYieldUnit(sf.yieldUnit ?? sf.unit);
    setTrackInShift(sf.trackInShift ?? true);
    setOpen(true);
  };

  const submitSemiFinished = async () => {
    if (!branchId) return;
    if (!name.trim() || !unit.trim()) {
      toast.error("Nama dan satuan wajib diisi");
      return;
    }
    const data: any = {
      branchId,
      name: name.trim(),
      unit: unit.trim(),
      yieldQuantity: yieldQuantity ? parseFloat(yieldQuantity) : 1,
      yieldUnit: yieldUnit.trim() || unit.trim(),
      trackInShift,
    };

    if (editItem) {
      try {
        const res = await apiFetch(`/api/semi-finished/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Gagal update");
        toast.success("Item setengah jadi diperbarui");
        setOpen(false);
        resetForm();
        invalidate();
      } catch (err) {
        toast.error("Gagal memperbarui item");
      }
    } else {
      createSf.mutate(
        { data },
        {
          onSuccess: () => {
            toast.success("Item setengah jadi ditambahkan");
            setOpen(false);
            resetForm();
            invalidate();
          },
          onError: () => toast.error("Gagal menambah item"),
        }
      );
    }
  };

  const submitDelete = () => {
    if (!deleteItem) return;
    deleteSf.mutate(
      { id: deleteItem.id },
      {
        onSuccess: () => {
          toast.success(`"${deleteItem.name}" berhasil dihapus`);
          setDeleteItem(null);
          invalidate();
        },
        onError: (e: any) => {
          toast.error(e?.response?.data?.error ?? "Gagal menghapus item");
          setDeleteItem(null);
        },
      }
    );
  };

  const submitProduce = () => {
    if (!produceFor) return;
    const weight = parseFloat(producedWeight);
    if (!weight || weight <= 0) {
      toast.error("Masukkan hasil timbangan");
      return;
    }
    produce.mutate(
      { id: produceFor.id, data: { producedWeight: weight, branchId } as any },
      {
        onSuccess: () => {
          toast.success(`Produksi ${produceFor.name} berhasil`);
          setProduceFor(null);
          setProducedWeight("");
          invalidate();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal produksi"),
      }
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />Tambah Item Setengah Jadi
          </Button>
        </div>
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
        ) : items.length === 0 ? (
          <Empty icon={FlaskConical} text="Belum ada item setengah jadi" />
        ) : (
          (items as SemiFinishedItem[]).map((sf) => (
            <Card key={sf.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(sf)}>
                  <span className="font-medium text-sm">{sf.name}</span>
                  <p className="text-xs text-muted-foreground">
                    HPP {formatRp(sf.costPricePerUnit)} / {sf.unit} · Stok {formatQty(sf.currentStock)}
                    {sf.yieldQuantity && sf.yieldUnit && ` · Yield ${sf.yieldQuantity} ${sf.yieldUnit}/batch`}
                  </p>
                </div>
                <div className="shrink-0 mr-1">
                  {sf.trackInShift ? (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 gap-1">
                      <ClipboardCheck className="w-3 h-3" />Diaudit
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">Lewati</Badge>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRecipeFor({ id: sf.id, name: sf.name })} title="Resep">
                    <ChefHat className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setProduceFor({ id: sf.id, name: sf.name, yieldUnit: sf.yieldUnit ?? sf.unit })}
                    title="Produksi"
                  >
                    <PackagePlus className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(sf)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Tambah/Edit Setengah Jadi */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item Setengah Jadi" : "Tambah Item Setengah Jadi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Espresso Cair" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Satuan Dasar</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cth. ml, gram, pcs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Hasil per Batch ({unit || 'satuan'})</label>
              <Input type="number" value={yieldQuantity} onChange={(e) => setYieldQuantity(e.target.value)} placeholder="cth. 375" />
              <p className="text-xs text-muted-foreground">Jumlah yang dihasilkan dari 1 batch produksi (satuan dasar).</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Satuan Hasil (opsional)</label>
              <Input value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} placeholder="kosongkan = sama dengan satuan dasar" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary" />Wajib Audit Kasir</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Aktifkan agar item ini muncul di form Tutup Shift kasir.</p>
              </div>
              <Switch checked={trackInShift} onCheckedChange={setTrackInShift} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={submitSemiFinished} disabled={createSf.isPending}>
              {createSf.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Produksi (hanya input hasil timbangan) */}
      <Dialog open={!!produceFor} onOpenChange={(o) => !o && setProduceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produksi — {produceFor?.name}</DialogTitle>
            <DialogDescription>
              Masukkan hasil timbangan (dalam {produceFor?.yieldUnit || "unit"}). Bahan baku akan berkurang sesuai resep yang telah ditentukan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="number"
              value={producedWeight}
              onChange={(e) => setProducedWeight(e.target.value)}
              placeholder={`Contoh: 200 ${produceFor?.yieldUnit || ""}`}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProduceFor(null)}>Batal</Button>
            <Button onClick={submitProduce} disabled={produce.isPending}>
              {produce.isPending ? "Memproses..." : "Produksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Hapus Item Setengah Jadi
            </DialogTitle>
            <DialogDescription>Yakin ingin menghapus <strong>"{deleteItem?.name}"</strong>? Tindakan ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={deleteSf.isPending}>
              {deleteSf.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog (panggil komponen RecipeDialog di luar) */}
      {recipeFor && branchId && (
        <RecipeDialog
          parentType="semi_finished"
          parentId={recipeFor.id}
          parentName={recipeFor.name}
          branchId={branchId}
          onClose={() => setRecipeFor(null)}
        />
      )}
    </ScrollArea>
  );
}

// ─── RECIPE DIALOG (tidak berubah) ───────────────────────────────────────────
export function RecipeDialog({
  parentType, parentId, parentName, branchId, onClose,
}: {
  parentType: SetRecipeInputParentType;
  parentId: number;
  parentName: string;
  branchId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: existing = [], isLoading } = useGetRecipe({ parentType, parentId });
  const { data: ingredients = [] } = useListIngredients({ branchId });
  const { data: semiFinished = [] } = useListSemiFinished({ branchId });
  const setRecipe = useSetRecipe();
  const [rows, setRows] = useState<SetRecipeInputComponentsItem[] | null>(null);

  const components: SetRecipeInputComponentsItem[] =
    rows ?? existing.map((c) => ({ componentType: c.componentType, componentId: c.componentId, quantity: c.quantity }));

  const update = (next: SetRecipeInputComponentsItem[]) => setRows(next);

  const options = [
    ...(ingredients as any[]).map((i) => ({ type: "ingredient" as const, id: i.id, name: i.name, unit: i.unit })),
    ...(semiFinished as any[]).filter((s) => !(parentType === "semi_finished" && s.id === parentId)).map((s) => ({ type: "semi_finished" as const, id: s.id, name: s.name, unit: s.unit })),
  ];

  const addRow = () => {
    if (!options.length) { toast.error("Tambah bahan baku terlebih dahulu"); return; }
    update([...components, { componentType: options[0].type, componentId: options[0].id, quantity: 1 }]);
  };

  const save = () => {
    setRecipe.mutate(
      { data: { parentType, parentId, components } },
      {
        onSuccess: () => {
          toast.success("Resep disimpan");
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getListSemiFinishedQueryKey({ branchId }) });
          onClose();
        },
        onError: () => toast.error("Gagal menyimpan resep"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resep (BOM) — {parentName}</DialogTitle>
          <DialogDescription>Tentukan bahan & jumlah untuk 1 unit (dalam satuan dasar). HPP dihitung otomatis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="h-20 bg-muted rounded animate-pulse" />
          ) : components.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada komponen. Klik "Tambah Komponen".</p>
          ) : (
            components.map((row, idx) => {
              const key = `${row.componentType}:${row.componentId}`;
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={key}
                    onValueChange={(v) => {
                      const [t, id] = v.split(":");
                      const next = [...components];
                      next[idx] = { ...row, componentType: t as SetRecipeInputComponentsItem["componentType"], componentId: Number(id) };
                      update(next);
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
                          {o.name} {o.type === "semi_finished" ? "(setengah jadi)" : ""} — {o.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-24" value={row.quantity} onChange={(e) => {
                    const next = [...components];
                    next[idx] = { ...row, quantity: parseFloat(e.target.value) || 0 };
                    update(next);
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => update(components.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="w-4 h-4 mr-1.5" />Tambah Komponen
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={setRecipe.isPending}>
            {setRecipe.isPending ? "Menyimpan..." : "Simpan Resep"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}