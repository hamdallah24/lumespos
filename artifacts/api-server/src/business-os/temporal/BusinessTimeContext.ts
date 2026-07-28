export type TimeMode =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "quarter"
  | "semester"
  | "year"
  | "custom"
  | "since_event"
  | "rolling";

export type ComparisonMode = "previous_period" | "previous_year" | "none";

export interface TimeComparison {
  enabled: boolean;
  mode: ComparisonMode;
}

export interface BusinessTimeContext {
  mode: TimeMode;
  from: Date;
  to: Date;
  timezone: string;
  label: string;
  comparison?: TimeComparison;
}
