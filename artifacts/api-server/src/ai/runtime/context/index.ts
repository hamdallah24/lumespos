// ECP-027/032: Context Layer — public API
// Single entry point for context assembly + resource governance.

export { assemble, assemblePrompt } from "./context-assembler";
export { buildPackage, compress, allocate } from "./context-budget";
export { getRecentDecisions, summarizeConversation } from "./runtime-memory-manager";
export { promptBudgetEngine } from "./prompt-budget-engine";
export { contextPriorityEngine } from "./context-priority-engine";
export { adaptiveCompressor } from "./adaptive-compressor";
export { tokenTelemetry } from "./token-telemetry";
export { RESOURCE_POLICY, getAllocation } from "./resource-policy";
export type { TokenAllocation } from "./resource-policy";
export type { ContextSource, ContextPackage, MemoryEntry, MissionContext, WorkspaceContext, ConversationSummary } from "./context-types";
