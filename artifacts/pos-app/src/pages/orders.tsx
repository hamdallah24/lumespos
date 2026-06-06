import { useState } from "react";
import { useListOrders, useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { formatRp, formatDate } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Calendar, Banknote, CreditCard, QrCode, ChevronRight, X } from "lucide-react";

function paymentIcon(method: string) {
  if (method === "card") return <CreditCard className="w-3.5 h-3.5" />;
  if (method === "qris") return <QrCode className="w-3.5 h-3.5" />;
  return <Banknote className="w-3.5 h-3.5" />;
}

function paymentLabel(method: string) {
  if (method === "card") return "Kartu";
  if (method === "qris") return "QRIS";
  return "Tunai";
}

function OrderDetail({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { queryKey: getGetOrderQueryKey(orderId) },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-0.5">Waktu</p>
          <p className="text-sm font-medium">{formatDate(order.createdAt)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-0.5">Metode Bayar</p>
          <p className="text-sm font-medium flex items-center gap-1.5">{paymentIcon(order.paymentMethod)}{paymentLabel(order.paymentMethod)}</p>
        </div>
        {order.cashierName && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-0.5">Kasir</p>
            <p className="text-sm font-medium">{order.cashierName}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-0.5">Status</p>
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">Selesai</Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Item Pesanan</h4>
        <div className="border rounded-lg overflow-hidden">
          {order.items.map((item, idx) => (
            <div key={item.id} className={`flex items-center justify-between p-3 ${idx < order.items.length - 1 ? "border-b" : ""}`}>
              <div>
                <p className="font-medium text-sm">{item.productName}</p>
                <p className="text-xs text-muted-foreground">{formatRp(item.priceAtSale)} × {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm">{formatRp(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dibayar</span>
          <span>{formatRp(order.amountPaid ?? 0)}</span>
        </div>
        {(order.change ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kembalian</span>
            <span>{formatRp(order.change ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-bold">Total</span>
          <span className="font-bold text-xl text-primary">{formatRp(order.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useListOrders(
    dateFilter ? { date: dateFilter } : undefined
  );

  const totalToday = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 md:h-16 border-b px-4 md:px-6 flex items-center gap-3 bg-card shrink-0">
        <h1 className="font-bold text-lg md:text-xl tracking-tight shrink-0">Riwayat Transaksi</h1>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {orders.length > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Total {dateFilter ? "tanggal ini" : "hari ini"}</p>
              <p className="font-bold text-primary">{formatRp(totalToday)}</p>
            </div>
          )}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="date"
              className="pl-9 w-40 md:w-44"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" size="icon" onClick={() => setDateFilter("")}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-32">
            <Receipt className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium">Belum ada transaksi</p>
            <p className="text-sm mt-1 opacity-60">{dateFilter ? "Tidak ada transaksi pada tanggal ini" : "Transaksi akan muncul di sini"}</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className="w-full text-left"
              >
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                  <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Receipt className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">#{String(order.id).padStart(4, "0")}</p>
                        <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground">
                          {paymentIcon(order.paymentMethod)}
                          {paymentLabel(order.paymentMethod)}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">Selesai</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.createdAt)} · {order.itemCount} item</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm md:text-base text-primary">{formatRp(order.total)}</p>
                      {order.cashierName && <p className="text-xs text-muted-foreground hidden sm:block">{order.cashierName}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={selectedOrderId !== null} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi #{selectedOrderId ? String(selectedOrderId).padStart(4, "0") : ""}</DialogTitle>
          </DialogHeader>
          {selectedOrderId && (
            <OrderDetail orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
