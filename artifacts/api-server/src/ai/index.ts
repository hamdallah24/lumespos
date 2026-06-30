// AI Backend — single public entry point (Sprint 5)
// All imports go through this module.

// ── Runtime Components ──
export * from "./runtime/registry";
export { computeHealthScore, lastScore, scoreReport } from "./runtime/health-policy";
export { startHealthMonitor } from "./runtime/health-monitor";
export { ExecutionContext } from "./runtime/execution-context";
export { finalize } from "./runtime/trace";
export { executeToolCall } from "./runtime/tool-executor";
export { stripDSML, validateResponse, sanitizeMessages, validateMessageSequence, parseDSMLToolCalls } from "./runtime/validator";

// ── Core AI ──
export { callDeepSeek, callDeepSeekWithTools } from "../routes/ai-helpers";
export { callDeepSeekWithTools as execute } from "../routes/ai-helpers";

// ── Prompts ──
export { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "../routes/ai-prompts";

// ── Business + Codegen ──
export { executeOperation } from "../routes/ai-business";
export { generateAndCommit } from "../routes/ai-codegen";

// ── Migration ──
export { runMigration } from "../routes/migrate";

// ── Tools ──
export { READ_TOOLS, DEVOPS_TOOLS, EXPLORE_TOOLS, ToolDef } from "../routes/ai-helpers";
export { mergeDeploy, fetchGitHubFile, readLocalFile, sshExec, getHistory, remember, clearMemory, searchRepoFiles, checkRateLimit, getChecklistItems, upsertChecklistItem, saveSharedContext, getSharedContext, getOrCreateConversation } from "../routes/ai-helpers";
