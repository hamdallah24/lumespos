import type { ComponentId, SemVer } from "./ComponentId";

export interface EventDefinition {
  id: ComponentId;
  schema: Record<string, unknown>;
  retention: "forever" | "7d" | "24h" | "1h";
  category: "system" | "business" | "audit";
  producer: ComponentId[];
  consumer: ComponentId[];
}

export interface RuntimeEvent {
  id: string;
  correlationId: string;
  type: ComponentId;
  payload: unknown;
  timestamp: string;
  version: SemVer;
}
