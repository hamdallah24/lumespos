import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Settings,
  LogOut,
  Info,
  Layers,
  Crown,
  Sparkles,
  Moon,
  Palette,
  Keyboard,
  Power,
  AppWindow,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { useDesktopStore } from "@/lib/desktop/store";
import { appRegistry } from "@/lib/desktop/registry";
import type { AppDefinition } from "@/lib/desktop/types";

interface LumeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export default function LumeMenu({ isOpen, onClose, onSignOut, onOpenSettings }: LumeMenuProps) {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspaceStore();
  const { openApp } = useDesktopStore();

  const handleAppOpen = (app: AppDefinition) => {
    openApp(app);
    onClose();
  };

  const handleWorkspaceSwitch = (id: string) => {
    switchWorkspace(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="fixed top-8 left-2 z-[10001] w-[260px] rounded-2xl overflow-hidden py-1"
          style={{
            background: "rgba(10, 18, 35, 0.97)",
            backdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(142, 216, 255, 0.1)",
            boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* System info */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-base font-bold text-white">L</span>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white/80">Lumé OS</p>
                <p className="text-[10px] text-white/30">Cloud Operating System</p>
              </div>
            </div>
          </div>

          {/* Workspaces */}
          <div className="px-2 py-1.5">
            <p className="px-2 py-1 text-[9px] font-semibold text-white/20 uppercase tracking-wider">
              Workspaces
            </p>
            {workspaces.map((ws: { id: string; name: string }) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceSwitch(ws.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  ws.id === activeWorkspace?.id
                    ? "bg-primary/10 text-primary"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">{ws.name}</span>
                {ws.id === activeWorkspace?.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="my-1 mx-2 h-px bg-white/5" />

          {/* Applications */}
          <div className="px-2 py-1.5">
            <p className="px-2 py-1 text-[9px] font-semibold text-white/20 uppercase tracking-wider">
              Applications
            </p>
            {appRegistry.slice(0, 5).map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppOpen(app)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors cursor-pointer"
              >
                <AppWindow className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">{app.title}</span>
              </button>
            ))}
          </div>

          <div className="my-1 mx-2 h-px bg-white/5" />

          {/* System */}
          <div className="px-2 py-1.5">
            <button
              onClick={() => { onOpenSettings(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Settings</span>
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">About Lumé OS</span>
            </button>
          </div>

          <div className="my-1 mx-2 h-px bg-white/5" />

          {/* Sign out */}
          <div className="px-2 py-1.5">
            <button
              onClick={() => { onSignOut(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Sign Out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
