// ECP-039: Execution Capability Registry
// Maps business capabilities → tool implementation names.
// Governor owns capabilities (POLICY). Tool Registry resolves → ToolDef[] (IMPLEMENTATION).
// Independent of Tool Registry. Governor is the only connector.

export const CAPABILITY_TOOLS: Record<string, string[]> = {
  READ_SOURCE:          ["readFile", "fetchGitHubFile"],
  SEARCH_SOURCE:        ["searchContent"],
  ANALYZE_DEPENDENCY:   ["getDependencies"],
  INSPECT_RUNTIME:      ["listDirectory", "fetchGitHubDir"],
  EXECUTE_COMMAND:      ["execCommand", "sshExec"],
};

export const ROLE_DEFAULT_CAPABILITIES: Record<string, string[]> = {
  CEO:  [],
  CTO:  ["READ_SOURCE", "SEARCH_SOURCE", "ANALYZE_DEPENDENCY", "INSPECT_RUNTIME", "EXECUTE_COMMAND"],
  COO:  [],
};

export function getDefaultCapabilities(role: string): string[] {
  return ROLE_DEFAULT_CAPABILITIES[role] || [];
}
