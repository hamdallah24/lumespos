import React from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { LayoutGrid, ShoppingBag, Receipt, PieChart, Store, Users, LogOut, Crown, Shield } from "lucide-react";
import type { AppUser } from "@workspace/api-client-react/src/generated/api.schemas";

interface LayoutProps {
  children: React.ReactNode;
  role?: string;
  user?: AppUser;
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

export function Layout({ children, role, user }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  const canManage = role === "owner" || role === "manager";

  const navItems = [
    { href: "/", label: "Kasir", icon: ShoppingBag, show: true },
    { href: "/orders", label: "Riwayat", icon: Receipt, show: true },
    { href: "/products", label: "Produk", icon: LayoutGrid, show: canManage },
    { href: "/dashboard", label: "Laporan", icon: PieChart, show: canManage },
    { href: "/users", label: "Pengguna", icon: Users, show: role === "owner" },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Store size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">Sayq POS</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-sm text-sidebar-accent-foreground shrink-0">
              {initials}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{user?.name ?? "Loading..."}</span>
              <div className="flex items-center gap-1">
                {roleIcon(role)}
                <span className="text-xs text-sidebar-foreground/50">{roleLabel(role)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive transition-colors text-sm"
          >
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
