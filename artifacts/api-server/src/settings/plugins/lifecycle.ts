// ConfigCenter — Milestone 6 Phase 1: Plugin Lifecycle.
// A guarded, monotonic state machine. Legal edges are explicit so an illegal
// move throws instead of corrupting state:
//   registered → initialized → active ⇄ inactive → active
//   error is reachable from any runtime state; error → initialized re-attempts.

import type { PluginStatus } from "./types";

const LEGAL_EDGES: Record<PluginStatus, PluginStatus[]> = {
  registered: ["initialized", "error"],
  initialized: ["active", "inactive", "error"],
  active: ["inactive", "error"],
  inactive: ["active", "error", "initialized"],
  error: ["initialized", "active"],
};

export type LifecycleTransition = PluginStatus;

export function canTransition(from: PluginStatus, to: PluginStatus): boolean {
  if (from === to) return true; // idempotent / terminal re-entry
  return (LEGAL_EDGES[from] ?? []).includes(to);
}

export function assertTransition(from: PluginStatus, to: PluginStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal plugin lifecycle transition ${from} → ${to}`);
  }
}