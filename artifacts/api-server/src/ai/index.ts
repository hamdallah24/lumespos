// AI Backend — single public entry point (Sprint 5)
// All imports go through this module.

// ── Governance (Sprint 6) ──
export { submit as submitProposal, approve as approveProposal, reject as rejectProposal, pending as pendingProposals, GateResult } from "./governance/authority-gate";
export { validate as validateConstitutional, checkpoint as constitutionalCheckpoint } from "./governance/constitutional-validator";
export { record as recordProposal, history as proposalHistory } from "./governance/proposal-ledger";
export { canSubmit as canSubmitBudget, record as recordBudget, report as budgetReport } from "./governance/evolution-budget";

// ── Security (Sprint 6) ──
export { Classification, classifyContent, canSendToLLM, canAccess } from "./security/classification";
export { deepseekProvider, getProvider, setProvider } from "./security/llm-provider";
export type { LLMProvider } from "./security/llm-provider";

// ── Runtime Components ──
export * from "./runtime/registry";
export { foundationLoader } from "./runtime/foundation-loader";
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
// (generateAndCommit deprecated — see ADR-020, use proposalExecutor instead)

// ── Migration ──
export { runMigration } from "../routes/migrate";

// ── Tools ──
export { READ_TOOLS, DEVOPS_TOOLS, EXPLORE_TOOLS } from "../routes/ai-helpers";
export type { ToolDef } from "../routes/ai-helpers";
export { mergeDeploy, fetchGitHubFile, readLocalFile, sshExec, getHistory, remember, clearMemory, searchRepoFiles, checkRateLimit, getChecklistItems, upsertChecklistItem, saveSharedContext, getSharedContext, getOrCreateConversation } from "../routes/ai-helpers";
