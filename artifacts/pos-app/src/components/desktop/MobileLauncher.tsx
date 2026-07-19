import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
  Home,
  Bell,
  User,
} from "lucide-react";
import { useDesktopStore } from "@/lib/desktop/store";
import { appRegistry } from "@/lib/desktop/registry";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
};

interface MobileLauncherProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
}

export default function MobileLauncher({ user, onSignOut }: MobileLauncherProps) {
  const { openApp, state } = useDesktopStore();
  const [activeTab, setActiveTab] = useState<"home" | "ai" | "apps" | "notif" | "profile">("home");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    return "Selamat malam";
  })();

  return (
    <div className="fixed inset-0 flex flex-col bg-[#071426] overflow-hidden">
      {/* Top section */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="text-sm font-semibold text-white/90">Lume OS</span>
          </div>
          <button
            onClick={onSignOut}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70"
          >
            {(user?.name || "U").charAt(0).toUpperCase()}
          </button>
        </div>
        <p className="text-[13px] text-white/40 mt-2">
          {greeting}, {user?.name || "User"}
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
              Applications
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {appRegistry.map((app, i) => {
                const IconComp = iconMap[app.icon] || Package;
                const isOpen = state.windows.some((w) => w.appId === app.id);
                return (
                  <motion.button
                    key={app.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => openApp(app)}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-colors cursor-pointer"
                    style={{
                      background: `${app.color}08`,
                      border: `1px solid ${app.color}15`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: `${app.color}15` }}
                    >
                      <span style={{ color: app.color }}>
                        <IconComp className="w-6 h-6" />
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-white/60">
                      {app.title}
                    </span>
                    {isOpen && (
                      <div
                        className="w-1 h-1 rounded-full -mt-1"
                        style={{ background: app.color }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "ai" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-sky-400" />
            </div>
            <p className="text-sm text-white/40 text-center">
              AI Assistant coming soon
            </p>
          </motion.div>
        )}

        {activeTab === "apps" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
              All Apps
            </h3>
            {appRegistry.map((app, i) => {
              const IconComp = iconMap[app.icon] || Package;
              return (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openApp(app)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${app.color}15` }}
                  >
                    <span style={{ color: app.color }}>
                      <IconComp className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white/70">
                      {app.title}
                    </p>
                    <p className="text-[10px] text-white/30 capitalize">
                      {app.category}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {activeTab === "notif" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-3"
          >
            <Bell className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/30">No notifications</p>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white/40">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80">
                  {user?.name || "User"}
                </p>
                <p className="text-[11px] text-white/40">
                  {user?.email || "user@lumeos.com"}
                </p>
                <p className="text-[10px] text-white/25 capitalize mt-0.5">
                  {user?.role || "user"}
                </p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400 text-center"
            >
              Sign Out
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom navigation */}
      <div
        className="flex items-center justify-around px-4 pb-6 pt-2 border-t border-white/5"
        style={{
          background: "rgba(7, 20, 38, 0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        {([
          { id: "home" as const, icon: Home, label: "Home" },
          { id: "ai" as const, icon: Sparkles, label: "AI" },
          { id: "apps" as const, icon: Store, label: "Apps" },
          { id: "notif" as const, icon: Bell, label: "Alerts" },
          { id: "profile" as const, icon: User, label: "Profile" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors cursor-pointer ${
              activeTab === tab.id ? "text-primary" : "text-white/30"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
