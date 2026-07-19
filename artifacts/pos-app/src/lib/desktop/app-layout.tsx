/**
 * Lumé OS Standard Application Layout
 * T13X Phase 13
 *
 * All ERP apps follow: Menu → Sidebar → Toolbar → Content → Inspector → Status Bar
 * No app creates its own layout.
 */

import React, { useState, useCallback } from "react";

/* ─── Layout Types ─── */

export interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
  inspector?: React.ReactNode;
  statusBar?: React.ReactNode;
  menu?: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  showInspector?: boolean;
  sidebarWidth?: number;
  inspectorWidth?: number;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

/* ─── Standard Layout Component ─── */

export function AppLayout({
  children,
  sidebar,
  toolbar,
  inspector,
  statusBar,
  menu,
  title,
  showSidebar = true,
  showInspector = false,
  sidebarWidth = 220,
  inspectorWidth = 280,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(10, 18, 35, 0.98)" }}>
      {/* Menu Bar (optional, within window) */}
      {menu && (
        <div
          className="flex items-center h-8 px-3 border-b shrink-0"
          style={{
            background: "rgba(10, 20, 40, 0.6)",
            borderColor: "rgba(142, 216, 255, 0.06)",
          }}
        >
          {menu}
        </div>
      )}

      {/* Toolbar */}
      {toolbar && (
        <div
          className="flex items-center gap-2 h-10 px-3 border-b shrink-0"
          style={{
            background: "rgba(10, 20, 40, 0.3)",
            borderColor: "rgba(142, 216, 255, 0.06)",
          }}
        >
          {title && (
            <span className="text-xs font-semibold text-white/70 mr-2">
              {title}
            </span>
          )}
          {toolbar}
        </div>
      )}

      {/* Main Area: Sidebar + Content + Inspector */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && sidebar && (
          <div
            className="flex flex-col border-r shrink-0 overflow-auto"
            style={{
              width: sidebarWidth,
              background: "rgba(8, 14, 28, 0.5)",
              borderColor: "rgba(142, 216, 255, 0.06)",
            }}
          >
            {sidebar}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto min-w-0">
          {children}
        </div>

        {/* Inspector */}
        {showInspector && inspector && (
          <div
            className="flex flex-col border-l shrink-0 overflow-auto"
            style={{
              width: inspectorWidth,
              background: "rgba(8, 14, 28, 0.5)",
              borderColor: "rgba(142, 216, 255, 0.06)",
            }}
          >
            {inspector}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {statusBar && (
        <div
          className="flex items-center h-6 px-3 border-t shrink-0 text-[10px] text-white/30"
          style={{
            background: "rgba(8, 14, 28, 0.6)",
            borderColor: "rgba(142, 216, 255, 0.06)",
          }}
        >
          {statusBar}
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar Component ─── */

export function AppSidebar({ items }: { items: SidebarItem[] }) {
  return (
    <div className="py-2">
      {items.map((item) => {
        if (item.divider) {
          return <div key={item.id} className="my-2 mx-3 h-px bg-white/5" />;
        }
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              item.active
                ? "bg-primary/10 text-primary"
                : "text-white/50 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {item.icon}
              </span>
            )}
            <span className="text-[11px] font-medium truncate flex-1">
              {item.label}
            </span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/20 text-primary">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Toolbar Component ─── */

export function AppToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {children}
    </div>
  );
}

/* ─── Status Bar Item ─── */

export function StatusBar_item({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="flex items-center gap-1.5 mr-3">
      <span className="text-white/25">{label}:</span>
      <span style={{ color: color || "rgba(255,255,255,0.4)" }}>{value}</span>
    </span>
  );
}

/* ─── Inspector Panel ─── */

export function AppInspector({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(142, 216, 255, 0.06)" }}>
        <span className="text-[11px] font-semibold text-white/60">{title}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}

/* ─── Toolbar Button ─── */

export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-white/50 hover:bg-white/5 hover:text-white/70"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ─── Toolbar Separator ─── */

export function ToolbarSeparator() {
  return <div className="w-px h-4 bg-white/10 mx-1" />;
}
