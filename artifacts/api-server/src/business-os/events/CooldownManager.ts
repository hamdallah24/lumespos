import { EventPriority } from "./EventPriority";

interface CooldownConfig {
  durationMs: number;
}

const DEFAULT_COOLDOWN_MS: Record<EventPriority, number> = {
  [EventPriority.INFO]: 0,
  [EventPriority.WARNING]: 60000,
  [EventPriority.HIGH]: 300000,
  [EventPriority.CRITICAL]: 0,
};

const CUSTOM_COOLDOWNS: Map<string, CooldownConfig> = new Map();
const activeCooldowns = new Map<string, number>();

function cooldownKey(type: string, branchId: number): string {
  return `${type}:${branchId}`;
}

function getCooldownMs(type: string): number {
  const custom = CUSTOM_COOLDOWNS.get(type);
  if (custom) return custom.durationMs;
  return DEFAULT_COOLDOWN_MS[EventPriority.HIGH];
}

export function setCooldown(type: string, durationMs: number): void {
  CUSTOM_COOLDOWNS.set(type, { durationMs });
}

export function isOnCooldown(type: string, branchId: number): boolean {
  const key = cooldownKey(type, branchId);
  const expiresAt = activeCooldowns.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    activeCooldowns.delete(key);
    return false;
  }
  return true;
}

export function startCooldown(type: string, branchId: number, priority: EventPriority): void {
  const key = cooldownKey(type, branchId);
  const ms = priority === EventPriority.CRITICAL ? 0 : getCooldownMs(type);
  if (ms <= 0) return;
  activeCooldowns.set(key, Date.now() + ms);
}

export function clearCooldown(type: string, branchId: number): void {
  const key = cooldownKey(type, branchId);
  activeCooldowns.delete(key);
}

export function clearAllCooldowns(): void {
  activeCooldowns.clear();
}

export function getActiveCooldowns(): { type: string; branchId: number; remainingMs: number }[] {
  const now = Date.now();
  const result: { type: string; branchId: number; remainingMs: number }[] = [];
  for (const [key, expiresAt] of activeCooldowns) {
    if (now < expiresAt) {
      const [type, branchIdStr] = key.split(":");
      result.push({ type, branchId: Number(branchIdStr), remainingMs: expiresAt - now });
    }
  }
  return result;
}

// Set specific cooldowns
setCooldown("stock.low", 300000);
setCooldown("stock.out", 600000);
setCooldown("cash.low", 300000);
setCooldown("cash.negative", 600000);
setCooldown("shift.discrepancy", 300000);
setCooldown("supplier.overdue", 3600000);
setCooldown("branch.offline", 300000);
setCooldown("journal.failed", 120000);
