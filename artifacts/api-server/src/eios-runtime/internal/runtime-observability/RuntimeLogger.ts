type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  component: string;
  correlationId?: string;
  traceId?: string;
  stageId?: string;
  pipelineId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const LEVELS: Record<LogLevel, number> = { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, FATAL: 5 };

let currentLevel: LogLevel = "INFO";
const sinks: Array<(entry: LogEntry) => void> = [];

function format(entry: LogEntry): string {
  const parts = [`[${entry.timestamp}]`, `[${entry.level}]`, `[${entry.component}]`, entry.message];
  if (entry.correlationId) parts.splice(1, 0, `[${entry.correlationId}]`);
  if (entry.duration !== undefined) parts.push(`(${entry.duration}ms)`);
  return parts.join(" ");
}

function log(level: LogLevel, component: string, message: string, meta?: Partial<LogEntry>): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    component,
    ...meta,
  };
  for (const sink of sinks) sink(entry);
  if (level === "ERROR" || level === "FATAL") {
    if (meta?.error) console.error(format(entry), meta.error);
    else console.error(format(entry));
  } else if (level === "WARN") {
    console.warn(format(entry));
  } else if (level === "INFO" || level === "DEBUG") {
    console.log(format(entry));
  }
}

export const RuntimeLogger = {
  setLevel(level: LogLevel): void { currentLevel = level; },
  addSink(sink: (entry: LogEntry) => void): void { sinks.push(sink); },
  clearSinks(): void { sinks.length = 0; },

  trace: (c: string, m: string, meta?: Partial<LogEntry>) => log("TRACE", c, m, meta),
  debug: (c: string, m: string, meta?: Partial<LogEntry>) => log("DEBUG", c, m, meta),
  info: (c: string, m: string, meta?: Partial<LogEntry>) => log("INFO", c, m, meta),
  warn: (c: string, m: string, meta?: Partial<LogEntry>) => log("WARN", c, m, meta),
  error: (c: string, m: string, meta?: Partial<LogEntry>) => log("ERROR", c, m, meta),
  fatal: (c: string, m: string, meta?: Partial<LogEntry>) => log("FATAL", c, m, meta),
};
