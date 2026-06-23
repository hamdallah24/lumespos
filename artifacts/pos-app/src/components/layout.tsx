import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, ShoppingBag, PieChart, Store, Users, Crown, Shield, Boxes, ClipboardCheck, ClipboardList, LogOut, Menu, X, User, Package, Home, Plus, Receipt, Carrot, UserPlus, Sun, Moon, Wallet } from "lucide-react";
import type { AppUser } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: React.ReactNode;
  role?: string;
  user?: AppUser;
  onSignOut: () => void;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function roleLabel(role?: string) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Kasir";
}

function roleIcon(role?: string) {
  if (role === "owner") return <Crown className="w-3 h-3 text-yellow-400" />;
  if (role === "manager") return <Shield className="w-3 h-3 text-blue-400" />;
  return null;
}

function NavItem({ href, icon: Icon, label, active, onClick }: { href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all outline-none active:scale-[0.98] ${active ? "bg-[#1565FF]/10 text-[#1565FF] font-semibold" : "text-foreground/70 hover:bg-[#1565FF]/8 hover:text-[#1565FF]"}`}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export function Layout({ children, role, user, onSignOut }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [fabOpen, setFabOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const fabRef = React.useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const canManage = role === "owner" || role === "manager";
  const isOwner = role === "owner";
  const { branches, branchId, setBranchId } = useBranch();

  const bottomNav = canManage ? [
    { href: "/", label: "Kasir", icon: ShoppingBag },
    { href: "/inventory", label: "Stok", icon: Boxes },
    { href: "/products", label: "Produk", icon: Package },
    { href: "/dashboard", label: "Laporan", icon: PieChart },
    { href: "#account", label: "Akun", icon: User },
  ] : [
    { href: "/", label: "Kasir", icon: ShoppingBag },
    { href: "/orders", label: "Riwayat", icon: Receipt },
    { href: "/shift", label: "Tutup Shift", icon: ClipboardList },
    { href: "/pengeluaran", label: "Pengeluaran", icon: Wallet },
  ];

  const sidebarNav = canManage ? [
    { href: "/", label: "Kasir", icon: ShoppingBag },
    { href: "/inventory", label: "Stok", icon: Boxes },
    { href: "/products", label: "Produk", icon: Package },
    { href: "/dashboard", label: "Laporan", icon: PieChart },
    { href: "#account", label: "Akun", icon: User },
  ] : [
    { href: "/", label: "Kasir", icon: ShoppingBag },
    { href: "/orders", label: "Riwayat", icon: Receipt },
    { href: "/shift", label: "Tutup Shift", icon: ClipboardList },
    { href: "/pengeluaran", label: "Pengeluaran", icon: Wallet },
  ];

  const secondaryNav = [
    { href: "/orders", label: "Riwayat", icon: Receipt, show: true },
    { href: "/shift", label: "Tutup Shift", icon: ClipboardList, show: true },
    { href: "/inventory", label: "Stok & Bahan", icon: Boxes, show: canManage },
    { href: "/audits", label: "Audit Shift", icon: ClipboardCheck, show: canManage },
    { href: "/branches", label: "Cabang", icon: Store, show: isOwner },
    { href: "/users", label: "Pengguna", icon: Users, show: isOwner },
  ].filter((i) => i.show);

  const fabActions = [
    { label: "Tambah Transaksi", icon: Receipt, href: "/", show: true },
    { label: "Catat Pengeluaran", icon: Wallet, href: "/pengeluaran", show: true },
    { label: "Tambah Produk", icon: Package, href: "/products", show: canManage },
    { label: "Tambah Stok", icon: Boxes, href: "/inventory", show: canManage },
    { label: "Tambah Pelanggan", icon: UserPlus, href: "/customers", show: canManage },
  ].filter((i) => i.show);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const closeSidebar = () => setSidebarOpen(false);

  const isActive = (href: string) => {
    if (href === "#account") return false;
    return location === href || (href !== "/" && location.startsWith(href));
  };

  const isBottomActive = (item: typeof bottomNav[0]) => {
    if (item.href === "#account") return false;
    if (item.href === "/" && location === "/") return true;
    return location === item.href || (item.href !== "/" && location.startsWith(item.href));
  };

  const handleFabAction = (href: string) => {
    setFabOpen(false);
    if (href.startsWith("/")) {
      setLocation(href);
    }
  };

  const handleAccountClick = () => {
    setAccountOpen(true);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — floating glass panel */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:fixed lg:left-3 lg:top-3 lg:bottom-3 lg:rounded-2xl bg-gradient-to-b from-[#1565FF]/[0.10] via-[#0A1F44]/[0.04] to-[#0A1F44]/[0.02] backdrop-blur-xl border border-[#1565FF]/20 shadow-lg shadow-[#1565FF]/5 text-foreground dark:from-[#0A1F44] dark:via-[#0A1F44]/95 dark:to-[#0A1F44] dark:border-white/[0.06]">
        <div className="h-16 flex items-center px-6 border-b border-[#1565FF]/10 dark:border-white/[0.06] gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-tight">Lume's</span>
            <span className="text-[10px] text-muted-foreground font-medium">Everywhere</span>
          </div>
        </div>

        <div className="px-3 pt-4">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-1">Cabang</label>
          <Select
            value={branchId != null ? String(branchId) : undefined}
            onValueChange={(v) => setBranchId(Number(v))}
          >
            <SelectTrigger className="mt-1 bg-card/50 border-[#1565FF]/15 text-foreground rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <div className="flex items-center gap-2 min-w-0">
                <Store size={14} className="shrink-0 opacity-60" />
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

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 sidebar-scrollbar">
          {sidebarNav.map((item) => {
            if (item.href === "#account") {
              return (
                <button key={item.label} onClick={handleAccountClick} className="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all outline-none active:scale-[0.98] text-foreground/70 hover:bg-[#1565FF]/8 hover:text-[#1565FF]">
                  <item.icon size={19} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            }
            return (
              <NavItem key={item.label} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={closeSidebar} />
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1565FF]/10 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center gap-3.5 px-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1565FF]/10 to-[#1565FF]/5 flex items-center justify-center font-bold text-sm text-[#1565FF] shrink-0">
              {initials}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold truncate">{user?.name ?? "Loading..."}</span>
              <div className="flex items-center gap-1">
                {roleIcon(role)}
                <span className="text-xs text-muted-foreground">{roleLabel(role)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all outline-none active:scale-[0.98] text-foreground/60 hover:bg-[#1565FF]/8 hover:text-[#1565FF] text-sm"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span className="font-medium">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all outline-none active:scale-[0.98] text-foreground/60 hover:bg-red-500/10 dark:hover:bg-red-500/15 hover:text-red-500 text-sm"
          >
            <LogOut size={16} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative lg:ml-[17.5rem] min-h-dvh">
        {/* Mobile header — 72px Apple-style */}
        <div className="lg:hidden h-[72px] border-b border-slate-100 dark:border-slate-800 px-4 flex items-center shrink-0 sticky top-0 z-30 bg-white/90 dark:bg-[#0F1D32]/90 backdrop-blur-xl">
          <button className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#2563EB]/30">
              L
            </div>
            <span className="ml-2 font-bold text-lg text-slate-800 dark:text-slate-200">Lume's</span>
          </div>
          <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Page content — 16px side padding */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0 px-4 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile bottom navigation — 72px Premium */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom">
          <div className="bottom-nav-native">
            {bottomNav.map((item) => {
              if (item.href === "#account") {
                return (
                  <button key={item.label} onClick={handleAccountClick} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1 nav-item">
                    <item.icon size={22} />
                    <span className="text-[clamp(9px,2.2vw,12px)] font-medium">{item.label}</span>
                  </button>
                );
              }
              const active = isBottomActive(item);
              return (
                <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1 nav-item ${active ? "active" : ""}`}>
                  {active && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[3px] rounded-full bg-[#2563EB]" />}
                  <item.icon size={22} />
                  <span className="text-[clamp(9px,2.2vw,12px)] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* FAB — bottom:88px right:20px */}
        <div ref={fabRef} className="fixed bottom-[88px] right-5 z-50 lg:hidden">
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-2"
              >
                <div className="bg-card border border-border rounded-2xl shadow-xl p-2 min-w-[180px]">
                  {fabActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleFabAction(action.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors text-sm font-medium touch-target"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <action.icon size={16} />
                      </div>
                      {action.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            animate={{ rotate: fabOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setFabOpen(!fabOpen)}
            className="fab-btn touch-target"
          >
            <Plus size={32} />
          </motion.button>
        </div>

        {/* Mobile overlay when sidebar opens */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} />
        )}

        {/* Mobile sidebar (hamburger drawer) — premium gradient */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-white via-white to-[#F0F5FF] text-foreground shadow-2xl shadow-[#1565FF]/10 flex flex-col transition-transform duration-300 lg:hidden dark:from-[#0A1A33] dark:via-[#0A1A33] dark:to-[#071426] dark:shadow-black/30 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="bg-gradient-to-br from-[#1565FF] via-[#1A6BFF] to-[#0A4CD0] p-5 pb-8 rounded-b-[28px] shadow-lg shadow-[#1565FF]/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-base shadow-inner">
                  L
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight leading-tight text-white">Lume's</span>
                  <span className="text-[10px] text-white/70 font-medium">Everywhere</span>
                </div>
              </div>
              <button className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 transition-all flex items-center justify-center text-white outline-none" onClick={closeSidebar}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-4">
              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Cabang</label>
                <Select
                  value={branchId != null ? String(branchId) : undefined}
                  onValueChange={(v) => setBranchId(Number(v))}
                >
                  <SelectTrigger className="mt-1 bg-white/10 border-0 text-white rounded-xl h-9 outline-none ring-0 focus:ring-0 [&>svg]:text-white/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <Store size={13} className="shrink-0 text-white/60" />
                      <SelectValue placeholder="Pilih cabang" className="text-white/80" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5 sidebar-scrollbar">
            {sidebarNav.map((item) => {
              if (item.href === "#account") {
                return (
                  <button key={item.label} onClick={() => { handleAccountClick(); closeSidebar(); }} className="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all outline-none text-foreground/70 hover:bg-[#1565FF]/8 hover:text-[#1565FF] active:scale-[0.98]">
                    <item.icon size={19} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              }
              return (
                <NavItem key={item.label} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={closeSidebar} />
              );
            })}

            <div className="mt-4 pt-4 border-t border-[#1565FF]/8 mx-3">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2 block">Lainnya</label>
              {secondaryNav.map((item) => (
                <NavItem key={item.label} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={closeSidebar} />
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-[#1565FF]/8 bg-card/50 dark:bg-[#0A1A33]/60">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1565FF]/10 to-[#1565FF]/5 flex items-center justify-center font-bold text-sm text-[#1565FF] shrink-0">
                {initials}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold truncate">{user?.name ?? "Loading..."}</span>
                <div className="flex items-center gap-1">
                  {roleIcon(role)}
                  <span className="text-xs text-muted-foreground">{roleLabel(role)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl outline-none text-foreground/50 hover:bg-destructive/8 hover:text-destructive transition-all text-sm font-medium active:scale-[0.98]"
            >
              <LogOut size={15} />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Account Bottom Sheet */}
        <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-safe-bottom">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{user?.name ?? "Loading..."}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {roleIcon(role)}
                    <span className="text-sm text-muted-foreground">{roleLabel(role)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Menu Lainnya</p>
                {secondaryNav.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setAccountOpen(false); setLocation(item.href); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-sm touch-target"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                      <item.icon size={16} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setAccountOpen(false); toggleTheme(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-sm mt-4 touch-target"
              >
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </div>
                {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
              </button>
              <button
                onClick={() => { setAccountOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-sm touch-target"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                  <LogOut size={16} />
                </div>
                Keluar
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
