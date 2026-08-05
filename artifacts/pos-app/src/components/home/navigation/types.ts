import type { ComponentType } from "react";

/**
 * Target navigasi dari sebuah NavigationItem.
 * - `app`  : buka aplikasi di dalam HomeScreen (setActiveApp)
 * - `route`: pindah ke workspace Operating System (setLocation)
 * - `tab`  : pindah BottomTab (home/apps/mission/ai/profile)
 */
export type NavigationTarget =
  | { kind: "app"; appId: string }
  | { kind: "route"; href: string }
  | { kind: "tab"; tab: "home" | "apps" | "mission" | "profile" }
  | { kind: "action"; label: string };

export interface NavigationItemDefinition {
  id: string;
  label: string;
  description?: string;
  icon: string;
  color: string;
  keywords?: string[];
  target: NavigationTarget;
  badge?: number;
  status?: "available" | "soon";
}

export interface NavigationGroupDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  items: NavigationItemDefinition[];
  /** Grup ini ditampilkan dalam keadaan collapsed secara default */
  defaultCollapsed?: boolean;
}

export interface NavigationSectionDefinition {
  id: string;
  label: string;
  groups: NavigationGroupDefinition[];
}

/**
 * Registry icon — peta nama string ke komponen lucide.
 * Nama dipakai sebagai single source of truth di config agar
 * tidak perlu import ikon satu-per-satu di setiap komponen.
 */
export type IconMap = Record<string, ComponentType<{ className?: string; size?: number | string }>>;