import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, X, CreditCard, Banknote, QrCode, LayoutGrid, ShoppingBag } from "lucide-react";
import {
  useListCategories,
  useListProducts,
  useCreateOrder,
  useGetMe,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface CartItem extends Product {
  cartQuantity: number;
}

type PayMethod = "cash" | "card" | "qris";

export default function CashierPage() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { branchId } = useBranch();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [amountPaidStr, setAmountPaidStr] = useState("");

  const { data: categories = [] } = useListCategories();
  const { data: products = [], isLoading: isLoadingProducts } = useListProducts({
    categoryId: activeCategory || undefined,
    search: searchQuery || undefined,
    active: true,
  });

  const createOrder = useCreateOrder();

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error("Stok habis"); return; }
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.stock) { toast.error("Melebihi stok"); return prev; }
        return prev.map((p) => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQ = p.cartQuantity + delta;
          if (newQ > p.stock) { toast.error("Melebihi stok"); return p; }
          return newQ > 0 ? { ...p, cartQuantity: newQ } : p;
        }
        return p;
      }).filter((p) => p.cartQuantity > 0)
    );
  };

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.cartQuantity, 0), [cart]);
  const amountPaid = parseFloat(amountPaidStr.replace(/[^0-9]/g, "")) || 0;
  const change = amountPaid - cartTotal;

  const handleCompleteOrder = () => {
    if (!cart.length) return;
    if (paymentMethod === "cash" && amountPaid < cartTotal) { toast.error("Nominal pembayaran kurang"); return; }

    createOrder.mutate(
      {
        data: {
          branchId,
          cashierName: me?.name ?? "Kasir",
          cashierId: me?.id ?? null,
          paymentMethod,
          amountPaid: paymentMethod === "cash" ? amountPaid : cartTotal,
          items: cart.map((item) => ({ productId: item.id, quantity: item.cartQuantity })),
        },
      },
      {
        onSuccess: () => {
          toast.success("Transaksi berhasil");
          setCart([]);
          setPaymentDialogOpen(false);
          setAmountPaidStr("");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: () => toast.error("Gagal memproses transaksi"),
      }
    );
  };

  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden flex-col md:flex-row">
      {/* Products area */}
      <div className="flex-1 flex flex-col h-full min-w-0 order-1">
        <div className="h-14 md:h-16 border-b px-4 md:px-6 flex items-center gap-3 bg-card shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari produk..."
              className="pl-9 bg-muted/50 border-transparent focus-visible:ring-primary h-9 md:h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Mobile cart toggle */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden relative shrink-0"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="w-4 h-4 mr-1" />
            <span className="text-sm font-bold">{cart.length}</span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                {cart.length}
              </span>
            )}
          </Button>
        </div>

        <div className="px-4 md:px-6 py-3 md:py-4 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <Button variant={activeCategory === null ? "default" : "outline"} className="rounded-full shrink-0 text-xs md:text-sm" onClick={() => setActiveCategory(null)}>Semua</Button>
          {categories.map((c) => (
            <Button key={c.id} variant={activeCategory === c.id ? "default" : "outline"} className="rounded-full shrink-0 text-xs md:text-sm" onClick={() => setActiveCategory(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 px-4 md:px-6 pb-4 md:pb-6">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {[1,2,3,4,5,6,7,8].map((i) => <Card key={i} className="h-40 md:h-48 animate-pulse bg-muted border-none" />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-md ${product.stock <= 0 ? "opacity-50 grayscale" : ""}`}
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-lg md:text-xl">
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2 md:p-3">
                    <h3 className="font-semibold text-xs md:text-sm truncate">{product.name}</h3>
                    <div className="flex justify-between items-end mt-1">
                      <p className="text-primary font-bold text-xs md:text-sm">{formatRp(product.price)}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">{product.stock} stok</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
              <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart — desktop sidebar, mobile slide-up */}
      <div className="hidden md:flex w-96 bg-card border-l flex-col h-full shrink-0 shadow-lg z-10">
        <div className="p-4 border-b shrink-0 flex justify-between items-center bg-muted/30">
          <h2 className="font-bold text-lg">Pesanan Saat Ini</h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              Kosongkan
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-2">
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="p-2 border rounded-lg bg-background flex flex-col gap-2 group relative">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm pr-6 truncate">{item.name}</span>
                    <span className="font-bold text-sm shrink-0">{formatRp(item.price * item.cartQuantity)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{formatRp(item.price)} / item</span>
                    <div className="flex items-center gap-2 bg-muted rounded-md p-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => handleUpdateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm font-semibold w-6 text-center">{item.cartQuantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => handleUpdateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => setCart((prev) => prev.filter((p) => p.id !== item.id))}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-50">
              <ShoppingBag className="w-12 h-12 mb-4" />
              <p>Belum ada produk di pesanan</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10 shrink-0 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRp(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pajak (0%)</span>
              <span>Rp 0</span>
            </div>
            <Separator />
            <div className="flex justify-between items-end">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-2xl text-primary">{formatRp(cartTotal)}</span>
            </div>
          </div>
          <Button className="w-full h-14 text-lg font-bold" disabled={cart.length === 0} onClick={() => setPaymentDialogOpen(true)}>
            Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Mobile cart slide-up */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b shrink-0 flex justify-between items-center bg-muted/30">
              <h2 className="font-bold text-lg">Pesanan Saat Ini</h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    Kosongkan
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-2 min-h-[200px]">
              {cart.length > 0 ? (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="p-2 border rounded-lg bg-background flex flex-col gap-2 relative">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm pr-8 truncate">{item.name}</span>
                        <span className="font-bold text-sm shrink-0">{formatRp(item.price * item.cartQuantity)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{formatRp(item.price)} / item</span>
                        <div className="flex items-center gap-2 bg-muted rounded-md p-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => handleUpdateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                          <span className="text-sm font-semibold w-6 text-center">{item.cartQuantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => handleUpdateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setCart((prev) => prev.filter((p) => p.id !== item.id))}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <ShoppingBag className="w-12 h-12 mb-4" />
                  <p>Belum ada produk di pesanan</p>
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t bg-muted/10 shrink-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRp(cartTotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-end">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-xl text-primary">{formatRp(cartTotal)}</span>
                </div>
              </div>
              <Button className="w-full h-14 text-lg font-bold" disabled={cart.length === 0} onClick={() => { setCartOpen(false); setPaymentDialogOpen(true); }}>
                Bayar Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Tagihan</p>
              <p className="text-3xl font-bold text-primary">{formatRp(cartTotal)}</p>
              {me && <p className="text-xs text-muted-foreground mt-1">Kasir: {me.name}</p>}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: "cash", label: "Tunai", icon: Banknote },
                  { key: "card", label: "Kartu", icon: CreditCard },
                  { key: "qris", label: "QRIS", icon: QrCode },
                ] as { key: PayMethod; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={paymentMethod === key ? "default" : "outline"}
                    className="h-16 flex flex-col gap-1"
                    onClick={() => {
                      setPaymentMethod(key);
                      if (key !== "cash") setAmountPaidStr(cartTotal.toString());
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-semibold">Uang Diterima</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Rp</span>
                  <Input
                    autoFocus
                    className="pl-9 h-12 text-lg font-bold"
                    value={amountPaidStr}
                    onChange={(e) => setAmountPaidStr(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 200000, cartTotal].map((amt) => (
                    <Button key={amt} variant="outline" size="sm" onClick={() => setAmountPaidStr(amt.toString())}>
                      {amt === cartTotal ? "Uang Pas" : `${amt / 1000}k`}
                    </Button>
                  ))}
                </div>
                {amountPaid > 0 && (
                  <div className={`p-3 rounded-lg flex justify-between items-center ${change >= 0 ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                    <span className="font-medium">Kembalian</span>
                    <span className="font-bold text-lg">{change >= 0 ? formatRp(change) : `Kurang ${formatRp(Math.abs(change))}`}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPaymentDialogOpen(false)}>Batal</Button>
            <Button
              className="w-full sm:w-auto px-8"
              onClick={handleCompleteOrder}
              disabled={createOrder.isPending || (paymentMethod === "cash" && amountPaid < cartTotal)}
            >
              {createOrder.isPending ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
