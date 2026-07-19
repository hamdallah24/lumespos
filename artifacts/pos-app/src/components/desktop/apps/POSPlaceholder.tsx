import { useState, Component, type ReactNode } from "react";
import CashierPage from "@/pages/cashier";
import InventoryPage from "@/pages/inventory";
import ProductsPage from "@/pages/products";
import OrdersPage from "@/pages/orders";
import DashboardPage from "@/pages/dashboard";
import ShiftPage from "@/pages/shift";
import PengeluaranPage from "@/pages/pengeluaran";
import AuditsPage from "@/pages/audits";
import BranchesPage from "@/pages/branches";
import UsersPage from "@/pages/users";
import { BranchProvider, useBranch } from "@/lib/branch";
import { useTheme } from "next-themes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ShoppingBag, PieChart, Boxes, Package, Receipt, ClipboardList, Wallet, ClipboardCheck, Store, Users, Sun, Moon, WifiOff, AlertTriangle, Menu, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Page = "kasir" | "inventory" | "products" | "orders" | "dashboard" | "shift" | "pengeluaran" | "audits" | "branches" | "users";

const mainNav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "kasir", label: "Kasir", icon: ShoppingBag },
  { id: "inventory", label: "Stok & Bahan", icon: Boxes },
  { id: "products", label: "Produk", icon: Package },
  { id: "dashboard", label: "Laporan", icon: PieChart },
];

const secondaryNav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "orders", label: "Riwayat", icon: Receipt },
  { id: "shift", label: "Tutup Shift", icon: ClipboardList },
  { id: "pengeluaran", label: "Pengeluaran", icon: Wallet },
  { id: "audits", label: "Audit Shift", icon: ClipboardCheck },
  { id: "branches", label: "Cabang", icon: Store },
  { id: "users", label: "Pengguna", icon: Users },
];

class PageBoundary extends Component<{ children: ReactNode; page: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-medium text-white/70">Gagal memuat {this.props.page}</p>
          <p className="text-xs text-white/40 max-w-xs">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60">
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SidebarContent({
  page,
  onSelect,
}: {
  page: Page;
  onSelect: (id: Page) => void;
}) {
  const { theme, setTheme } = useTheme();
  const { isOnline, queuedCount } = useOnlineStatus();
  const { branches, branchId, setBranchId } = useBranch();

  return (
    <>
      <div className="px-3 pt-3 shrink-0">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Cabang</label>
        <Select value={branchId != null ? String(branchId) : undefined} onValueChange={(v) => setBranchId(Number(v))}>
          <SelectTrigger className="mt-1 h-8 text-xs rounded-xl">
            <div className="flex items-center gap-1.5 min-w-0">
              <Store size={12} className="shrink-0 opacity-50" />
              <SelectValue placeholder="Pilih cabang" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-1.5 flex flex-col gap-0.5">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left w-full ${active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-xs truncate">{item.label}</span>
            </button>
          );
        })}
        <div className="my-1 mx-2 h-px bg-border" />
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left w-full ${active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-xs truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border shrink-0 flex flex-col gap-1">
        {!isOnline && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 text-xs">
            <WifiOff size={12} />
            <span>Offline{queuedCount > 0 ? ` (${queuedCount})` : ""}</span>
          </div>
        )}
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors text-xs">
          {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
          <span>{theme === "dark" ? "Terang" : "Gelap"}</span>
        </button>
      </div>
    </>
  );
}

function POSInner() {
  const [page, setPage] = useState<Page>("kasir");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageLabel = [...mainNav, ...secondaryNav].find((n) => n.id === page)?.label ?? page;

  const handleSelect = (id: Page) => {
    setPage(id);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (page) {
      case "kasir": return <CashierPage />;
      case "inventory": return <InventoryPage />;
      case "products": return <ProductsPage />;
      case "orders": return <OrdersPage />;
      case "dashboard": return <DashboardPage />;
      case "shift": return <ShiftPage />;
      case "pengeluaran": return <PengeluaranPage />;
      case "audits": return <AuditsPage />;
      case "branches": return <BranchesPage />;
      case "users": return <UsersPage />;
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden text-sm">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-48 shrink-0 flex-col border-r border-border bg-card/50 h-full"
        style={{ position: "relative", zIndex: 60 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarContent page={page} onSelect={handleSelect} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col" style={{ position: "relative", zIndex: 1 }}>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-3 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">{pageLabel}</span>
        </div>

        <PageBoundary key={page} page={pageLabel}>
          {renderPage()}
        </PageBoundary>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent page={page} onSelect={handleSelect} />
          </aside>
        </div>
      )}
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
