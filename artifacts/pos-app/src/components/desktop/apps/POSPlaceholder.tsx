import { useState } from "react";
import CashierPage from "@/pages/cashier";
import InventoryPage from "@/pages/inventory";
import ProductsPage from "@/pages/products";
import OrdersPage from "@/pages/orders";
import DashboardPage from "@/pages/dashboard";
import { BranchProvider, useBranch } from "@/lib/branch";
import { useGetMe } from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ShoppingBag, PieChart, Boxes, Package, Receipt, Sun, Moon, WifiOff, Store } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Page = "kasir" | "inventory" | "products" | "orders" | "dashboard";

const nav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "kasir", label: "Kasir", icon: ShoppingBag },
  { id: "inventory", label: "Stok", icon: Boxes },
  { id: "products", label: "Produk", icon: Package },
  { id: "orders", label: "Riwayat", icon: Receipt },
  { id: "dashboard", label: "Laporan", icon: PieChart },
];

function POSInner() {
  const [page, setPage] = useState<Page>("kasir");
  const { theme, setTheme } = useTheme();
  const { isOnline, queuedCount } = useOnlineStatus();
  const { branches, branchId, setBranchId } = useBranch();

  const render = () => {
    switch (page) {
      case "kasir": return <CashierPage />;
      case "inventory": return <InventoryPage />;
      case "products": return <ProductsPage />;
      case "orders": return <OrdersPage />;
      case "dashboard": return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-12 lg:w-48 shrink-0 flex flex-col border-r border-border bg-card/50 h-full">
        {/* Branch */}
        <div className="hidden lg:block px-3 pt-3 shrink-0">
          <Select value={branchId != null ? String(branchId) : undefined} onValueChange={(v) => setBranchId(Number(v))}>
            <SelectTrigger className="h-8 text-xs rounded-xl">
              <div className="flex items-center gap-1.5 min-w-0">
                <Store size={12} className="shrink-0 opacity-50" />
                <SelectValue placeholder="Cabang" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 flex flex-col gap-0.5 items-center lg:items-stretch">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-2.5 px-2.5 lg:px-3 py-2 rounded-xl transition-all text-left ${active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="hidden lg:inline text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-border shrink-0 flex flex-col gap-1 items-center lg:items-stretch">
          {!isOnline && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 text-xs">
              <WifiOff size={12} />
              <span className="hidden lg:inline">Offline{queuedCount > 0 ? ` (${queuedCount})` : ""}</span>
            </div>
          )}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors text-xs">
            {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            <span className="hidden lg:inline">{theme === "dark" ? "Terang" : "Gelap"}</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {render()}
      </div>
    </div>
  );
}

export default function POSPlaceholder() {
  return (
    <BranchProvider>
      <POSInner />
    </BranchProvider>
  );
}
