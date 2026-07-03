// ECP-035: Kernel Types — Organizational Kernel data structures
// Frozen. The central nervous system of the AI Organization.

export type OrgLifecycle = "BOOT" | "READY" | "ACTIVE" | "MAINTENANCE" | "RECOVERY" | "SHUTDOWN";
export type OrgState = "HEALTHY" | "LEARNING" | "MAINTENANCE" | "EMERGENCY" | "RECOVERY";

export interface KernelComponent {
  name: string;
  version: string;
  type: "runtime" | "engine" | "authority" | "governor" | "service";
  status: "registered" | "booting" | "ready" | "active" | "degraded" | "crashed" | "recovering" | "stopped";
  health(): { status: string; uptime: number; version: string };
  boot?(): Promise<void>;
  shutdown?(): Promise<void>;
  checkpoint?(): Record<string, unknown>;
  restore?(state: Record<string, unknown>): Promise<void>;
}

export interface HeartbeatRecord {
  component: string;
  lastBeat: number;
  intervalMs: number;
  missCount: number;
  status: "alive" | "late" | "dead";
}

export interface KernelCheckpoint {
  id: string;
  timestamp: string;
  state: OrgState;
  components: Record<string, { status: string; data: Record<string, unknown> }>;
  activeMissions: string[];
  pendingDecisions: string[];
}

export interface KernelEvent {
  type: string;
  source: string;
  payload: unknown;
  timestamp: number;
}
