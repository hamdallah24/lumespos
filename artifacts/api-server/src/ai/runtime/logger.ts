// SPRINT 3.5: Structured Logger — writes ExecutionContext traces
import { ExecutionContext } from "./execution-context";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  component: string;
  message: string;
  data?: Record<string, any>;
}

// In-memory ring buffer for recent logs (last 100 entries)
const ringBuffer: LogEntry[] = [];
const MAX_BUFFER = 100;

function log(level: LogLevel, ctx: ExecutionContext | null, component: string, message: string, data?: Record<string, any>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: ctx?.requestId || "no-request",
    component,
    message,
    data,
  };

  ringBuffer.push(entry);
  if (ringBuffer.length > MAX_BUFFER) ringBuffer.shift();

  // Console output for PM2 logs
  const prefix = `[${entry.requestId.slice(0, 8)}] [${component}]`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  const line = `${prefix} ${message}${dataStr}`;

  switch (level) {
    case "debug": console.debug(line); break;
    case "info":  console.log(line); break;
    case "warn":  console.warn(line); break;
    case "error": console.error(line); break;
  }
}

export const logger = {
  debug(ctx: ExecutionContext | null, component: string, msg: string, data?: Record<string, any>) {
    log("debug", ctx, component, msg, data);
  },
  info(ctx: ExecutionContext | null, component: string, msg: string, data?: Record<string, any>) {
    log("info", ctx, component, msg, data);
  },
  warn(ctx: ExecutionContext | null, component: string, msg: string, data?: Record<string, any>) {
    log("warn", ctx, component, msg, data);
  },
  error(ctx: ExecutionContext | null, component: string, msg: string, error?: Error, data?: Record<string, any>) {
    log("error", ctx, component, msg, { ...data, errorMessage: error?.message });
  },

  /** Get recent logs for debugging */
  recent(count = 20): LogEntry[] {
    return ringBuffer.slice(-count);
  },

  /** Get logs filtered by request ID */
  byRequest(requestId: string): LogEntry[] {
    return ringBuffer.filter(e => e.requestId === requestId);
  },

  /** Export all buffered logs */
  export(): LogEntry[] {
    return [...ringBuffer];
  },

  /** Clear the log buffer */
  clear(): void {
    ringBuffer.length = 0;
  },
};

// Component metadata
export const logSystem = {
  name: "LogSystem",
  version: "1.0.0",
  capabilities: ["structured-logging", "request-tracing", "ring-buffer"],
  dependencies: ["ExecutionContext"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
