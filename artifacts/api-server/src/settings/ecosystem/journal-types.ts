// ConfigCenter — Milestone 6 Phase 4: Ecosystem Journal event-type guard.
// Small helper split from journal.ts so the barrel can re-export it without
// dragging the whole journal implementation into hot paths.

import type { EcosystemEventType } from "./types";

const EVENT_TYPES: readonly EcosystemEventType[] = [
  "package.discovered",
  "package.validated",
  "package.install.started",
  "package.install.completed",
  "package.install.failed",
  "package.activated",
  "package.remove.started",
  "package.remove.completed",
  "package.remove.blocked",
  "package.remove.forced",
  "package.integrity.failed",
  "package.dependency.failed",
];

export function isEcosystemEventType(value: unknown): value is EcosystemEventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

export const ECOSYSTEM_EVENT_TYPES: readonly EcosystemEventType[] = EVENT_TYPES;
