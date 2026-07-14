// T.0.2 — MemoryProvider — SINGLE public contract for executive memory reads
// T.1 — Memory Engine (EME) integrated via memoryProvider.write()

export { memoryProvider, memoryEngine } from "./MemoryProvider";
export { memoryConfig } from "./config";
export { l1Cache } from "./cache";
export { circuitBreaker } from "./circuit-breaker";
export { memoryMetrics } from "./metrics";
export { writeDecisionToMemory } from "./decision-hook";
export type { MemoryQuery, MemoryContext, MemoryProvider, WriteMemoryInput, WriteMemoryResult } from "./types";
