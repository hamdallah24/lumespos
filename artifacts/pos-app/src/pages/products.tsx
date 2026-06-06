import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts, useListCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCreateCategory, useDeleteCategory,
  getListProductsQueryKey, getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { Product, Category } from "@workspace/api-client-react";
import { formatRp } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Package, Tag, X } from "lucide-react";
import { toast } from "sonner";

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId ? String(product.categoryId) : "none");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const isEdit = product !== null;
  const isPending = createProduct.isPending || updateProduct.isPending;

  const handleSubmit = () => {
    if (!name.trim() || !price) {
      toast.error("Nama dan harga wajib diisi");
      return;
    }
    const payload = {
      name: name.trim(),
      categoryId: categoryId && categoryId !== "none" ? Number(categoryId) : null,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      imageUrl: imageUrl.trim() || null,
      isActive,
    };

    if (isEdit && product) {
      updateProduct.mutate({ id: product.id, data: payload }, {
        onSuccess: () => {
          toast.success("Produk diperbarui");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast.error("Gagal memperbarui produk"),
      });
    } else {
      createProduct.mutate({ data: payload }, {
        onSuccess: () => {
          toast.success("Produk ditambahkan");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast.error("Gagal menambah produk"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nama Produk</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nama produk..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Harga (Rp)</Label>
              <Input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Stok</Label>
              <Input type="number" value={stock} onChange={e => setStock(e.target.value)} min="0" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa kategori</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>URL Gambar (opsional)</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Produk Aktif</Label>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryTab({ categories }: { categories: Category[] }) {
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newCatName, setNewCatName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newCatName.trim()) return;
    createCategory.mutate({ data: { name: newCatName.trim() } }, {
      onSuccess: () => {
        toast.success("Kategori ditambahkan");
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        setNewCatName("");
      },
      onError: () => toast.error("Gagal menambah kategori"),
    });
  };

  const handleDelete = (id: number) => {
    deleteCategory.mutate({ id }, {
      onSuccess: () => {
        toast.success("Kategori dihapus");
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        setDeletingId(null);
      },
      onError: () => toast.error("Gagal menghapus kategori"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          placeholder="Nama kategori baru..."
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={createCategory.isPending || !newCatName.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Belum ada kategori</p>
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={cat.id} className={`flex items-center justify-between px-4 py-3 ${idx < categories.length - 1 ? "border-b" : ""}`}>
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.productCount} produk</p>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeletingId(cat.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>Produk dalam kategori ini tidak akan terhapus, hanya kategorinya saja yang dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deletingId && handleDelete(deletingId)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  const { data: categories = [] } = useListCategories();
  const { data: products = [], isLoading } = useListProducts(
    filterCategory !== "all" ? { categoryId: Number(filterCategory) } : undefined
  );

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate({ id }, {
      onSuccess: () => {
        toast.success("Produk dihapus");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeletingProductId(null);
      },
      onError: () => toast.error("Gagal menghapus produk"),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 border-b px-6 flex items-center gap-4 bg-card shrink-0">
        <h1 className="font-bold text-xl tracking-tight">Manajemen Produk</h1>
        <Button className="ml-auto" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Tambah Produk
        </Button>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        <Tabs defaultValue="products" className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-4 shrink-0">
            <TabsList>
              <TabsTrigger value="products" className="gap-1.5">
                <Package className="w-4 h-4" /> Produk
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5">
                <Tag className="w-4 h-4" /> Kategori
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products" className="flex-1 overflow-hidden flex flex-col mt-4 gap-3">
            <div className="flex gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input className="pl-9" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || filterCategory !== "all") && (
                <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setFilterCategory("all"); }}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>Tidak ada produk ditemukan</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  {filtered.map((p, idx) => (
                    <div key={p.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors ${idx < filtered.length - 1 ? "border-b" : ""}`}>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground font-bold">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.categoryName && <Badge variant="secondary" className="text-xs">{p.categoryName}</Badge>}
                          {!p.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Nonaktif</Badge>}
                          <span className="text-xs text-muted-foreground">{p.stock} stok</span>
                          {p.stock <= 5 && p.stock > 0 && <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50">Stok Rendah</Badge>}
                          {p.stock === 0 && <Badge variant="outline" className="text-xs text-destructive border-destructive/20 bg-destructive/10">Habis</Badge>}
                        </div>
                      </div>
                      <p className="font-bold text-primary shrink-0">{formatRp(p.price)}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletingProductId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <CategoryTab categories={categories} />
          </TabsContent>
        </Tabs>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingProduct(null); }}
        product={editingProduct}
        categories={categories}
      />

      <AlertDialog open={deletingProductId !== null} onOpenChange={() => setDeletingProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>Produk akan dihapus permanen dan tidak bisa dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deletingProductId && handleDelete(deletingProductId)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
