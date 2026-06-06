import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, X, CreditCard, Banknote, QrCode, LayoutGrid, ShoppingBag } from "lucide-react";
import { useListCategories, useListProducts, useCreateOrder, getListProductsQueryKey } from "@workspace/api-client-react";
import { Product, OrderInputPaymentMethod } from "@workspace/api-client-react/src/generated/api.schemas";
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

export default function CashierPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<OrderInputPaymentMethod>("cash");
  const [amountPaidStr, setAmountPaidStr] = useState("");

  const { data: categories = [] } = useListCategories();
  const { data: products = [], isLoading: isLoadingProducts } = useListProducts({ 
    categoryId: activeCategory || undefined,
    search: searchQuery || undefined,
    active: true
  });

  const createOrder = useCreateOrder();

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Stok habis");
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.stock) {
          toast.error("Melebihi stok");
          return prev;
        }
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const newQ = p.cartQuantity + delta;
        if (newQ > p.stock) {
          toast.error("Melebihi stok");
          return p;
        }
        return newQ > 0 ? { ...p, cartQuantity: newQ } : p;
      }
      return p;
    }).filter(p => p.cartQuantity > 0));
  };

  const handleRemoveFromCart = (id: number) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart]);
  const amountPaid = parseFloat(amountPaidStr.replace(/[^0-9]/g, '')) || 0;
  const change = amountPaid - cartTotal;

  const handleCompleteOrder = () => {
    if (cart.length === 0) return;
    
    if (paymentMethod === "cash" && amountPaid < cartTotal) {
      toast.error("Nominal pembayaran kurang");
      return;
    }

    createOrder.mutate({
      data: {
        cashierName: "Admin",
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? amountPaid : cartTotal,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.cartQuantity
        }))
      }
    }, {
      onSuccess: () => {
        toast.success("Transaksi berhasil");
        setCart([]);
        setPaymentDialogOpen(false);
        setAmountPaidStr("");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
      onError: () => {
        toast.error("Gagal memproses transaksi");
      }
    });
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Products Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top bar */}
        <div className="h-16 border-b px-6 flex items-center gap-4 bg-card shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Cari produk..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:ring-primary"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <Button 
            variant={activeCategory === null ? "default" : "outline"}
            className="rounded-full shrink-0"
            onClick={() => setActiveCategory(null)}
          >
            Semua
          </Button>
          {categories.map(c => (
            <Button 
              key={c.id}
              variant={activeCategory === c.id ? "default" : "outline"}
              className="rounded-full shrink-0"
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Card key={i} className="h-48 animate-pulse bg-muted border-none" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <Card 
                  key={product.id} 
                  className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-md ${product.stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-xl">
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate" title={product.name}>{product.name}</h3>
                    <div className="flex justify-between items-end mt-1">
                      <p className="text-primary font-bold">{formatRp(product.price)}</p>
                      <p className="text-xs text-muted-foreground">{product.stock} stok</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-card border-l flex flex-col h-full shrink-0 shadow-lg z-10">
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
              {cart.map(item => (
                <div key={item.id} className="p-2 border rounded-lg bg-background flex flex-col gap-2 group relative">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm pr-6 truncate">{item.name}</span>
                    <span className="font-bold text-sm shrink-0">{formatRp(item.price * item.cartQuantity)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{formatRp(item.price)} / item</span>
                    <div className="flex items-center gap-2 bg-muted rounded-md p-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-foreground hover:bg-background" onClick={() => handleUpdateQuantity(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold w-6 text-center">{item.cartQuantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-foreground hover:bg-background" onClick={() => handleUpdateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={() => handleRemoveFromCart(item.id)}
                  >
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
          
          <Button 
            className="w-full h-14 text-lg font-bold" 
            disabled={cart.length === 0}
            onClick={() => setPaymentDialogOpen(true)}
          >
            Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Pembayaran</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Tagihan</p>
              <p className="text-3xl font-bold text-primary">{formatRp(cartTotal)}</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant={paymentMethod === "cash" ? "default" : "outline"} 
                  className="h-16 flex flex-col gap-1"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Tunai</span>
                </Button>
                <Button 
                  variant={paymentMethod === "card" ? "default" : "outline"} 
                  className="h-16 flex flex-col gap-1"
                  onClick={() => { setPaymentMethod("card"); setAmountPaidStr(cartTotal.toString()); }}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Kartu</span>
                </Button>
                <Button 
                  variant={paymentMethod === "qris" ? "default" : "outline"} 
                  className="h-16 flex flex-col gap-1"
                  onClick={() => { setPaymentMethod("qris"); setAmountPaidStr(cartTotal.toString()); }}
                >
                  <QrCode className="w-5 h-5" />
                  <span>QRIS</span>
                </Button>
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
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setAmountPaidStr(val);
                    }}
                    placeholder="0"
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 200000, cartTotal].map(amt => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAmountPaidStr(amt.toString())}
                    >
                      {amt === cartTotal ? "Uang Pas" : `${amt / 1000}k`}
                    </Button>
                  ))}
                </div>

                {amountPaid > 0 && (
                  <div className={`p-3 rounded-lg flex justify-between items-center ${change >= 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                    <span className="font-medium">Kembalian</span>
                    <span className="font-bold text-lg">{change >= 0 ? formatRp(change) : `Kurang ${formatRp(Math.abs(change))}`}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Batal</Button>
            <Button 
              onClick={handleCompleteOrder} 
              disabled={createOrder.isPending || (paymentMethod === "cash" && amountPaid < cartTotal)}
              className="px-8"
            >
              {createOrder.isPending ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
