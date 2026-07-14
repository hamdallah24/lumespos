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
  WRITE_SOURCE:         ["writeFile", "editFile"],
  // Business data capabilities
  READ_SALES:           ["getSalesSummary", "getTopProducts", "getSalesChart", "getCashierPerformance"],
  READ_FINANCIAL:       ["getFinancialReport", "getExpenseList", "getShiftAuditSummary"],
  READ_INVENTORY:       ["getLowStockItems", "getInventoryLevels"],
  READ_OPERATIONS:      ["getOrderHistory", "getExpenseList", "getInventoryLevels"],
};

export const ROLE_DEFAULT_CAPABILITIES: Record<string, string[]> = {
  CEO:  ["READ_SALES", "READ_FINANCIAL", "READ_INVENTORY"],
  CTO:  ["READ_SOURCE", "SEARCH_SOURCE", "ANALYZE_DEPENDENCY", "INSPECT_RUNTIME", "EXECUTE_COMMAND", "WRITE_SOURCE"],
  COO:  ["READ_INVENTORY", "READ_OPERATIONS", "READ_SALES"],
  CFO:  ["READ_FINANCIAL", "READ_SALES"],
  CMO:  [],
  CHRO: [],
  CIO:  [],
};

export function getDefaultCapabilities(role: string): string[] {
  return ROLE_DEFAULT_CAPABILITIES[role] || [];
}
