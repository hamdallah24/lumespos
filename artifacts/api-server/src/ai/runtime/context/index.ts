// ECP-027: Context Layer — public API
// Single entry point for context assembly.

export { assemble, assemblePrompt } from "./context-assembler";
export { buildPackage, compress, allocate } from "./context-budget";
export { getRecentDecisions, summarizeConversation } from "./runtime-memory-manager";
export type { ContextSource, ContextPackage, MemoryEntry, MissionContext, WorkspaceContext, ConversationSummary } from "./context-types";
