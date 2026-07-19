import { useState } from "react";
import CashierPage from "@/pages/cashier";
import InventoryPage from "@/pages/inventory";
import ProductsPage from "@/pages/products";
import OrdersPage from "@/pages/orders";
import DashboardPage from "@/pages/dashboard";
import ShiftPage from "@/pages/shift";
import PengeluaranPage from "@/pages/pengeluaran";
import { BranchProvider, useBranch } from "@/lib/branch";
import { useGetMe } from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { LayoutGrid, ShoppingBag, PieChart, Store, Users, Crown, Shield, Boxes, ClipboardList, LogOut, Menu, X, User, Package, Receipt, Wallet, Sun, Moon, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type POSPage = "kasir" | "inventory" | "products" | "orders" | "dashboard" | "shift" | "pengeluaran";

const pages: { id: POSPage; label: string; icon: React.ElementType; show: "all" | "owner" }[] = [
  { id: "kasir", label: "Kasir", icon: ShoppingBag, show: "all" },
  { id: "inventory", label: "Stok", icon: Boxes, show: "all" },
  { id: "products", label: "Produk", icon: Package, show: "owner" },
  { id: "orders", label: "Riwayat", icon: Receipt, show: "all" },
  { id: "dashboard", label: "Laporan", icon: PieChart, show: "owner" },
  { id: "shift", label: "Tutup Shift", icon: ClipboardList, show: "all" },
  { id: "pengeluaran", label: "Pengeluaran", icon: Wallet, show: "owner" },
];

function POSContent({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activePage, setActivePage] = useState<POSPage>("kasir");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const { isOnline, queuedCount } = useOnlineStatus();
  const { branches, branchId, setBranchId } = useBranch();

  const role = user?.role ?? "cashier";
  const canManage = role === "owner" || role === "manager";
  const isOwner = role === "owner";

  const visiblePages = pages.filter((p) => p.show === "all" || (p.show === "owner" && canManage));

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const renderPage = () => {
    switch (activePage) {
      case "kasir": return <CashierPage />;
      case "inventory": return <InventoryPage />;
      case "products": return <ProductsPage />;
      case "orders": return <OrdersPage />;
      case "dashboard": return <DashboardPage />;
      case "shift": return <ShiftPage />;
      case "pengeluaran": return <PengeluaranPage />;
      default: return <CashierPage />;
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 h-full bg-gradient-to-b from-[#0A1F44] via-[#0A1F44]/95 to-[#071426] border-r border-white/[0.06] text-white/80">
        <div className="h-12 flex items-center px-4 border-b border-white/[0.06] gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-[#1565FF]/25">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-tight leading-tight text-white">Lume's POS</span>
            <span className="text-[9px] text-white/40 font-medium">{canManage ? "Management" : "Cashier"}</span>
          </div>
        </div>

        <div className="px-2 pt-3 shrink-0">
          <Select value={branchId != null ? String(branchId) : undefined} onValueChange={(v) => setBranchId(Number(v))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white/70 rounded-xl h-8 text-xs outline-none focus-visible:ring-1 focus-visible:ring-[#1565FF]/50">
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

        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
          {visiblePages.map((page) => {
            const Icon = page.icon;
            const active = activePage === page.id;
            return (
              <button
                key={page.id}
                onClick={() => { setActivePage(page.id); setSidebarOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-xs ${active ? "bg-[#1565FF]/15 text-[#1565FF] font-semibold" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
              >
                <Icon size={15} />
                <span>{page.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#1565FF]/15 flex items-center justify-center font-bold text-xs text-[#1565FF] shrink-0">
              {initials}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-semibold truncate text-white/90">{user?.name ?? "..."}</span>
              <span className="text-[10px] text-white/40">{isOwner ? "Owner" : "Manager"}</span>
            </div>
          </div>
          <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors text-xs">
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === "dark" ? "Terang" : "Gelap"}</span>
          </button>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs">
              <WifiOff size={13} />
              <span>Offline{queuedCount > 0 ? ` (${queuedCount})` : ""}</span>
            </div>
          )}
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs">
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden h-10 border-b border-white/[0.06] px-3 flex items-center gap-2 shrink-0 bg-[#0A1F44]/80 backdrop-blur-md">
          <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/5">
            <Menu size={16} />
          </button>
          <span className="text-xs font-semibold text-white/80 flex-1 text-center">{visiblePages.find((p) => p.id === activePage)?.label}</span>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderPage()}
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0A1F44] border-r border-white/[0.06] text-white/80 flex flex-col transition-transform duration-300 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          <span className="font-bold text-xs text-white">Lume's POS</span>
          <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
          {visiblePages.map((page) => {
            const Icon = page.icon;
            const active = activePage === page.id;
            return (
              <button key={page.id} onClick={() => { setActivePage(page.id); setSidebarOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-xs ${active ? "bg-[#1565FF]/15 text-[#1565FF] font-semibold" : "text-white/50 hover:bg-white/5"}`}>
                <Icon size={15} />
                <span>{page.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

export default function POSPlaceholder({ user, onSignOut }: { user?: any; onSignOut?: () => void }) {
  const { data: me } = useGetMe({ query: { queryKey: ["/api/users/me"], retry: 1 } });
  const currentUser = user ?? me;

  return (
    <BranchProvider>
      <POSContent user={currentUser} onSignOut={onSignOut ?? (() => {})} />
    </BranchProvider>
  );
}
