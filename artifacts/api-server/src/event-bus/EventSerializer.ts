import type { BaseEvent } from "./types";
import { registerSchema, validateEventData, getSchema } from "../event-schema/EventSchemaRegistry";

export function registerEventSchema(
  eventType: string,
  version: number,
  validateFn: (data: unknown) => boolean,
) {
  registerSchema(eventType, version, validateFn);
}

export function validateEvent(event: BaseEvent): boolean {
  const result = validateEventData(event.type, event.version, event.data);
  return result.valid;
}

export function getEventSchemaVersion(eventType: string): number {
  return getSchema(eventType)?.version ?? 1;
}
