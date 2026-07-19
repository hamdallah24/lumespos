import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
  X,
  Pin,
  AppWindow,
} from "lucide-react";
import { useDesktopStore } from "@/lib/desktop/store";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { getDockApps, getAppById } from "@/lib/desktop/registry";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag, TrendingUp, Package, Users, UserCog, Sparkles, Store, Settings,
};

export default function Dock() {
  const { state, openApp, focusWindow, minimizeWindow, restoreWindow, closeWindow } =
    useDesktopStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ appId: string; x: number; y: number } | null>(null);

  const dockApps = getDockApps();

  const handleAppClick = useCallback(
    (appId: string) => {
      const appDef = dockApps.find((a) => a.id === appId);
      if (!appDef) return;

      const existingWindow = state.windows.find((w) => w.appId === appId);
      if (existingWindow) {
        if (existingWindow.isMinimized) {
          restoreWindow(existingWindow.id);
        } else if (state.activeWindowId === existingWindow.id) {
          minimizeWindow(existingWindow.id);
        } else {
          focusWindow(existingWindow.id);
        }
      } else {
        openApp(appDef);
      }
    },
    [dockApps, state, openApp, focusWindow, minimizeWindow, restoreWindow]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, appId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(e.clientX, window.innerWidth - 180);
      const y = Math.min(e.clientY - 80, window.innerHeight - 200);
      setContextMenu({ appId, x, y });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9998]"
      >
        <div
          className="flex items-end gap-1 px-3 py-1.5 rounded-2xl"
          style={{
            background: "rgba(7, 20, 38, 0.65)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(142, 216, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          {dockApps.map((app) => {
            const IconComp = iconMap[app.icon] || Package;
            const isOpen = state.windows.some((w) => w.appId === app.id);
            const isActive =
              state.activeWindowId &&
              state.windows.find((w) => w.id === state.activeWindowId)?.appId === app.id;
            const openCount = state.windows.filter((w) => w.appId === app.id).length;

            return (
              <div
                key={app.id}
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHoveredId(app.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <AnimatePresence>
                  {hoveredId === app.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      transition={{ duration: 0.12 }}
                      className="absolute -top-8 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-medium text-white pointer-events-none"
                      style={{
                        background: "rgba(7, 20, 38, 0.85)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(142, 216, 255, 0.15)",
                      }}
                    >
                      {app.title}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={() => handleAppClick(app.id)}
                  onContextMenu={(e) => handleContextMenu(e, app.id)}
                  animate={{
                    scale: hoveredId === app.id ? 1.25 : 1,
                    y: hoveredId === app.id ? -4 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    background: `${app.color}20`,
                    border: `1px solid ${app.color}30`,
                  }}
                  title={app.title}
                >
                  <span style={{ color: app.color }}>
                    <IconComp className="w-5 h-5" />
                  </span>

                  {/* Badge for multiple windows */}
                  {openCount > 1 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{openCount}</span>
                    </div>
                  )}
                </motion.button>

                {/* Running indicator */}
                {isOpen && (
                  <div
                    className="w-1 h-1 rounded-full mt-1"
                    style={{
                      background: isActive ? app.color : "rgba(255,255,255,0.3)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-[9999]"
              onClick={closeContextMenu}
              onContextMenu={closeContextMenu}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed z-[10000] min-w-[180px] py-1 rounded-xl overflow-hidden"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                background: "rgba(15, 25, 45, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(142, 216, 255, 0.12)",
                boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <button
                onClick={() => {
                  const app = dockApps.find((a) => a.id === contextMenu.appId);
                  if (app) openApp(app);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors text-left"
              >
                <AppWindow className="w-3.5 h-3.5" />
                New Window
              </button>
              <div className="my-1 mx-2 h-px bg-white/5" />
              {state.windows
                .filter((w) => w.appId === contextMenu.appId)
                .map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      focusWindow(w.id);
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: w.color }} />
                    <span className="truncate flex-1">{w.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeWindow(w.id);
                        closeContextMenu();
                      }}
                      className="w-4 h-4 rounded flex items-center justify-center text-white/20 hover:text-red-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
