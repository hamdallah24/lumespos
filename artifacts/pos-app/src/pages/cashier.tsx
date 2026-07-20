import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, X, CreditCard, Banknote, QrCode, LayoutGrid, ShoppingBag, LogOut, Trash2, WifiOff, TrendingUp, ShoppingCart, Package, Wallet, BarChart3 } from "lucide-react";
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
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { queueOfflineOrder } from "@/lib/offline-db";
import { cacheProducts } from "@/lib/offline-db";
import ProductCard from "@/components/pos/ProductCard";
import AddProductCard from "@/components/pos/AddProductCard";
import { fetchPOSDailyStats, type POSDailyStats } from "@/lib/home/home-data";

type Product = {
  id: number;
  name: string;
  price: number;
  categoryId?: number;
  imageUrl?: string;
  hasVariants?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
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
  const { isOnline, queuedCount } = useOnlineStatus();

  const [showStartShift, setShowStartShift] = useState(false);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isCheckingShift, setIsCheckingShift] = useState(true);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  const [posStats, setPosStats] = useState<POSDailyStats | null>(null);

  const loadPosStats = async () => {
    try {
      const data = await fetchPOSDailyStats();
      setPosStats(data);
    } catch {}
  };

  useEffect(() => {
    if (isShiftActive) loadPosStats();
  }, [isShiftActive, totalSales]);

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [amountPaidStr, setAmountPaidStr] = useState("");
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Discount states
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValueStr, setDiscountValueStr] = useState("");
  const [applyTax, setApplyTax] = useState(false);

  // Manual custom order states
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPriceStr, setManualPriceStr] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);

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
    if (!isCheckingShift && isShiftActive && searchRef.current && window.innerWidth >= 1024) {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [isCheckingShift, isShiftActive]);

  const { data: categoriesRaw } = useListCategories();
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as any)?.data ?? (categoriesRaw as any)?.items ?? [];
  const { data: productsRaw, isLoading: isLoadingProducts } = useListProducts(
    { branchId: branchId ?? 0, categoryId: activeCategory || undefined } as any,
    { query: { enabled: !!branchId && branchId > 0 } } as any
  );
  const allProducts = Array.isArray(productsRaw) ? productsRaw : (productsRaw as any)?.data ?? (productsRaw as any)?.items ?? [];
  const products = useMemo(() => {
    if (!searchQuery.trim()) return allProducts;
    const q = searchQuery.toLowerCase();
    return allProducts.filter((p: Product) => p.name.toLowerCase().includes(q));
  }, [allProducts, searchQuery]);
  const { data: variants = [], isLoading: isLoadingVariants } = useListProductVariants(
    variantProduct?.id ?? 0,
    { query: { queryKey: ["listProductVariants", variantProduct?.id ?? 0], enabled: !!variantProduct } }
  );

  // Cache products to IndexedDB for offline browsing
  useEffect(() => {
    if (allProducts.length > 0 && isOnline) {
      cacheProducts(
        allProducts.map((p: Product) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          categoryId: p.categoryId ?? null,
          imageUrl: p.imageUrl ?? null,
          hasVariants: p.hasVariants ?? false,
          minPrice: p.minPrice ?? null,
          maxPrice: p.maxPrice ?? null,
        }))
      );
    }
  }, [allProducts, isOnline]);

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
  const discountValue = parseFloat(discountValueStr.replace(/[^0-9]/g, "")) || 0;
  const discountAmount = useMemo(() => {
    if (discountType === "percentage") return Math.min(cartTotal * (discountValue / 100), cartTotal);
    if (discountType === "fixed") return Math.min(discountValue, cartTotal);
    return 0;
  }, [cartTotal, discountType, discountValue]);
  const afterDiscount = cartTotal - discountAmount;
  const taxAmount = applyTax ? Math.round(afterDiscount * 0.11) : 0;
  const totalWithTax = afterDiscount + taxAmount;
  const amountPaid = parseFloat(amountPaidStr.replace(/[^0-9]/g, "")) || 0;
  const change = amountPaid - totalWithTax;

  const handleCompleteOrder = async () => {
    if (!cart.length) return;
    if (paymentMethod === "cash" && amountPaid < totalWithTax) { toast.error("Nominal pembayaran kurang"); return; }

    const orderPayload = {
      branchId,
      cashierName: me?.name ?? "Kasir",
      cashierId: me?.id ?? null,
      paymentMethod,
      amountPaid: paymentMethod === "cash" ? amountPaid : totalWithTax,
      discount: discountType !== "none" ? discountValue : undefined,
      discountType: discountType !== "none" ? discountType : undefined,
      applyTax: applyTax || undefined,
      items: cart.map((item) => ({
        productId: item.id < 0 ? null : item.id,
        productVariantId: item.variantId ?? null,
        quantity: item.cartQuantity,
        productName: item.id < 0 ? item.name : undefined,
        price: item.id < 0 ? item.price : undefined,
      })),
    };

    if (!isOnline) {
      await queueOfflineOrder({
        id: crypto.randomUUID(),
        payload: orderPayload,
        status: "pending",
        createdAt: Date.now(),
        retryCount: 0,
      });
      toast.success("Transaksi di-queue (offline). Akan disync otomatis saat online.");
      setCart([]);
      setPaymentDialogOpen(false);
      setAmountPaidStr("");
      setDiscountType("none");
      setDiscountValueStr("");
      setApplyTax(false);
      return;
    }

    createOrder.mutate(
      { data: orderPayload },
      {
        onSuccess: () => {
          toast.success("Transaksi berhasil");
          setCart([]);
          setPaymentDialogOpen(false);
          setAmountPaidStr("");
          setDiscountType("none");
          setDiscountValueStr("");
          setApplyTax(false);
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
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <WifiOff size={14} />
              <span>Offline — transaksi akan di-queue{queuedCount > 0 ? ` (${queuedCount} pending)` : ""}</span>
            </div>
          )}
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
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-[#1565FF]/10 text-primary border border-[#1565FF]/20 hover:bg-[#1565FF]/20 transition-colors touch-target flex items-center gap-1"
              onClick={() => setManualDialogOpen(true)}
            >
              <Plus size={14} /> Custom Order
            </button>
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

        <div className={`flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-4 ${cart.length > 0 ? "pb-24 lg:pb-4" : ""}`}>
          {posStats && posStats.totalSales > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
              {([
                { label: "Penjualan Hari Ini", value: formatRp(posStats.totalSales), icon: BarChart3, color: "#2563EB" },
                { label: "Transaksi", value: String(posStats.totalOrders), icon: ShoppingCart, color: "#10B981" },
                { label: "Rata-rata Order", value: formatRp(posStats.avgOrderValue), icon: TrendingUp, color: "#8B5CF6" },
                { label: "Produk Terjual", value: String(posStats.productsSold), icon: Package, color: "#F59E0B" },
                { label: "Gross Profit", value: formatRp(posStats.grossProfit), icon: Wallet, color: "#EF4444" },
              ] as const).map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-2xl p-2.5 md:p-3 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate leading-tight">{stat.label}</p>
                  <p className="text-xs md:text-sm font-bold mt-0.5 truncate">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
          {isLoadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-2xl" />
                  <div className="mt-1.5 md:mt-2 h-3 md:h-4 bg-muted rounded-lg w-3/4" />
                  <div className="mt-0.5 md:mt-1 h-3 md:h-4 bg-muted rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
              {products.map((product: Product, idx: number) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  onAdd={handleProductClick}
                />
              ))}
              <AddProductCard onClick={() => setManualDialogOpen(true)} />
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
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRp(cartTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Diskon {discountType === "percentage" ? `(${discountValue}%)` : ""}</span>
                <span>-{formatRp(discountAmount)}</span>
              </div>
            )}
            {applyTax && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">PPN (11%)</span>
                <span>{formatRp(taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-end">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-xl text-primary">{formatRp(totalWithTax)}</span>
            </div>
          </div>
          <Button className="w-full h-14 text-lg font-bold rounded-2xl" disabled={cart.length === 0} onClick={() => setPaymentDialogOpen(true)}>
            Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Mobile bottom bar — floating cart summary + pay */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-3 pb-[80px] pointer-events-none">
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-3 pointer-events-auto"
            >
              <button onClick={() => setCartOpen(true)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{cart.length} item</p>
                    <p className="text-xs text-slate-400">Ketuk untuk detail</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="font-bold text-base sm:text-lg text-white">{formatRp(totalWithTax)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPaymentDialogOpen(true); }}
                    className="h-10 px-4 rounded-xl bg-white text-slate-900 font-semibold text-xs sm:text-sm shadow-lg active:scale-95 transition-transform"
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
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRp(cartTotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon {discountType === "percentage" ? `(${discountValue}%)` : ""}</span>
                  <span>-{formatRp(discountAmount)}</span>
                </div>
              )}
              {applyTax && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PPN (11%)</span>
                  <span>{formatRp(taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-end">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-primary">{formatRp(totalWithTax)}</span>
              </div>
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
            {/* Rincian Harga */}
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cart.length} item)</span>
                <span>{formatRp(cartTotal)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-muted-foreground">Diskon</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={discountType}
                    onChange={(e) => { setDiscountType(e.target.value as any); setDiscountValueStr(""); }}
                    className="h-8 px-2 rounded-lg bg-background border text-xs"
                  >
                    <option value="none">Tidak ada</option>
                    <option value="percentage">%</option>
                    <option value="fixed">Rp</option>
                  </select>
                  {discountType !== "none" && (
                    <Input
                      className="h-8 w-24 text-xs rounded-lg"
                      value={discountValueStr}
                      onChange={(e) => setDiscountValueStr(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={discountType === "percentage" ? "0" : "0"}
                    />
                  )}
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Potongan {discountType === "percentage" ? `(${discountValue}%)` : ""}</span>
                  <span>-{formatRp(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-muted-foreground">PPN (11%)</span>
                <button
                  type="button"
                  onClick={() => setApplyTax(!applyTax)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${applyTax ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${applyTax ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {applyTax && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground pl-4">PPN 11%</span>
                  <span>{formatRp(taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold">Total Tagihan</span>
                <span className="font-bold text-xl text-primary">{formatRp(totalWithTax)}</span>
              </div>
              {me && <p className="text-xs text-muted-foreground text-right">Kasir: {me.name}</p>}
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
                  {[50000, 100000, 200000, totalWithTax].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountPaidStr(amt.toString())}
                      className="h-10 rounded-xl bg-accent text-sm font-medium active:scale-95 transition-transform touch-target"
                    >
                      {amt === totalWithTax ? "Pas" : `${amt / 1000}k`}
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
              disabled={createOrder.isPending || (paymentMethod === "cash" && amountPaid < totalWithTax)}
            >
              {createOrder.isPending ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Custom Order Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Tambah Custom Order</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Nama / Deskripsi Order</label>
              <Input
                placeholder="Contoh: Kaos Sablon Custom"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Harga Satuan</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Rp</span>
                <Input
                  placeholder="0"
                  value={manualPriceStr}
                  onChange={(e) => setManualPriceStr(e.target.value.replace(/[^0-9]/g, ""))}
                  className="pl-10 rounded-xl h-11 text-base font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Jumlah (Qty)</label>
              <div className="flex items-center gap-2 bg-muted rounded-xl p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setManualQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold w-7 text-center">{manualQuantity}</span>
                <button
                  type="button"
                  onClick={() => setManualQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setManualDialogOpen(false)}>Batal</Button>
            <Button
              className="flex-[2] rounded-xl"
              onClick={() => {
                if (!manualName.trim()) { toast.error("Nama order harus diisi"); return; }
                const price = parseFloat(manualPriceStr) || 0;
                if (price <= 0) { toast.error("Harga harus lebih dari 0"); return; }
                
                const customProduct: Product = {
                  id: -(Date.now() + Math.floor(Math.random() * 1000)),
                  name: manualName,
                  price: price,
                };
                
                setCart(prev => {
                  return [...prev, { ...customProduct, cartQuantity: manualQuantity }];
                });
                
                toast.success("Order manual ditambahkan");
                setManualDialogOpen(false);
                setManualName("");
                setManualPriceStr("");
                setManualQuantity(1);
              }}
            >
              Tambah ke Keranjang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
