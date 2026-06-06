import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventory,
  useListIngredients,
  useListSemiFinished,
  useCreateIngredient,
  useCreateSemiFinished,
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
import { formatRp } from "@/lib/format";
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
import { Package, Plus, PackagePlus, AlertTriangle, Boxes, FlaskConical, Trash2, ChefHat } from "lucide-react";

function isLow(item: { currentStock: number; minimalStock?: number | null }): boolean {
  const min = item.minimalStock ?? 0;
  return min > 0 && item.currentStock <= min;
}

export default function InventoryPage() {
  const { branchId } = useBranch();
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 md:h-16 border-b px-4 md:px-6 flex items-center gap-3 bg-card shrink-0">
        <h1 className="font-bold text-lg md:text-xl tracking-tight">Stok & Bahan</h1>
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
          <StockTab branchId={branchId} />
        </TabsContent>
        <TabsContent value="ingredients" className="flex-1 min-h-0 m-0">
          <IngredientsTab branchId={branchId} />
        </TabsContent>
        <TabsContent value="semi" className="flex-1 min-h-0 m-0">
          <SemiFinishedTab branchId={branchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StockTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useListInventory({ branchId });
  const createAdj = useCreateStockAdjustment();
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const submitRestock = () => {
    if (!restockItem || !branchId) return;
    const quantity = parseFloat(qty);
    if (!quantity || quantity <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    createAdj.mutate(
      {
        data: {
          branchId,
          itemType: restockItem.itemType,
          itemId: restockItem.itemId,
          adjustmentType: "in",
          quantity,
          purchasePriceTotal: price ? parseFloat(price) : null,
          notes: notes || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Stok berhasil ditambahkan");
          setRestockItem(null); setQty(""); setPrice(""); setNotes("");
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getGetLowStockQueryKey({ branchId }) });
        },
        onError: () => toast.error("Gagal menambah stok"),
      },
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)
        ) : items.length === 0 ? (
          <Empty icon={Boxes} text="Belum ada bahan/stok di cabang ini" />
        ) : (
          items.map((item) => {
            const low = isLow(item);
            return (
              <Card key={`${item.itemType}-${item.itemId}`} className={low ? "border-destructive/40 bg-destructive/5" : ""}>
                <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${low ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {item.itemType === "semi_finished" ? <FlaskConical className="w-4 h-4 md:w-5 md:h-5" /> : <Package className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      {item.itemType === "semi_finished" && <Badge variant="secondary" className="text-[10px]">Setengah Jadi</Badge>}
                      {low && <Badge variant="destructive" className="text-[10px] animate-pulse">Stok Menipis</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      HPP: {formatRp(item.costPricePerUnit ?? 0)} / {item.unit}
                      {item.minimalStock != null && item.minimalStock > 0 && ` · Min: ${item.minimalStock}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base md:text-lg font-bold ${low ? "text-destructive" : ""}`}>{item.currentStock}</p>
                    <p className="text-[11px] text-muted-foreground">{item.unit}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 hidden sm:flex" onClick={() => setRestockItem(item)}>
                    <PackagePlus className="w-4 h-4 mr-1.5" />Barang Masuk
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!restockItem} onOpenChange={(o) => !o && setRestockItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Barang Masuk — {restockItem?.name}</DialogTitle>
            <DialogDescription>
              Stok masuk akan memperbarui rata-rata HPP (moving average) secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah Masuk ({restockItem?.unit})</label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Total Harga Beli (Rp)</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="cth. 150000" />
              <p className="text-[11px] text-muted-foreground">Total uang yang dibayar untuk jumlah ini. Dipakai menghitung HPP rata-rata.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Catatan</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockItem(null)}>Batal</Button>
            <Button onClick={submitRestock} disabled={createAdj.isPending}>
              {createAdj.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

function IngredientsTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: ingredients = [], isLoading } = useListIngredients({ branchId });
  const createIng = useCreateIngredient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [costPricePerUnit, setCostPricePerUnit] = useState("");
  const [minStock, setMinStock] = useState("");

  const submit = () => {
    if (!branchId) return;
    if (!name.trim() || !unit.trim()) { toast.error("Nama dan satuan wajib diisi"); return; }
    createIng.mutate(
      {
        data: {
          branchId,
          name: name.trim(),
          unit: unit.trim(),
          costPricePerUnit: costPricePerUnit ? parseFloat(costPricePerUnit) : undefined,
          minimalStock: minStock ? parseFloat(minStock) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Bahan baku ditambahkan");
          setOpen(false); setName(""); setUnit(""); setCostPricePerUnit(""); setMinStock("");
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
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Tambah Bahan</Button>
        </div>
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
        ) : ingredients.length === 0 ? (
          <Empty icon={Package} text="Belum ada bahan baku" />
        ) : (
          ingredients.map((ing) => (
            <Card key={ing.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Package className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{ing.name}</span>
                  <p className="text-xs text-muted-foreground">HPP {formatRp(ing.costPricePerUnit)} / {ing.unit} · Min {ing.minimalStock}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm md:text-base">{ing.currentStock}</p>
                  <p className="text-[11px] text-muted-foreground">{ing.unit}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Bahan Baku</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Nama</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Kopi Arabika" autoFocus /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Satuan</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cth. gram, ml, pcs" /></div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Harga Satuan (Rp / unit)</label>
              <Input type="number" value={costPricePerUnit} onChange={(e) => setCostPricePerUnit(e.target.value)} placeholder="cth. 5000" />
              <p className="text-[11px] text-muted-foreground">Harga dasar per satuan. Dipakai untuk menghitung HPP otomatis saat produk dijual.</p>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Stok Minimal (alert)</label><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="200" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={createIng.isPending}>{createIng.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

function SemiFinishedTab({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useListSemiFinished({ branchId });
  const createSf = useCreateSemiFinished();
  const produce = useProduceSemiFinished();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [recipeFor, setRecipeFor] = useState<{ id: number; name: string } | null>(null);
  const [produceFor, setProduceFor] = useState<{ id: number; name: string; unit: string } | null>(null);
  const [produceQty, setProduceQty] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListSemiFinishedQueryKey({ branchId: branchId! }) });
    qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId: branchId! }) });
  };

  const submitCreate = () => {
    if (!branchId) return;
    if (!name.trim() || !unit.trim()) { toast.error("Nama dan satuan wajib diisi"); return; }
    createSf.mutate(
      { data: { branchId, name: name.trim(), unit: unit.trim() } },
      {
        onSuccess: () => { toast.success("Item setengah jadi ditambahkan"); setOpen(false); setName(""); setUnit(""); invalidate(); },
        onError: () => toast.error("Gagal menambah item"),
      },
    );
  };

  const submitProduce = () => {
    if (!produceFor) return;
    const quantity = parseFloat(produceQty);
    if (!quantity || quantity <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    produce.mutate(
      { id: produceFor.id, data: { quantity } },
      {
        onSuccess: () => { toast.success("Produksi berhasil, bahan baku terpotong"); setProduceFor(null); setProduceQty(""); invalidate(); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal memproduksi"),
      },
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Tambah Item</Button>
        </div>
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
        ) : items.length === 0 ? (
          <Empty icon={FlaskConical} text="Belum ada item setengah jadi" />
        ) : (
          items.map((sf) => (
            <Card key={sf.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><FlaskConical className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{sf.name}</span>
                  <p className="text-xs text-muted-foreground">HPP {formatRp(sf.costPricePerUnit)} / {sf.unit} · Stok {sf.currentStock}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="hidden sm:flex" onClick={() => setRecipeFor({ id: sf.id, name: sf.name })}><ChefHat className="w-4 h-4 mr-1.5" />Resep</Button>
                  <Button size="sm" variant="outline" onClick={() => setProduceFor({ id: sf.id, name: sf.name, unit: sf.unit })}><PackagePlus className="w-4 h-4 mr-1.5" />Produksi</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Item Setengah Jadi</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Nama</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Adonan Roti" autoFocus /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Satuan</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cth. porsi, batch" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submitCreate} disabled={createSf.isPending}>{createSf.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!produceFor} onOpenChange={(o) => !o && setProduceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produksi — {produceFor?.name}</DialogTitle>
            <DialogDescription>Memproduksi akan memotong stok bahan baku sesuai resep dan menambah stok item ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label className="text-sm font-medium">Jumlah Produksi ({produceFor?.unit})</label>
            <Input type="number" value={produceQty} onChange={(e) => setProduceQty(e.target.value)} placeholder="0" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProduceFor(null)}>Batal</Button>
            <Button onClick={submitProduce} disabled={produce.isPending}>{produce.isPending ? "Memproses..." : "Produksi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    ...ingredients.map((i) => ({ type: "ingredient" as const, id: i.id, name: i.name, unit: i.unit })),
    ...semiFinished.filter((s) => !(parentType === "semi_finished" && s.id === parentId)).map((s) => ({ type: "semi_finished" as const, id: s.id, name: s.name, unit: s.unit })),
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
          <DialogDescription>Tentukan bahan & jumlah yang dipakai untuk 1 unit. HPP dihitung otomatis dari resep ini.</DialogDescription>
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
                  <Input
                    type="number"
                    className="w-24"
                    value={row.quantity}
                    onChange={(e) => {
                      const next = [...components];
                      next[idx] = { ...row, quantity: parseFloat(e.target.value) || 0 };
                      update(next);
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => update(components.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1.5" />Tambah Komponen</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={setRecipe.isPending}>{setRecipe.isPending ? "Menyimpan..." : "Simpan Resep"}</Button>
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
