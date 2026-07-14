export type MemoryLifecycleState =
  | "NEW"
  | "VALIDATED"
  | "WORKING"
  | "CONSOLIDATED"
  | "LONG_TERM"
  | "ARCHIVED"
  | "FORGOTTEN";

export const MEMORY_LIFECYCLE_ORDER: Record<MemoryLifecycleState, number> = {
  NEW: 0,
  VALIDATED: 1,
  WORKING: 2,
  CONSOLIDATED: 3,
  LONG_TERM: 4,
  ARCHIVED: 5,
  FORGOTTEN: 6,
};

export const ALLOWED_TRANSITIONS: Record<MemoryLifecycleState, MemoryLifecycleState[]> = {
  NEW: ["VALIDATED", "FORGOTTEN"],
  VALIDATED: ["WORKING", "FORGOTTEN"],
  WORKING: ["CONSOLIDATED", "LONG_TERM", "FORGOTTEN"],
  CONSOLIDATED: ["LONG_TERM", "ARCHIVED", "FORGOTTEN"],
  LONG_TERM: ["ARCHIVED", "FORGOTTEN"],
  ARCHIVED: ["FORGOTTEN"],
  FORGOTTEN: [],
};
