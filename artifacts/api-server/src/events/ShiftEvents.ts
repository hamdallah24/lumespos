import type { BaseEvent } from "../event-bus";

export interface ShiftOpenedData {
  shiftId: number;
  branchId: number;
  cashierId: number;
  openingBalance: number;
}

export interface ShiftClosedData {
  shiftId: number;
  branchId: number;
  status: string;
  expectedBalance: number;
  closingBalance: number;
  difference: number;
}

export type ShiftEvent =
  | { type: "shift.opened"; data: ShiftOpenedData }
  | { type: "shift.closed"; data: ShiftClosedData };

export function createShiftOpenedEvent(
  data: ShiftOpenedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `shift-opened-${data.shiftId}`,
    type: "shift.opened",
    version: 1,
    timestamp: new Date(),
    aggregateId: `shift:${data.shiftId}`,
    aggregateType: "shift_audit",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createShiftClosedEvent(
  data: ShiftClosedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `shift-closed-${data.shiftId}`,
    type: "shift.closed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `shift:${data.shiftId}`,
    aggregateType: "shift_audit",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}
