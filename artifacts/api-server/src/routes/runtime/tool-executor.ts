// SPRINT 2: Tool Executor — tool dispatch and lifecycle
// Re-export from ai-helpers.ts, add component metadata for registry
import { executeToolCall as _executeToolCall } from "../ai-helpers";

export const TOOL_EXECUTOR_VERSION = "1.0.0";

export const executeToolCall = _executeToolCall;

export const toolExecutor = {
  name: "ToolExecutor",
  version: TOOL_EXECUTOR_VERSION,
  capabilities: [
    "list-directory",
    "read-file",
    "search-content",
    "write-file",
    "edit-file",
    "exec-command",
    "get-dependencies",
    "fetch-github-file",
    "fetch-github-directory",
    "ssh-exec",
  ],
  dependencies: [],
  execute: executeToolCall,
};
