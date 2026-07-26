export enum EventPriority {
  INFO = "INFO",
  WARNING = "WARNING",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export const PRIORITY_ORDER: Record<EventPriority, number> = {
  [EventPriority.INFO]: 0,
  [EventPriority.WARNING]: 1,
  [EventPriority.HIGH]: 2,
  [EventPriority.CRITICAL]: 3,
};

export const PRIORITY_COLORS: Record<EventPriority, string> = {
  [EventPriority.INFO]: "gray",
  [EventPriority.WARNING]: "yellow",
  [EventPriority.HIGH]: "orange",
  [EventPriority.CRITICAL]: "red",
};
