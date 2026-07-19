import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wifi,
  WifiOff,
  BatteryMedium,
  Sparkles,
  Bell,
  ChevronDown,
  Brain,
} from "lucide-react";
import { useDesktopStore } from "@/lib/desktop/store";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { useNotificationStore } from "@/lib/desktop/notification-store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface MenuBarProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
  onLumeMenuToggle: () => void;
  onNotificationToggle: () => void;
  onExecutiveToggle: () => void;
  isLumeMenuOpen: boolean;
}

export default function MenuBar({
  user,
  onSignOut,
  onLumeMenuToggle,
  onNotificationToggle,
  onExecutiveToggle,
  isLumeMenuOpen,
}: MenuBarProps) {
  const [time, setTime] = useState(new Date());
  const { state } = useDesktopStore();
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspaceStore();
  const { state: notifState } = useNotificationStore();
  const { isOnline } = useOnlineStatus();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeWindow = state.windows.find(
    (w) => w.id === state.activeWindowId && !w.isMinimized
  );

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-[9999] h-8 flex items-center justify-between px-2 select-none"
      style={{
        background: "rgba(7, 20, 38, 0.72)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(142, 216, 255, 0.08)",
      }}
    >
      {/* Left: Lumé Menu + Active App */}
      <div className="flex items-center gap-1 min-w-0">
        {/* Lumé Logo / System Menu */}
        <button
          onClick={onLumeMenuToggle}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            isLumeMenuOpen ? "bg-white/5" : "hover:bg-white/5"
          }`}
        >
          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
            <span className="text-[10px] font-bold text-white leading-none">L</span>
          </div>
          <span className="text-[11px] font-semibold text-white/90 tracking-wide hidden sm:block">
            Lume OS
          </span>
        </button>

        {activeWindow && (
          <>
            <div className="w-px h-3 bg-white/10 mx-1" />
            <span className="text-[11px] text-white/50 font-medium truncate max-w-[200px]">
              {activeWindow.title}
            </span>
          </>
        )}
      </div>

      {/* Center: Workspace Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-[11px] text-white/50 font-medium">
              {activeWorkspace?.name || "Workspace"}
            </span>
            <ChevronDown className="w-3 h-3 text-white/30" />
          </button>

          {showWorkspaceMenu && (
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowWorkspaceMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[180px] py-1 rounded-xl overflow-hidden z-[9999]"
                style={{
                  background: "rgba(10, 18, 35, 0.97)",
                  backdropFilter: "blur(40px)",
                  border: "1px solid rgba(142, 216, 255, 0.1)",
                  boxShadow: "0 15px 40px -10px rgba(0, 0, 0, 0.5)",
                }}
              >
                {workspaces.map((ws: { id: string; name: string }) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      ws.id === activeWorkspace?.id
                        ? "bg-primary/10 text-primary"
                        : "text-white/50 hover:bg-white/5 hover:text-white/70"
                    }`}
                  >
                    <span className="text-[11px] font-medium">{ws.name}</span>
                    {ws.id === activeWorkspace?.id && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Right: Status icons */}
      <div className="flex items-center gap-1.5">
        {/* AI Status */}
        <button
          onClick={onExecutiveToggle}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-white/40 hover:text-white/60"
          title="Executive Center"
        >
          <Brain className="w-3 h-3" />
          <span className="text-[10px] font-medium hidden md:block">AI</span>
        </button>

        <div className="w-px h-3 bg-white/10" />

        {/* Notifications */}
        <button
          onClick={onNotificationToggle}
          className="relative flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-white/40 hover:text-white/60"
          title="Notifications"
        >
          <Bell className="w-3 h-3" />
          {notifState.unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[7px] font-bold text-white">
                {notifState.unreadCount > 9 ? "9+" : notifState.unreadCount}
              </span>
            </div>
          )}
        </button>

        <div className="w-px h-3 bg-white/10" />

        {/* Connection */}
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-emerald-400/80" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400/80" />
          )}
        </div>

        <BatteryMedium className="w-3.5 h-3.5 text-white/40" />

        <div className="w-px h-3 bg-white/10" />

        <span className="text-[11px] text-white/50 font-medium tabular-nums">
          {formattedTime}
        </span>
        <span className="text-[10px] text-white/30 font-medium hidden md:block">
          {formattedDate}
        </span>

        <div className="w-px h-3 bg-white/10" />

        {/* User avatar */}
        <button
          onClick={onSignOut}
          className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/70 hover:bg-white/20 transition-colors cursor-pointer"
          title={user?.name || user?.email || "User"}
        >
          {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
        </button>
      </div>
    </motion.div>
  );
}
