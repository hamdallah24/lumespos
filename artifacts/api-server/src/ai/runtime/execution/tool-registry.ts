// ECP-039: Tool Registry — single source of truth for ALL tool definitions
// Governor resolves capabilities → tools via this registry.
// Runtimes receive ToolDef[] from Contract — never import tools directly.

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export const ALL_TOOLS: ToolDef[] = [
  { name: "listDirectory", description: "List files and folders in a directory path within the project.", parameters: { type: "object", properties: { path: { type: "string", description: "Absolute or relative path to directory" } }, required: ["path"] } },
  { name: "readFile", description: "Read content of a file within the project. Returns max 5000 chars.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file" } }, required: ["path"] } },
  { name: "searchContent", description: "Search for text pattern in project files using grep.", parameters: { type: "object", properties: { path: { type: "string", description: "Directory to search in" }, pattern: { type: "string", description: "Text pattern to search for" } }, required: ["path", "pattern"] } },
  { name: "writeFile", description: "Create a new file or overwrite an existing file. Creates parent directories automatically.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to new file" }, content: { type: "string", description: "Full file content" } }, required: ["path", "content"] } },
  { name: "editFile", description: "Edit an existing file by replacing a specific text block.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file to edit" }, search: { type: "string", description: "Exact text to find" }, replace: { type: "string", description: "Replacement text" } }, required: ["path", "search", "replace"] } },
  { name: "execCommand", description: "Execute a safe shell command. Allowed: git, pnpm, npm, pm2, node, tsc, npx.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
  { name: "getDependencies", description: "Analyze import graph of a file.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "fetchGitHubFile", description: "Read file. VPS dulu, fallback GitHub. Path bisa absolute atau relative.", parameters: { type: "object", properties: { path: { type: "string" }, branch: { type: "string" } }, required: ["path"] } },
  { name: "fetchGitHubDir", description: "List directory from GitHub (fallback only).", parameters: { type: "object", properties: { path: { type: "string" }, branch: { type: "string" } }, required: ["path"] } },
  { name: "sshExec", description: "Run shell command on VPS via SSH.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
];

export const READ_TOOLS: ToolDef[] = ALL_TOOLS.filter(t =>
  ["listDirectory", "readFile", "searchContent", "getDependencies", "fetchGitHubFile", "fetchGitHubDir"].includes(t.name)
);

export const DEVOPS_TOOLS: ToolDef[] = [
  ...READ_TOOLS,
  ...ALL_TOOLS.filter(t => ["execCommand", "sshExec"].includes(t.name)),
];

export function resolveTools(capabilities: string[], capabilityMap: Record<string, string[]>): ToolDef[] {
  const names = new Set<string>();
  for (const cap of capabilities) {
    const tools = capabilityMap[cap];
    if (tools) tools.forEach(t => names.add(t));
  }
  return ALL_TOOLS.filter(t => names.has(t.name));
}
