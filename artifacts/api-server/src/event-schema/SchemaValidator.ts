import type { BaseEvent } from "../event-bus/types";
import { validateEventData } from "./EventSchemaRegistry";

export function validateEvent(event: BaseEvent): boolean {
  const result = validateEventData(event.type, event.version, event.data);
  if (!result.valid) {
    console.error(`[SchemaValidator] ${result.error}`, { eventType: event.type, version: event.version });
  }
  return result.valid;
}

export function validateEventStrict(event: BaseEvent): { valid: boolean; error?: string } {
  return validateEventData(event.type, event.version, event.data);
}
