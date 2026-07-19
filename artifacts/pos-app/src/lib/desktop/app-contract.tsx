import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import type {
  AIExecutive,
  CommandItem,
  Notification,
} from "./types";
import type { ThemeId, ThemeColors } from "./theme-engine";
import { useDesktopStore } from "./store";
import { useWorkspaceStore } from "./workspace-store";
import { useNotificationStore } from "./notification-store";
import { useExecutiveStore } from "./executive-store";
import { useThemeStore } from "./theme-engine";
import { registerCommand, unregisterCommand } from "./command-registry";
import { appRegistry, getAppById } from "./registry";
import { desktopEventBus, emit } from "./event-bus";

/* ─── Context Values ─── */

interface ShellContextValue {
  openApp: (appId: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  notify: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  registerCommand: (command: CommandItem) => void;
  unregisterCommand: (id: string) => void;
  currentTheme: ThemeId;
  shellVersion: string;
  platform: "web" | "desktop" | "mobile";
}

interface WorkspaceContextValue {
  workspaceId: string;
  workspaceName: string;
  switchWorkspace: (id: string) => void;
}

interface WindowContextValue {
  windowId: string;
  appId: string;
  title: string;
  isFocused: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
  setTitle: (title: string) => void;
}

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ThemeColors;
  setTheme: (id: ThemeId) => void;
}

interface SessionContextValue {
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  isAuthenticated: boolean;
}

interface AIContextValue {
  executives: AIExecutive[];
  activeExecutiveCount: number;
  openExecutiveCenter: () => void;
}

/* ─── Default Values ─── */

const SHELL_DEFAULT: ShellContextValue = {
  openApp: () => {},
  closeWindow: () => {},
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  focusWindow: () => {},
  notify: () => {},
  registerCommand: () => {},
  unregisterCommand: () => {},
  currentTheme: "dark",
  shellVersion: "0.0.0",
  platform: "web",
};

const WORKSPACE_DEFAULT: WorkspaceContextValue = {
  workspaceId: "default",
  workspaceName: "Operations",
  switchWorkspace: () => {},
};

const WINDOW_DEFAULT: WindowContextValue = {
  windowId: "",
  appId: "",
  title: "",
  isFocused: true,
  isMaximized: false,
  isMinimized: false,
  setTitle: () => {},
};

const THEME_DEFAULT: ThemeContextValue = {
  themeId: "dark",
  colors: {
    navy: {},
    primary: {},
    accent: {},
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    surface: {
      base: "#0B1120",
      raised: "#111827",
      overlay: "#1F2937",
      glass: "rgba(17, 24, 39, 0.72)",
      glassHeavy: "rgba(17, 24, 39, 0.85)",
      glassLight: "rgba(17, 24, 39, 0.4)",
    },
    text: {
      primary: "rgba(255, 255, 255, 0.92)",
      secondary: "rgba(255, 255, 255, 0.60)",
      tertiary: "rgba(255, 255, 255, 0.40)",
      muted: "rgba(255, 255, 255, 0.25)",
      ghost: "rgba(255, 255, 255, 0.12)",
    },
    border: {
      subtle: "rgba(255, 255, 255, 0.06)",
      default: "rgba(255, 255, 255, 0.08)",
      strong: "rgba(255, 255, 255, 0.12)",
      accent: "rgba(37, 99, 235, 0.3)",
    },
  },
  setTheme: () => {},
};

const SESSION_DEFAULT: SessionContextValue = {
  userId: null,
  userName: null,
  userRole: null,
  isAuthenticated: false,
};

const AI_DEFAULT: AIContextValue = {
  executives: [],
  activeExecutiveCount: 0,
  openExecutiveCenter: () => {},
};

/* ─── Create Contexts ─── */

const ShellContext = createContext<ShellContextValue>(SHELL_DEFAULT);
const WorkspaceContext = createContext<WorkspaceContextValue>(WORKSPACE_DEFAULT);
const WindowContext = createContext<WindowContextValue>(WINDOW_DEFAULT);
const ThemeContext = createContext<ThemeContextValue>(THEME_DEFAULT);
const SessionContext = createContext<SessionContextValue>(SESSION_DEFAULT);
const AIContext = createContext<AIContextValue>(AI_DEFAULT);

/* ─── Hooks ─── */

export function useShellContext(): ShellContextValue {
  return useContext(ShellContext);
}

export function useWorkspaceContext(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}

export function useWindowContext(): WindowContextValue {
  return useContext(WindowContext);
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useSessionContext(): SessionContextValue {
  return useContext(SessionContext);
}

export function useAIContext(): AIContextValue {
  return useContext(AIContext);
}

/* ─── Provider Props ─── */

interface ShellProviderProps {
  children: React.ReactNode;
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  onSignOut: () => void;
}

/* ─── ShellProvider ─── */

export function ShellProvider({
  children,
  user,
  onSignOut: _onSignOut,
}: ShellProviderProps) {
  const desktop = useDesktopStore();
  const workspace = useWorkspaceStore();
  const notifications = useNotificationStore();
  const { executives } = useExecutiveStore();
  const theme = useThemeStore();

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      emit.shellReady();
    }
  }, []);

  const openApp = useCallback(
    (appId: string) => {
      const app = getAppById(appId);
      if (app) {
        desktop.openApp(app);
      }
    },
    [desktop]
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      const win = desktop.state.windows.find((w) => w.id === windowId);
      desktop.closeWindow(windowId);
      if (win) {
        emit.windowClosed(windowId, win.appId);
      }
    },
    [desktop]
  );

  const minimizeWindow = useCallback(
    (windowId: string) => {
      const win = desktop.state.windows.find((w) => w.id === windowId);
      desktop.minimizeWindow(windowId);
      if (win) {
        emit.windowMinimized(windowId);
      }
    },
    [desktop]
  );

  const maximizeWindow = useCallback(
    (windowId: string) => {
      const win = desktop.state.windows.find((w) => w.id === windowId);
      desktop.maximizeWindow(windowId);
      if (win) {
        emit.windowMaximized(windowId);
      }
    },
    [desktop]
  );

  const focusWindow = useCallback(
    (windowId: string) => {
      desktop.focusWindow(windowId);
      emit.windowFocused(windowId);
    },
    [desktop]
  );

  const notify = useCallback(
    (
      title: string,
      message: string,
      type: "info" | "success" | "warning" | "error" = "info"
    ) => {
      const notif: Omit<Notification, "id" | "read" | "pinned" | "archived" | "timestamp"> = {
        title,
        message,
        type,
      };
      notifications.addNotification(notif);
    },
    [notifications]
  );

  const openExecutiveCenter = useCallback(() => {
    openApp("ai-chat");
  }, [openApp]);

  const activeWorkspace = workspace.activeWorkspace;

  const shellValue: ShellContextValue = {
    openApp,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    notify,
    registerCommand,
    unregisterCommand,
    currentTheme: theme.themeId,
    shellVersion: "1.0.0",
    platform: "web",
  };

  const workspaceValue: WorkspaceContextValue = {
    workspaceId: activeWorkspace.id,
    workspaceName: activeWorkspace.name,
    switchWorkspace: workspace.switchWorkspace,
  };

  const windowValue: WindowContextValue = {
    windowId: desktop.state.activeWindowId ?? "",
    appId: (() => {
      const win = desktop.state.windows.find(
        (w) => w.id === desktop.state.activeWindowId
      );
      return win?.appId ?? "";
    })(),
    title: (() => {
      const win = desktop.state.windows.find(
        (w) => w.id === desktop.state.activeWindowId
      );
      return win?.title ?? "";
    })(),
    isFocused: true,
    isMaximized: (() => {
      const win = desktop.state.windows.find(
        (w) => w.id === desktop.state.activeWindowId
      );
      return win?.isMaximized ?? false;
    })(),
    isMinimized: (() => {
      const win = desktop.state.windows.find(
        (w) => w.id === desktop.state.activeWindowId
      );
      return win?.isMinimized ?? false;
    })(),
    setTitle: () => {},
  };

  const themeValue: ThemeContextValue = {
    themeId: theme.themeId,
    colors: theme.theme.colors,
    setTheme: theme.setTheme,
  };

  const sessionValue: SessionContextValue = {
    userId: user?.id ?? null,
    userName: user?.name ?? null,
    userRole: user?.role ?? null,
    isAuthenticated: !!user,
  };

  const aiValue: AIContextValue = {
    executives,
    activeExecutiveCount: executives.filter(
      (e) => e.status !== "sleeping"
    ).length,
    openExecutiveCenter,
  };

  return (
    <ShellContext.Provider value={shellValue}>
      <WorkspaceContext.Provider value={workspaceValue}>
        <WindowContext.Provider value={windowValue}>
          <ThemeContext.Provider value={themeValue}>
            <SessionContext.Provider value={sessionValue}>
              <AIContext.Provider value={aiValue}>
                {children}
              </AIContext.Provider>
            </SessionContext.Provider>
          </ThemeContext.Provider>
        </WindowContext.Provider>
      </WorkspaceContext.Provider>
    </ShellContext.Provider>
  );
}

/* ─── Re-export types ─── */

export type {
  ShellContextValue,
  WorkspaceContextValue,
  WindowContextValue,
  ThemeContextValue,
  SessionContextValue,
  AIContextValue,
  ShellProviderProps,
};

export {
  ShellContext,
  WorkspaceContext,
  WindowContext,
  ThemeContext,
  SessionContext,
  AIContext,
};
