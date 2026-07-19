import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import TopNavbar from "./dashboard/TopNavbar";
import MobileHeader from "./dashboard/MobileHeader";
import MobileBottomNav from "./dashboard/MobileBottomNav";
import HeroSection from "./dashboard/HeroSection";
import MetricCard from "./dashboard/MetricCard";
import ApplicationsGrid from "./dashboard/ApplicationsGrid";
import CashflowWidget from "./dashboard/CashflowWidget";
import ScheduleWidget from "./dashboard/ScheduleWidget";
import AIInsights from "./dashboard/AIInsights";
import MissionsWidget from "./dashboard/MissionsWidget";
import ActivityFeed from "./dashboard/ActivityFeed";
import CommandPalette from "./CommandPalette";
import NotificationCenter from "./NotificationCenter";
import { useDesktopStore } from "@/lib/desktop/store";
import { registerCommands } from "@/lib/desktop/command-registry";
import { appRegistry } from "@/lib/desktop/registry";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { useNotificationStore } from "@/lib/desktop/notification-store";
import { useResponsiveStore } from "@/lib/desktop/responsive-engine";
import { emit } from "@/lib/desktop/event-bus";
import { generateCSSVariables } from "@/lib/desktop/tokens";
import {
  ShoppingBag, TrendingUp, Wallet, Target,
} from "lucide-react";

interface CloudDesktopShellProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
}

export default function CloudDesktopShell({ user, onSignOut }: CloudDesktopShellProps) {
  const { isMobile } = useResponsiveStore();
  const { closeAllWindows, openApp } = useDesktopStore();
  const { workspaces, switchWorkspace, createWorkspace } = useWorkspaceStore();
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [, setLocation] = useLocation();

  const handleAppClick = useCallback((appId: string) => {
    if (appId === "pos") {
      setLocation("/pos");
    } else {
      // For other apps, try to open via registry (window mode) or show toast
      const app = appRegistry.find((a) => a.id === appId);
      if (app) openApp(app);
    }
  }, [setLocation, openApp]);

  useEffect(() => {
    const vars = generateCSSVariables();
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    document.documentElement.classList.add("lume-dashboard-active");
    return () => document.documentElement.classList.remove("lume-dashboard-active");
  }, []);

  useEffect(() => {
    emit.shellReady();
  }, []);

  useEffect(() => {
    const commands = [
      ...appRegistry.map((app) => ({
        id: `app-${app.id}`,
        label: app.title,
        description: `Open ${app.title}`,
        icon: app.icon,
        category: "applications" as const,
        keywords: [app.title.toLowerCase(), app.id, app.category || ""],
        action: () => openApp(app),
      })),
      ...workspaces.map((ws: { id: string; name: string }) => ({
        id: `ws-${ws.id}`,
        label: ws.name,
        description: "Switch workspace",
        icon: "Layers",
        category: "workspaces" as const,
        keywords: [ws.name.toLowerCase(), "workspace"],
        action: () => switchWorkspace(ws.id),
      })),
      {
        id: "action-close-all",
        label: "Close All Windows",
        icon: "Trash2",
        category: "actions" as const,
        keywords: ["close", "all", "windows"],
        action: closeAllWindows,
      },
      {
        id: "action-settings",
        label: "Open Settings",
        icon: "Settings",
        category: "settings" as const,
        keywords: ["settings", "preferences"],
        action: () => {
          const s = appRegistry.find((a) => a.id === "settings");
          if (s) openApp(s);
        },
      },
    ];
    registerCommands(commands);
  }, [workspaces, openApp, closeAllWindows, switchWorkspace, createWorkspace]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
        <MobileHeader
          user={user}
          onMenuToggle={() => {}}
          onNotificationToggle={() => setNotifOpen((v) => !v)}
        />
        <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
          {activeTab === "home" && <MobileDashboardContent userName={user?.name} />}
          {activeTab === "apps" && <ApplicationsGrid onAppClick={handleAppClick} />}
          {activeTab === "missions" && <MissionsWidget />}
          {activeTab === "ai" && <AIInsights />}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {user?.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
              </div>
              <p className="text-base font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || "Founder"}</p>
              <button
                onClick={onSignOut}
                className="mt-4 px-6 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
        <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <TopNavbar
        user={user}
        onSignOut={onSignOut}
        onNotificationToggle={() => setNotifOpen((v) => !v)}
        onCommandPalette={() => setCmdPaletteOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col gap-6">
          {/* Hero */}
          <HeroSection userName={user?.name} />

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              label="Cash Today"
              value="Rp 4.8jt"
              delta={12.5}
              icon={<ShoppingBag className="w-4 h-4 text-indigo-600" />}
              iconBg="#EEF2FF"
              sparkline={[30, 45, 35, 55, 48, 62, 70, 65, 78, 82, 75, 90]}
            />
            <MetricCard
              label="Cashflow (This Week)"
              value="Rp 18.2jt"
              delta={8.3}
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              iconBg="#ECFDF5"
              sparkline={[20, 35, 28, 42, 38, 55, 48, 60, 52, 65, 58, 72]}
            />
            <MetricCard
              label="Profit (This Month)"
              value="Rp 42.5jt"
              delta={-2.1}
              icon={<Wallet className="w-4 h-4 text-amber-600" />}
              iconBg="#FFFBEB"
              sparkline={[50, 45, 48, 42, 44, 38, 40, 35, 37, 32, 34, 30]}
            />
            <MetricCard
              label="Missions Running"
              value="11"
              delta={5}
              icon={<Target className="w-4 h-4 text-purple-600" />}
              iconBg="#F5F3FF"
              sparkline={[5, 7, 6, 8, 9, 7, 10, 8, 11, 9, 10, 11]}
            />
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-12 gap-5">
            {/* Left column */}
            <div className="col-span-4 flex flex-col gap-5">
              <ApplicationsGrid onAppClick={handleAppClick} />
              <CashflowWidget />
              <ScheduleWidget />
            </div>

            {/* Center column */}
            <div className="col-span-4 flex flex-col gap-5">
              <CashflowWidget />
              <ScheduleWidget />
            </div>

            {/* Right column */}
            <div className="col-span-4 flex flex-col gap-5">
              <AIInsights />
              <MissionsWidget />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Screen reader */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  );
}

function MobileDashboardContent({ userName }: { userName?: string }) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting}, {userName || "User"} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Business is running great today.</p>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-600">Runtime Status</span>
          <span className="text-xs font-semibold text-emerald-600">Healthy</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
          6 Executives Online
          <span className="text-gray-300">›</span>
        </div>
      </div>

      {/* 2x2 Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Cash Today"
          value="Rp 4.8jt"
          delta={12.5}
          icon={<ShoppingBag className="w-4 h-4 text-indigo-600" />}
          iconBg="#EEF2FF"
          sparkline={[30, 45, 35, 55, 48, 62, 70, 65]}
        />
        <MetricCard
          label="Cashflow"
          value="Rp 18.2jt"
          delta={8.3}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          iconBg="#ECFDF5"
          sparkline={[20, 35, 28, 42, 38, 55, 48, 60]}
        />
        <MetricCard
          label="Profit"
          value="Rp 42.5jt"
          delta={-2.1}
          icon={<Wallet className="w-4 h-4 text-amber-600" />}
          iconBg="#FFFBEB"
          sparkline={[50, 45, 48, 42, 44, 38, 40, 35]}
        />
        <MetricCard
          label="Missions"
          value="11"
          delta={5}
          icon={<Target className="w-4 h-4 text-purple-600" />}
          iconBg="#F5F3FF"
          sparkline={[5, 7, 6, 8, 9, 7, 10, 8]}
        />
      </div>

      <AIInsights />
      <ActivityFeed />
    </div>
  );
}
