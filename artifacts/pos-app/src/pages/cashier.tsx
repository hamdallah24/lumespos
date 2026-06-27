import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, X, CreditCard, Banknote, QrCode, LayoutGrid, ShoppingBag, LogOut, Trash2 } from "lucide-react";
import {
  useListCategories,
  useListProducts,
  useListProductVariants,
  useCreateOrder,
  useGetMe,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StartShiftDialog } from "@/components/StartShiftDialog";
import { motion, AnimatePresence } from "framer-motion";

type Product = {
  id: number;
  name: string;
  price: number;
  categoryId?: number;
  imageUrl?: string;
};

type Category = {
  id: number;
  name: string;
};

interface CartItem extends Product {
  cartQuantity: number;
  variantId?: number;
  variantName?: string;
}

type PayMethod = "cash" | "card" | "qris";

export default function CashierPage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { branchId } = useBranch();

  const [showStartShift, setShowStartShift] = useState(false);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isCheckingShift, setIsCheckingShift] = useState(true);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [amountPaidStr, setAmountPaidStr] = useState("");
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const checkActiveShift = async () => {
    if (!branchId) return;
    setIsCheckingShift(true);
    try {
      const res = await fetch(`/api/shift/active?branchId=${branchId}`, { credentials: "include" });
      const data = await res.json();
      if (data.hasActiveShift) {
        setIsShiftActive(true);
        setActiveShiftId(data.shift.id);
        setOpeningBalance(data.shift.openingBalance);
        setShowStartShift(false);
        const salesRes = await fetch(`/api/shift/sales?shiftId=${data.shift.id}`, { credentials: "include" });
        const salesData = await salesRes.json();
        setTotalSales(salesData.totalSales || 0);
      } else {
        setIsShiftActive(false);
        setShowStartShift(true);
      }
    } catch (error) {
      console.error("Check shift error:", error);
      setIsShiftActive(false);
      setShowStartShift(true);
    } finally {
      setIsCheckingShift(false);
    }
  };

  useEffect(() => {
    if (branchId) checkActiveShift();
  }, [branchId]);

  useEffect(() => {
    if (!isCheckingShift && isShiftActive && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [isCheckingShift, isShiftActive]);

  const { data: categoriesRaw } = useListCategories();
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as any)?.data ?? (categoriesRaw as any)?.items ?? [];
  const { data: productsRaw, isLoading: isLoadingProducts } = useListProducts(
    { branchId: branchId ?? 0, categoryId: activeCategory || undefined } as any,
    { query: { enabled: !!branchId && branchId > 0 } } as any
  );
  const products = Array.isArray(productsRaw) ? productsRaw : (productsRaw as any)?.data ?? (productsRaw as any)?.items ?? [];
  const { data: variants = [], isLoading: isLoadingVariants } = useListProductVariants(
    variantProduct?.id ?? 0,
    { query: { queryKey: ["listProductVariants", variantProduct?.id ?? 0], enabled: !!variantProduct } }
  );

  const createOrder = useCreateOrder();

  const handleAddToCart = (product: Product, variantPrice?: number, variantName?: string, variantId?: number) => {
    const effectivePrice = variantPrice ?? product.price;
    const effectiveName = variantName ? `${product.name} (${variantName})` : product.name;
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id && p.variantName === variantName);
      if (existing) {
        return prev.map((p) => p.id === product.id && p.variantName === variantName ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, name: effectiveName, price: effectivePrice, cartQuantity: 1, variantName, variantId }];
    });
  };

  const handleProductClick = (product: Product) => {
    setVariantProduct(product);
  };

  const handleSelectVariant = (price: number, variantName: string, variantId: number) => {
    if (!variantProduct) return;
    handleAddToCart(variantProduct, price, variantName, variantId);
    setVariantProduct(null);
  };

  const handleAddWithoutVariant = () => {
    if (!variantProduct) return;
    handleAddToCart(variantProduct);
    setVariantProduct(null);
  };

  const handleUpdateQuantity = (id: number, variantName: string | undefined, delta: number) => {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.id !== id || p.variantName !== variantName) return p;
        const newQ = p.cartQuantity + delta;
        if (newQ <= 0) return [];
        return { ...p, cartQuantity: newQ };
      })
    );
  };

  const removeFromCart = (id: number, variantName: string | undefined) => {
    setCart((prev) => prev.filter((p) => !(p.id === id && p.variantName === variantName)));
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
          items: cart.map((item) => ({
            productId: item.id,
            productVariantId: item.variantId ?? null,
            quantity: item.cartQuantity
          })),
        },
      },
      {
        onSuccess: () => {
          toast.success("Transaksi berhasil");
          setCart([]);
          setPaymentDialogOpen(false);
          setAmountPaidStr("");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          checkActiveShift();
        },
        onError: () => toast.error("Gagal memproses transaksi"),
      }
    );
  };

  if (isCheckingShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Memeriksa status shift...</p>
        </div>
      </div>
    );
  }

  if (!isShiftActive && showStartShift) {
    return (
      <StartShiftDialog
        open={showStartShift}
        onStart={() => {
          setShowStartShift(false);
          setIsShiftActive(true);
          checkActiveShift();
        }}
        onSkip={() => {
          setShowStartShift(false);
          setIsShiftActive(true);
        }}
        branchId={branchId ?? 0}
        cashierId={me?.id ?? 0}
        cashierName={me?.name ?? "Kasir"}
        role={me?.role}
      />
    );
  }

  return (
    <div className="flex h-full w-full bg-background flex-col lg:flex-row">
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="px-3 pt-3 pb-2 lg:px-6 lg:pt-4 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl border-b border-[#1565FF]/10 shrink-0 sticky top-0 z-20 rounded-2xl mt-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={searchRef}
              placeholder="Cari produk..."
              className="w-full pl-12 h-12 rounded-2xl bg-accent border-0 text-base focus-visible:ring-2 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
            <button
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target flex items-center ${activeCategory === null ? "bg-primary text-primary-foreground shadow-sm" : "bg-accent text-muted-foreground"}`}
              onClick={() => setActiveCategory(null)}
            >
              Semua
            </button>
            {categories.map((c: { id: number; name: string }) => (
              <button
                key={c.id}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target flex items-center ${activeCategory === c.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-accent text-muted-foreground"}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-4">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-2xl" />
                  <div className="mt-1.5 md:mt-2 h-3 md:h-4 bg-muted rounded-lg w-3/4" />
                  <div className="mt-0.5 md:mt-1 h-3 md:h-4 bg-muted rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
              {products.map((product: Product, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={product.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="min-h-[220px] md:aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl.startsWith("http") ? product.imageUrl : `/api/storage${product.imageUrl}`} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-lg md:text-2xl shadow-sm">
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-2 md:p-3">
                    <h3 className="font-semibold text-xs md:text-sm truncate">{product.name}</h3>
                    <p className="text-primary font-bold text-sm md:text-base mt-0.5 md:mt-1">{formatRp(product.price)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                      className="w-full mt-1.5 md:mt-2 h-8 md:h-10 rounded-xl bg-primary text-primary-foreground font-medium text-xs md:text-sm active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      Tambah
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
              <LayoutGrid className="w-10 h-10 mb-2 opacity-20" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>

        <Dialog open={!!variantProduct} onOpenChange={() => setVariantProduct(null)}>
          <DialogContent className="sm:max-w-sm mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Pilih Varian</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <p className="text-sm text-muted-foreground">{variantProduct?.name}</p>
              {isLoadingVariants ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : variants.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>Produk ini tidak punya varian</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVariant(v.price, v.name, v.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors touch-target"
                    >
                      <span className="font-medium text-sm">{v.name}</span>
                      <span className="text-primary font-bold">{formatRp(v.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setVariantProduct(null)}>Batal</Button>
              {variants.length === 0 && (
                <Button className="flex-1 rounded-xl" onClick={handleAddWithoutVariant}>Gunakan Harga Dasar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cart — Desktop sidebar */}
      <div className="hidden lg:flex w-96 bg-card border-l flex-col h-full shrink-0 shadow-lg">
        <div className="p-4 border-b shrink-0 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">Pesanan</h2>
            <p className="text-xs text-muted-foreground">{cart.length} item</p>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:bg-destructive/10 rounded-xl">
              <Trash2 className="w-4 h-4 mr-1" /> Kosongkan
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-3">
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={`cart-${item.id}-${item.variantName ?? 'default'}`} className="p-3 border rounded-xl bg-background">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm flex-1 truncate pr-2">{item.name}</span>
                    <button onClick={() => removeFromCart(item.id, item.variantName)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground">{formatRp(item.price)} / item</span>
                    <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                      <button onClick={() => handleUpdateQuantity(item.id, item.variantName, -1)} className="w-9 h-9 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                      <span className="text-sm font-semibold w-7 text-center">{item.cartQuantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.id, item.variantName, 1)} className="w-9 h-9 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-50">
              <ShoppingBag className="w-10 h-10 mb-4" />
              <p>Belum ada produk</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t shrink-0 space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="font-bold text-2xl text-primary">{formatRp(cartTotal)}</span>
          </div>
          <Button className="w-full h-14 text-lg font-bold rounded-2xl" disabled={cart.length === 0} onClick={() => setPaymentDialogOpen(true)}>
            Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Mobile bottom bar — floating cart summary + pay */}
      <div className="lg:hidden fixed bottom-36 inset-x-0 z-30 px-3 pb-3 pointer-events-none">
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-xl p-3 pointer-events-auto"
            >
              <button onClick={() => setCartOpen(true)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{cart.length} item</p>
                    <p className="text-xs text-muted-foreground">Ketuk untuk detail</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="font-bold text-base sm:text-lg text-primary">{formatRp(cartTotal)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPaymentDialogOpen(true); }}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-lg shadow-primary/25 active:scale-95 transition-transform"
                  >
                    Bayar
                  </button>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[85vh] flex flex-col">
          <div className="p-4 pr-14 border-b shrink-0 flex justify-between items-center">
            <div>
              <SheetTitle className="text-lg font-bold">Pesanan</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{cart.length} item</p>
            </div>
            <div className="flex items-center gap-3">
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:bg-destructive/10 rounded-xl">
                  <Trash2 className="w-4 h-4 mr-1" /> Kosongkan
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-3">
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={`sheet-${item.id}-${item.variantName ?? 'default'}`} className="p-3 border rounded-xl bg-background">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm flex-1 truncate pr-2">{item.name}</span>
                      <button onClick={() => removeFromCart(item.id, item.variantName)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-muted-foreground">{formatRp(item.price)} / item</span>
                      <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                        <button onClick={() => handleUpdateQuantity(item.id, item.variantName, -1)} className="w-10 h-10 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                        <span className="text-sm font-semibold w-8 text-center">{item.cartQuantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, item.variantName, 1)} className="w-10 h-10 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mb-4 opacity-50" />
                <p>Belum ada produk di pesanan</p>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t shrink-0 space-y-3 safe-bottom">
            <div className="flex justify-between items-end">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="font-bold text-xl text-primary">{formatRp(cartTotal)}</span>
            </div>
            <button
              onClick={() => { setCartOpen(false); setPaymentDialogOpen(true); }}
              disabled={cart.length === 0}
              className="w-full h-12 text-base font-bold rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              Bayar Sekarang
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-sm mx-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="text-center p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Total Tagihan</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">{formatRp(cartTotal)}</p>
              {me && <p className="text-xs text-muted-foreground mt-1">Kasir: {me.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "cash", label: "Tunai", icon: Banknote },
                  { key: "card", label: "Online", icon: CreditCard },
                  { key: "qris", label: "QRIS", icon: QrCode },
                ] as { key: PayMethod; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPaymentMethod(key);
                      if (key !== "cash") setAmountPaidStr(cartTotal.toString());
                    }}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors touch-target ${paymentMethod === key ? "bg-primary text-primary-foreground shadow-sm" : "bg-accent text-muted-foreground"}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-3">
                <label className="text-sm font-semibold">Uang Diterima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Rp</span>
                  <Input
                    autoFocus
                    className="pl-10 h-14 text-lg font-bold rounded-xl"
                    value={amountPaidStr}
                    onChange={(e) => setAmountPaidStr(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 200000, cartTotal].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountPaidStr(amt.toString())}
                      className="h-10 rounded-xl bg-accent text-sm font-medium active:scale-95 transition-transform touch-target"
                    >
                      {amt === cartTotal ? "Pas" : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
                {amountPaid > 0 && (
                  <div className={`p-4 rounded-xl flex justify-between items-center ${change >= 0 ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                    <span className="font-medium">Kembalian</span>
                    <span className="font-bold text-lg">{change >= 0 ? formatRp(change) : `Kurang ${formatRp(Math.abs(change))}`}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPaymentDialogOpen(false)}>Batal</Button>
            <Button
              className="flex-[2] rounded-xl h-12"
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
