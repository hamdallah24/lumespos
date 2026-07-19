import type { ComponentType } from "react";

/* ─── App Registry ─── */
export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  color: string;
  component: ComponentType;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  allowMultiple?: boolean;
  category?: "core" | "business" | "system";
}

/* ─── Window State ─── */
export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isPinned: boolean;
  isAlwaysOnTop: boolean;
  zIndex: number;
  icon: string;
  color: string;
}

/* ─── Desktop State ─── */
export interface DesktopState {
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  nextWindowId: number;
}

export type DesktopAction =
  | { type: "OPEN_WINDOW"; app: AppDefinition }
  | { type: "CLOSE_WINDOW"; windowId: string }
  | { type: "MINIMIZE_WINDOW"; windowId: string }
  | { type: "MAXIMIZE_WINDOW"; windowId: string }
  | { type: "RESTORE_WINDOW"; windowId: string }
  | { type: "FOCUS_WINDOW"; windowId: string }
  | { type: "MOVE_WINDOW"; windowId: string; x: number; y: number }
  | { type: "RESIZE_WINDOW"; windowId: string; width: number; height: number }
  | { type: "CLOSE_ALL_WINDOWS" }
  | { type: "PIN_WINDOW"; windowId: string }
  | { type: "UNPIN_WINDOW"; windowId: string }
  | { type: "SET_ALWAYS_ON_TOP"; windowId: string; alwaysOnTop: boolean };

/* ─── Workspace ─── */
export interface Workspace {
  id: string;
  name: string;
  icon: string;
  windowIds: string[];
  dockApps: string[];
  createdAt: number;
  lastUsed: number;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

export type WorkspaceAction =
  | { type: "CREATE_WORKSPACE"; name: string; icon?: string }
  | { type: "DELETE_WORKSPACE"; workspaceId: string }
  | { type: "RENAME_WORKSPACE"; workspaceId: string; name: string }
  | { type: "SWITCH_WORKSPACE"; workspaceId: string }
  | { type: "DUPLICATE_WORKSPACE"; workspaceId: string; newName: string }
  | { type: "ADD_WINDOW_TO_WORKSPACE"; workspaceId: string; windowId: string }
  | { type: "REMOVE_WINDOW_FROM_WORKSPACE"; workspaceId: string; windowId: string }
  | { type: "SET_DOCK_APPS"; workspaceId: string; appIds: string[] }
  | { type: "RESTORE_WORKSPACES"; state: WorkspaceState };

/* ─── Notifications ─── */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "mission" | "ai";
  read: boolean;
  pinned: boolean;
  archived: boolean;
  timestamp: number;
  source?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export type NotificationAction =
  | { type: "ADD_NOTIFICATION"; notification: Omit<Notification, "id" | "read" | "pinned" | "archived" | "timestamp"> & { id?: string; timestamp?: number } }
  | { type: "MARK_READ"; notificationId: string }
  | { type: "MARK_ALL_READ" }
  | { type: "PIN_NOTIFICATION"; notificationId: string }
  | { type: "UNPIN_NOTIFICATION"; notificationId: string }
  | { type: "ARCHIVE_NOTIFICATION"; notificationId: string }
  | { type: "DELETE_NOTIFICATION"; notificationId: string }
  | { type: "CLEAR_ALL" };

/* ─── Command Palette ─── */
export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: "applications" | "workspaces" | "actions" | "search" | "ai" | "settings" | "navigation";
  keywords: string[];
  shortcut?: string;
  action: () => void;
  group?: string;
}

/* ─── AI Executives ─── */
export interface AIExecutive {
  id: string;
  role: string;
  title: string;
  status: "idle" | "thinking" | "executing" | "waiting" | "sleeping";
  health: number;
  confidence: number;
  currentMission: string | null;
  lastAction: string | null;
  currentTool: string | null;
  runningTime: number | null;
  estimatedCompletion: number | null;
  color: string;
  icon: string;
}

export type ExecutiveAction =
  | { type: "UPDATE_EXECUTIVE"; id: string; updates: Partial<AIExecutive> }
  | { type: "SET_ALL_EXECUTIVES"; executives: AIExecutive[] };
