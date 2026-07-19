import { useCallback, useEffect, useState } from "react";
import Wallpaper from "./Wallpaper";
import MenuBar from "./MenuBar";
import Dock from "./Dock";
import WindowManager from "./WindowManager";
import ContextMenu, { useContextMenu } from "./ContextMenu";
import CommandPalette from "./CommandPalette";
import ExecutiveCenter from "./ExecutiveCenter";
import NotificationCenter from "./NotificationCenter";
import LumeMenu from "./LumeMenu";
import DesktopWidgets from "./DesktopWidgets";
import { useDesktopStore } from "@/lib/desktop/store";
import { registerCommands } from "@/lib/desktop/command-registry";
import { appRegistry } from "@/lib/desktop/registry";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { useNotificationStore } from "@/lib/desktop/notification-store";
import {
  LayoutGrid,
  RefreshCw,
  Trash2,
  Sparkles,
  Settings,
} from "lucide-react";

interface DesktopProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
}

export default function Desktop({ user, onSignOut }: DesktopProps) {
  const { menu, openMenu, closeMenu } = useContextMenu();
  const { closeAllWindows, openApp } = useDesktopStore();
  const { workspaces, switchWorkspace, createWorkspace } = useWorkspaceStore();
  const { addNotification } = useNotificationStore();

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [execCenterOpen, setExecCenterOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lumeMenuOpen, setLumeMenuOpen] = useState(false);

  // Register all commands for the Command Palette
  useEffect(() => {
    const commands = [
      // Applications
      ...appRegistry.map((app) => ({
        id: `app-${app.id}`,
        label: app.title,
        description: `Open ${app.title}`,
        icon: app.icon,
        category: "applications" as const,
        keywords: [app.title.toLowerCase(), app.id, app.category || ""],
        action: () => openApp(app),
      })),
      // Workspaces
      ...workspaces.map((ws: { id: string; name: string }) => ({
        id: `ws-${ws.id}`,
        label: ws.name,
        description: "Switch workspace",
        icon: "Layers",
        category: "workspaces" as const,
        keywords: [ws.name.toLowerCase(), "workspace"],
        action: () => switchWorkspace(ws.id),
      })),
      // Actions
      {
        id: "action-close-all",
        label: "Close All Windows",
        icon: "Trash2",
        category: "actions" as const,
        keywords: ["close", "all", "windows", "clear"],
        action: closeAllWindows,
      },
      {
        id: "action-settings",
        label: "Open Settings",
        icon: "Settings",
        category: "settings" as const,
        keywords: ["settings", "preferences", "config"],
        action: () => {
          const settingsApp = appRegistry.find((a) => a.id === "settings");
          if (settingsApp) openApp(settingsApp);
        },
      },
      {
        id: "action-ai-chat",
        label: "Open AI Chat",
        icon: "Sparkles",
        category: "ai" as const,
        keywords: ["ai", "chat", "assistant", "lume"],
        shortcut: "Ctrl+Space",
        action: () => {
          const aiApp = appRegistry.find((a) => a.id === "ai-chat");
          if (aiApp) openApp(aiApp);
        },
      },
      {
        id: "action-create-workspace",
        label: "Create Workspace",
        icon: "Layers",
        category: "workspaces" as const,
        keywords: ["create", "new", "workspace"],
        action: () => createWorkspace("New Workspace"),
      },
    ];
    registerCommands(commands);
  }, [workspaces, openApp, closeAllWindows, switchWorkspace, createWorkspace]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K → Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
        setNotifOpen(false);
        setLumeMenuOpen(false);
      }
      // Ctrl+Space → AI (toggle Executive Center)
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setExecCenterOpen((v) => !v);
        setNotifOpen(false);
        setLumeMenuOpen(false);
      }
      // Escape → close all overlays
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
        setExecCenterOpen(false);
        setNotifOpen(false);
        setLumeMenuOpen(false);
        closeMenu();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      openMenu(e, [
        {
          label: "Arrange Windows",
          icon: <LayoutGrid className="w-3.5 h-3.5" />,
          onClick: () => {},
        },
        {
          label: "Refresh",
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          onClick: () => window.location.reload(),
        },
        { label: "", separator: true },
        {
          label: "Close All Windows",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          onClick: closeAllWindows,
        },
      ]);
    },
    [openMenu, closeAllWindows]
  );

  const toggleNotif = useCallback(() => {
    setNotifOpen((v) => !v);
    setExecCenterOpen(false);
    setLumeMenuOpen(false);
  }, []);

  const toggleExec = useCallback(() => {
    setExecCenterOpen((v) => !v);
    setNotifOpen(false);
    setLumeMenuOpen(false);
  }, []);

  const toggleLumeMenu = useCallback(() => {
    setLumeMenuOpen((v) => !v);
    setNotifOpen(false);
    setExecCenterOpen(false);
  }, []);

  const openSettingsApp = useCallback(() => {
    const settingsApp = appRegistry.find((a) => a.id === "settings");
    if (settingsApp) openApp(settingsApp);
  }, [openApp]);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: "#071426" }}
    >
      {/* Layer 1: Wallpaper */}
      <Wallpaper />

      {/* Layer 2: Menu Bar */}
      <MenuBar
        user={user}
        onSignOut={onSignOut}
        onLumeMenuToggle={toggleLumeMenu}
        onNotificationToggle={toggleNotif}
        onExecutiveToggle={toggleExec}
        isLumeMenuOpen={lumeMenuOpen}
      />

      {/* Layer 3: Desktop area */}
      <div
        className="absolute inset-0"
        style={{ top: 32, bottom: 68 }}
        onContextMenu={handleContextMenu}
        onClick={() => {
          setNotifOpen(false);
          setLumeMenuOpen(false);
        }}
      />

      {/* Desktop Widgets */}
      <DesktopWidgets />

      {/* Layer 4: Window Manager */}
      <WindowManager />

      {/* Layer 5: Dock */}
      <Dock />

      {/* Floating AI Button */}
      <FloatingAIButton onClick={() => {
        const aiApp = appRegistry.find((a) => a.id === "ai-chat");
        if (aiApp) openApp(aiApp);
      }} />

      {/* Overlays */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <ExecutiveCenter isOpen={execCenterOpen} onClose={() => setExecCenterOpen(false)} />
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <LumeMenu
        isOpen={lumeMenuOpen}
        onClose={() => setLumeMenuOpen(false)}
        onSignOut={onSignOut}
        onOpenSettings={openSettingsApp}
      />

      {/* Context Menu */}
      {menu && <ContextMenu menu={menu} onClose={closeMenu} />}
    </div>
  );
}

function FloatingAIButton({ onClick }: { onClick: () => void }) {
  const { state } = useDesktopStore();
  const isAIOpen = state.windows.some((w) => w.appId === "ai-chat");
  if (isAIOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-5 z-[9997] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
      style={{
        background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
        boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(142, 216, 255, 0.2)",
      }}
      title="AI Assistant (Ctrl+Space)"
    >
      <Sparkles className="w-5 h-5 text-white" />
    </button>
  );
}
