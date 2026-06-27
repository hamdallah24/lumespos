import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts, useListCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCreateCategory, useDeleteCategory,
  useListProductVariants, useCreateProductVariant, useUpdateProductVariant, useDeleteProductVariant,
  useGetRecipe, useSetRecipe, getGetRecipeQueryKey,
  useListIngredients, useListSemiFinished,
  getListProductsQueryKey, getListCategoriesQueryKey,
  getListIngredientsQueryKey,
} from "@workspace/api-client-react";
import type { Product, Category } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Package, Tag, X, List, ChefHat, Box, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";

/* ──────────────────────────────────── */
/* Variants Panel (On-Demand)           */
/* ──────────────────────────────────── */
function VariantsPanel({ productId, onVariantChange }: { productId: number; onVariantChange?: () => void }) {
  const queryClient = useQueryClient();
  const { data: variants = [], refetch } = useListProductVariants(productId);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; price: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const refreshVariants = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["listProductVariants", productId] });
    if (onVariantChange) onVariantChange();
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Nama varian wajib diisi");
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Harga varian wajib diisi dan harus lebih dari 0");
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiFetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), price: priceNum, requiresStock: true }),
        credentials: "include",
      });
      if (!response.ok) throw new Error(await response.text());
      
      toast.success(`Varian "${newName}" ditambahkan`);
      setNewName("");
      setNewPrice("");
      await refreshVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gagal menambah varian"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !editing.name.trim()) {
      toast.error("Nama varian wajib diisi");
      return;
    }
    const priceNum = parseFloat(editing.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await apiFetch(`/api/product-variants/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name.trim(), price: priceNum }),
        credentials: "include",
      });
      if (!response.ok) throw new Error(await response.text());
      
      toast.success("Varian berhasil diperbarui");
      setEditing(null);
      await refreshVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gagal memperbarui varian"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/product-variants/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      
      toast.success("Varian dihapus");
      await refreshVariants();
      setDeleting(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gagal menghapus varian"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Nama varian (cth. Large, Hot/Ice)" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input placeholder="Harga (Rp)" value={newPrice} onChange={e => setNewPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="w-32" />
          <Button onClick={handleAdd} disabled={isCreating || !newName.trim() || !newPrice}>
            {isCreating ? "..." : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Varian bersifat On-Demand (stok tidak dibatasi).</p>
      </div>

      {variants.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">
          <List className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Belum ada varian</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {variants.map((v, idx) => (
            <div key={v.id} className={`flex items-center gap-3 px-4 py-3 ${idx < variants.length - 1 ? "border-b" : ""}`}>
              {editing?.id === v.id ? (
                <>
                  <Input className="flex-1" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  <Input className="w-28" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value.replace(/[^0-9.]/g, "") })} />
                  <Button size="sm" onClick={handleUpdate} disabled={isUpdating}>{isUpdating ? "..." : "Simpan"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Batal</Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRp(v.price)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing({ id: v.id, name: v.name, price: String(v.price) })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(v.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Varian?</AlertDialogTitle>
          <AlertDialogDescription>Varian akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleting && handleDelete(deleting)}>
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ──────────────────────────────────── */
/* BOM (Bill of Materials) Panel        */
/* ──────────────────────────────────── */
function BomPanel({ productId, onBomChange }: { productId: number; onBomChange?: () => void }) {
  const queryClient = useQueryClient();
  const { branchId } = useBranch();
  const { data: variants = [] } = useListProductVariants(productId);
  const [targetType, setTargetType] = useState<"product" | "product_variant">("product");
  const [targetId, setTargetId] = useState<number>(productId);
  const { data: recipe = [] } = useGetRecipe({ parentType: targetType, parentId: targetId } as any);
  const { data: ingredients = [] } = useListIngredients({ branchId: branchId ?? 0 });
  const { data: semiFinished = [] } = useListSemiFinished({ branchId: branchId ?? 0 });
  const setRecipe = useSetRecipe();
  const [selectedComponents, setSelectedComponents] = useState<Record<string, number>>({});
  const [bomSearch, setBomSearch] = useState("");

  useEffect(() => {
    const map: Record<string, number> = {};
    if (Array.isArray(recipe)) {
      recipe.forEach((r: any) => {
        if (r && r.componentType != null && r.componentId != null) {
          map[`${r.componentType}:${r.componentId}`] = r.quantity ?? 0;
        }
      });
    }
    setSelectedComponents(map);
  }, [recipe]);

  const refreshRecipe = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
    if (onBomChange) onBomChange();
  };

  const handleTargetChange = (val: string) => {
    if (val === "global") { setTargetType("product"); setTargetId(productId); }
    else { setTargetType("product_variant"); setTargetId(Number(val)); }
  };

  const currentTargetValue = targetType === "product" ? "global" : String(targetId);
  const isSaving = setRecipe.isPending;

  const filteredIngredients = (ingredients || []).filter((i: any) => !bomSearch || i.name?.toLowerCase().includes(bomSearch.toLowerCase()));
  const filteredSemiFinished = (semiFinished || []).filter((s: any) => !bomSearch || s.name?.toLowerCase().includes(bomSearch.toLowerCase()));

  const toggleComponent = (key: string) => {
    setSelectedComponents(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = 1;
      return next;
    });
  };

  const updateQuantity = (key: string, qty: number) => {
    setSelectedComponents(prev => ({ ...prev, [key]: qty }));
  };

  const saveRecipe = () => {
    const components = Object.entries(selectedComponents).map(([key, qty]) => {
      const [type, idStr] = key.split(":");
      return { componentType: type as "ingredient" | "semi_finished", componentId: Number(idStr), quantity: qty };
    });
    setRecipe.mutate({ data: { parentType: targetType, parentId: targetId, components } } as any, {
      onSuccess: () => { toast.success("Resep disimpan"); refreshRecipe(); },
      onError: () => toast.error("Gagal menyimpan resep"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
        <Label className="text-xs font-semibold text-muted-foreground">Target Konfigurasi Resep (BOM)</Label>
        <Select value={currentTargetValue} onValueChange={handleTargetChange}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih target resep" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Default Produk (Global)</SelectItem>
            {Array.isArray(variants) && variants.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>Resep Varian: {v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Input placeholder="Cari bahan..." value={bomSearch} onChange={e => setBomSearch(e.target.value)} />

      <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
        {(!Array.isArray(filteredIngredients) || filteredIngredients.length === 0) && (!Array.isArray(filteredSemiFinished) || filteredSemiFinished.length === 0) ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Tidak ada bahan ditemukan</div>
        ) : (
          <>
            {Array.isArray(filteredIngredients) && filteredIngredients.length > 0 && <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30 sticky top-0">Bahan Baku</div>}
            {Array.isArray(filteredIngredients) && filteredIngredients.map((ing: any) => {
              const key = `ingredient:${ing.id}`;
              const checked = key in selectedComponents;
              return (
                <div key={key} className="flex items-center gap-2 px-3 py-2">
                  <input type="checkbox" checked={checked} onChange={() => toggleComponent(key)} className="shrink-0" />
                  <span className="flex-1 text-sm truncate">{ing.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 mr-1">{ing.unit}</span>
                  {checked && <Input value={selectedComponents[key] || ""} onChange={e => updateQuantity(key, parseFloat(e.target.value) || 0)} className="w-20 h-7 text-xs" placeholder="Qty" />}
                </div>
              );
            })}
            {Array.isArray(filteredSemiFinished) && filteredSemiFinished.length > 0 && <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30 border-t sticky top-0">Bahan Setengah Jadi</div>}
            {Array.isArray(filteredSemiFinished) && filteredSemiFinished.map((sf: any) => {
              const key = `semi_finished:${sf.id}`;
              const checked = key in selectedComponents;
              return (
                <div key={key} className="flex items-center gap-2 px-3 py-2">
                  <input type="checkbox" checked={checked} onChange={() => toggleComponent(key)} className="shrink-0" />
                  <span className="flex-1 text-sm truncate">{sf.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 mr-1">{sf.unit}</span>
                  {checked && <Input value={selectedComponents[key] || ""} onChange={e => updateQuantity(key, parseFloat(e.target.value) || 0)} className="w-20 h-7 text-xs" placeholder="Qty" />}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={saveRecipe} disabled={isSaving} className="flex-1">{isSaving ? "Menyimpan..." : "Simpan Resep"}</Button>
      </div>

      {Array.isArray(recipe) && recipe.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30">Resep Saat Ini</div>
          {recipe.map((r: any, idx: number) => (
            <div key={r.id || idx} className="flex items-center gap-2 px-3 py-2 border-t">
              <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0"><PackagePlus className="w-3 h-3" /></div>
              <span className="flex-1 text-sm">{r.componentName}</span>
              <Badge variant="outline" className={`text-[9px] ${r.componentType === "semi_finished" ? "text-blue-600" : "text-slate-600"}`}>{r.componentType === "semi_finished" ? "Setengah Jadi" : "Bahan Baku"}</Badge>
              <span className="text-xs font-medium">{r.quantity} {r.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────── */
/* Product Form Dialog                  */
/* ──────────────────────────────────── */
function ProductFormDialog({ open, onOpenChange, product, categories, onProductChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; product: Product | null; categories: Category[]; onProductChange?: () => void; onCreated?: (product: Product) => void }) {
  const queryClient = useQueryClient();
  const { branchId } = useBranch();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId ? String(product.categoryId) : "none");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [requiresStock, setRequiresStock] = useState((product as any)?.requiresStock ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantTab, setVariantTab] = useState("basic");
  const isEdit = product !== null;

  useEffect(() => {
    setName(product?.name ?? "");
    setCategoryId(product?.categoryId ? String(product.categoryId) : "none");
    setPrice(product ? String(product.price) : "");
    setImageUrl(product?.imageUrl ?? "");
    setIsActive(product?.isActive ?? true);
    setRequiresStock((product as any)?.requiresStock ?? true);
  }, [product]);

  const resolveImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    return url.startsWith("http") ? url : `/api/storage${url}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    setUploading(true);
    try {
      console.log("[upload] Step 1: request upload URL");
      const urlRes = await apiFetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, contentType: file.type || "image/jpeg", size: file.size }),
      });
      if (!urlRes.ok) {
        const errText = await urlRes.text().catch(() => "");
        console.error("[upload] POST request-url failed:", urlRes.status, errText.slice(0, 200));
        throw new Error(`Gagal mendapatkan URL upload (${urlRes.status})`);
      }
      const { uploadURL, objectPath } = await urlRes.json();
      console.log("[upload] Step 2: PUT file to", uploadURL);

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) {
        const errText = await putRes.text().catch(() => "");
        console.error("[upload] PUT failed:", putRes.status, errText.slice(0, 200));
        throw new Error(`Upload gagal (${putRes.status})`);
      }

      console.log("[upload] Step 3: success, objectPath =", objectPath);
      setImageUrl(objectPath);
      toast.success("Gambar berhasil diupload");
    } catch (err: any) {
      console.error("[upload] error:", err);
      toast.error(err?.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!price) { toast.error("Harga jual wajib diisi"); return; }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) { toast.error("Harga jual harus berupa angka positif"); return; }

    const payload = { name: name.trim(), categoryId: categoryId && categoryId !== "none" ? Number(categoryId) : null, price: parsedPrice, imageUrl: imageUrl.trim() || null, isActive, requiresStock };
    setIsSubmitting(true);
    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, data: payload } as any);
        toast.success("Produk diperbarui"); 
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); 
        if (onProductChange) onProductChange(); 
        onOpenChange(false);
      } else {
        const newProduct = await createProduct.mutateAsync({ data: { ...payload, branchId } } as any);
        toast.success("Produk ditambahkan"); 
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); 
        if (onProductChange) onProductChange();
        if (onCreated) onCreated(newProduct);
      }
    } catch (err: any) { 
      toast.error(err?.response?.data?.error || err?.message || "Gagal menyimpan produk"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle className="text-lg">{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Tabs value={variantTab} onValueChange={setVariantTab} className="flex flex-col h-full">
            <TabsList className="flex h-auto shrink-0 w-full">
              <TabsTrigger value="basic" className="gap-1 flex-1 text-xs px-2 py-1.5 h-9"><Box className="w-3 h-3" /> Info</TabsTrigger>
              <TabsTrigger value="variants" className="gap-1 flex-1 text-xs px-2 py-1.5 h-9"><List className="w-3 h-3" /> Varian</TabsTrigger>
              <TabsTrigger value="bom" className="gap-1 flex-1 text-xs px-2 py-1.5 h-9"><ChefHat className="w-3 h-3" /> Resep</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="mt-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Nama Produk</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nama produk..." /></div>
                <div className="space-y-1.5"><Label>Harga Jual (Rp)</Label><Input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Kategori</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa kategori</SelectItem>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5">
                  <Label>Gambar Produk</Label>
                  {imageUrl ? (
                    <div className="relative w-full max-w-[200px]">
                      <img src={resolveImageUrl(imageUrl)} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/80 rounded-full" onClick={() => setImageUrl("")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? "Mengupload..." : "Pilih Gambar"}
                    </Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <p className="text-[11px] text-muted-foreground">Maksimal 5MB. Format: JPG, PNG, GIF.</p>
                </div>
                <div className="flex items-center justify-between"><Label htmlFor="isActive">Produk Aktif</Label><Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} /></div>
                <div className="flex items-center justify-between"><Label htmlFor="requiresStock">Perlu Stok (cek stok setengah jadi)</Label><Switch id="requiresStock" checked={requiresStock} onCheckedChange={setRequiresStock} /></div>
                <p className="text-xs text-muted-foreground -mt-2">Jika diaktifkan, produk akan mengecek stok setengah jadi. Jika tidak (On-Demand), stok kosong tetap bisa dijual.</p>
              </div>
            </TabsContent>
            <TabsContent value="variants" className="mt-4 overflow-y-auto max-h-[60vh]">{product ? <VariantsPanel productId={product.id} onVariantChange={() => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); if (onProductChange) onProductChange(); }} /> : <div className="py-12 text-center text-muted-foreground text-sm">Simpan produk terlebih dahulu untuk menambah varian</div>}</TabsContent>
            <TabsContent value="bom" className="mt-4 overflow-y-auto max-h-[60vh]">{product ? <BomPanel productId={product.id} onBomChange={() => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); if (onProductChange) onProductChange(); }} /> : <div className="py-12 text-center text-muted-foreground text-sm">Simpan produk terlebih dahulu untuk mengatur resep</div>}</TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="shrink-0"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────── */
/* Category Tab                         */
/* ──────────────────────────────────── */
function CategoryTab({ categories, onCategoryChange }: { categories: Category[]; onCategoryChange?: () => void }) {
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newCatName, setNewCatName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refreshCategories = () => { queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); if (onCategoryChange) onCategoryChange(); };

  const handleAdd = () => { if (!newCatName.trim()) return; createCategory.mutate({ data: { name: newCatName.trim() } }, { onSuccess: () => { toast.success("Kategori ditambahkan"); setNewCatName(""); refreshCategories(); }, onError: () => toast.error("Gagal menambah kategori") }); };
  const handleDelete = (id: number) => { deleteCategory.mutate({ id }, { onSuccess: () => { toast.success("Kategori dihapus"); refreshCategories(); setDeletingId(null); }, onError: () => toast.error("Gagal menghapus kategori") }); };

  return (<div className="space-y-4"><div className="flex gap-2"><Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nama kategori baru..." onKeyDown={e => e.key === "Enter" && handleAdd()} /><Button onClick={handleAdd} disabled={createCategory.isPending || !newCatName.trim()}><Plus className="w-4 h-4 mr-1" /> Tambah</Button></div><div className="border rounded-lg overflow-hidden">{categories.length === 0 ? (<div className="p-6 text-center text-muted-foreground"><Tag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-20" /><p>Belum ada kategori</p></div>) : (categories.map((cat, idx) => (<div key={cat.id} className={`flex items-center justify-between px-4 py-3 ${idx < categories.length - 1 ? "border-b" : ""}`}><div><p className="font-medium">{cat.name}</p><p className="text-xs text-muted-foreground">{cat.productCount} produk</p></div><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeletingId(cat.id)}><Trash2 className="w-4 h-4" /></Button></div>)))}</div><AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Kategori?</AlertDialogTitle><AlertDialogDescription>Produk dalam kategori ini tidak akan terhapus, hanya kategorinya saja yang dihapus.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => deletingId && handleDelete(deletingId)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>);
}

/* ──────────────────────────────────── */
/* Main Page                            */
/* ──────────────────────────────────── */
export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { branchId } = useBranch();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantsData, setVariantsData] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  const { data: categories = [] } = useListCategories();
  const { data: products = [], isLoading, refetch } = useListProducts(branchId != null ? { branchId, ...(filterCategory !== "all" ? { categoryId: Number(filterCategory) } : {}) } as any : undefined, { query: { enabled: branchId != null } } as any);

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (p: Product) => { setEditingProduct(p); setFormOpen(true); };
  const refreshProducts = () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); refetch(); };

  const handleDelete = async (id: number) => {
    try {
      const variantsRes = await fetch(`/api/products/${id}/variants`, { credentials: "include" });
      const variants = await variantsRes.json();
      for (const variant of variants) { await apiFetch(`/api/product-variants/${variant.id}`, { method: "DELETE" }); }
      deleteProduct.mutate({ id } as any, { onSuccess: () => { toast.success("Produk dihapus"); refreshProducts(); setDeletingProductId(null); }, onError: () => toast.error("Gagal menghapus produk") });
    } catch (error) { toast.error("Gagal menghapus varian produk"); }
  };

 const showVariants = async (product: Product) => {
  setSelectedProduct(product);
  setIsLoadingVariants(true);
  
  try {
    // 1. Ambil daftar semua semi_finished untuk mapping ID ke cost
    const allSemiFinishedRes = await fetch(`/api/semi-finished?branchId=${branchId}`, { 
      credentials: "include" 
    });
    const allSemiFinished = await allSemiFinishedRes.json();
    const semiFinishedMap = new Map();
    allSemiFinished.forEach((sf: any) => {
      semiFinishedMap.set(sf.id, sf);
    });
    
    // 2. Ambil daftar semua ingredients untuk mapping ID ke cost
    const allIngredientsRes = await fetch(`/api/ingredients?branchId=${branchId}`, { 
      credentials: "include" 
    });
    const allIngredients = await allIngredientsRes.json();
    const ingredientsMap = new Map();
    allIngredients.forEach((ing: any) => {
      ingredientsMap.set(ing.id, ing);
    });
    
    // 3. Ambil daftar varian produk
    const variantsRes = await fetch(`/api/products/${product.id}/variants`, { 
      credentials: "include" 
    });
    const variants = await variantsRes.json();
    
    // 4. Hitung HPP untuk setiap varian
    const variantsWithCost = await Promise.all(variants.map(async (v: any) => {
      let totalCost = 0;
      try {
        // Ambil BOM varian
        const recipeRes = await fetch(`/api/recipes?parentType=product_variant&parentId=${v.id}`, { 
          credentials: "include" 
        });
        const recipe = await recipeRes.json();
        
        // Hitung total HPP
        for (const comp of recipe) {
          if (comp.componentType === "semi_finished") {
            const sf = semiFinishedMap.get(comp.componentId);
            if (sf) {
              const cost = parseFloat(sf.costPricePerUnit) * comp.quantity;
              totalCost += cost;
              console.log(`  ${sf.name}: ${sf.costPricePerUnit} × ${comp.quantity} = ${cost}`);
            } else {
              console.warn(`Semi_finished ${comp.componentId} not found`);
            }
          } 
          else if (comp.componentType === "ingredient") {
            const ing = ingredientsMap.get(comp.componentId);
            if (ing) {
              const cost = parseFloat(ing.costPricePerUnit) * comp.quantity;
              totalCost += cost;
              console.log(`  ${ing.name}: ${ing.costPricePerUnit} × ${comp.quantity} = ${cost}`);
            } else {
              console.warn(`Ingredient ${comp.componentId} not found`);
            }
          }
        }
        console.log(`Total HPP for ${v.name}: Rp ${totalCost.toFixed(2)}`);
      } catch (err) {
        console.error(`Error calculating cost for variant ${v.id}:`, err);
      }
      
      return { 
        id: v.id,
        name: v.name, 
        price: parseFloat(v.price), 
        costPrice: totalCost 
      };
    }));
    
    setVariantsData(variantsWithCost);
    setVariantDialogOpen(true);
  } catch (error) { 
    console.error("Error fetching variants:", error); 
    setVariantsData([]); 
    setVariantDialogOpen(true);
  } finally { 
    setIsLoadingVariants(false); 
  }
};

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mt-3"><h1 className="font-bold text-lg tracking-tight">Produk</h1><button className="ml-auto shrink-0 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 touch-target active:scale-[0.97] transition-transform" onClick={() => { setEditingProduct(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Tambah</button></div>
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-hidden">
        <Tabs defaultValue="products" className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-4 shrink-0"><TabsList className="flex-wrap h-auto"><TabsTrigger value="products" className="gap-1.5"><Package className="w-4 h-4" /> Produk</TabsTrigger><TabsTrigger value="categories" className="gap-1.5"><Tag className="w-4 h-4" /> Kategori</TabsTrigger></TabsList></div>
          <TabsContent value="products" className="flex-1 overflow-hidden flex flex-col mt-3 md:mt-4 gap-3">
            <div className="flex gap-2 shrink-0 flex-wrap"><div className="relative flex-1 max-w-sm min-w-[140px]"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" /><Input className="pl-10 h-10 rounded-2xl bg-accent border-0" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} /></div><Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-36 h-10 rounded-2xl bg-accent border-0"><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select>{(search || filterCategory !== "all") && <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setFilterCategory("all"); }}><X className="w-4 h-4" /></Button>}</div>
            <ScrollArea className="flex-1">
              {isLoading ? (<div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>) : filtered.length === 0 ? (<div className="py-20 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>Tidak ada produk ditemukan</p></div>) : (<div className="divide-y divide-border"><div className="text-[11px] text-muted-foreground px-3 py-1.5 flex items-center gap-2"><span className="pl-10 flex-1">Produk</span><span className="w-16 text-right">HPP / Jual</span><span className="w-12 text-right">Aksi</span></div>
              {filtered.map((p, idx) => (<div key={p.id} className={`flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer ${idx < filtered.length - 1 ? "border-b" : ""}`} onClick={() => showVariants(p)}>
                <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground font-bold text-xs">{p.imageUrl ? <img src={p.imageUrl.startsWith("http") ? p.imageUrl : `/api/storage${p.imageUrl}`} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}</div>
                <div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{p.name}</p><div className="flex items-center gap-1 mt-0.5 flex-wrap">{p.categoryName && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{p.categoryName}</span>}</div></div>
                <div className="shrink-0 text-right"><p className="text-[11px] text-muted-foreground">{formatRp((p as any).costPrice ?? 0)}</p><p className="font-bold text-sm text-primary">{formatRp(p.price)}</p></div>
                <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}><Pencil className="w-3 h-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingProductId(p.id)}><Trash2 className="w-3 h-3" /></Button></div>
              </div>))}</div>)}</ScrollArea>
          </TabsContent>
          <TabsContent value="categories" className="mt-4"><CategoryTab categories={categories} onCategoryChange={refreshProducts} /></TabsContent>
        </Tabs>
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingProduct(null); }} product={editingProduct} categories={categories} onProductChange={refreshProducts} onCreated={(p) => { setEditingProduct(p); }} />
      <AlertDialog open={deletingProductId !== null} onOpenChange={() => setDeletingProductId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Produk?</AlertDialogTitle><AlertDialogDescription>Produk akan dihapus permanen dan tidak bisa dikembalikan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => deletingProductId && handleDelete(deletingProductId)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl">{selectedProduct?.name}</DialogTitle><DialogDescription>Detail varian dengan HPP dan harga jual</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {isLoadingVariants ? (<div className="text-center py-8">Loading...</div>) : variantsData.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><List className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>Tidak ada varian untuk produk ini</p><p className="text-xs mt-1">Klik "Edit Produk" untuk menambah varian</p></div>) : (variantsData.map((variant) => (<Card key={variant.id} className="border"><CardContent className="p-4"><div className="flex justify-between items-start"><div><p className="font-semibold text-base">{variant.name}</p><div className="flex flex-wrap gap-3 mt-1"><p className="text-xs text-muted-foreground">HPP: <span className="text-orange-600 font-medium">{formatRp(variant.costPrice ?? 0)}</span></p><p className="text-xs text-muted-foreground">Harga Jual: <span className="text-green-600 font-medium">{formatRp(variant.price)}</span></p></div></div><div className="text-right"><p className="text-xs text-muted-foreground">Margin</p><p className="font-bold text-primary">{formatRp((variant.price - (variant.costPrice ?? 0)))}</p></div></div></CardContent></Card>)))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2"><Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Tutup</Button><Button onClick={() => { setVariantDialogOpen(false); handleEdit(selectedProduct!); }}>Edit Produk</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}