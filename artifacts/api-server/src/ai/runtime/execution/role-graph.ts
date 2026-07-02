// ECP-019: Role Graph — Role → RuntimeType mapping
// Frozen. Maps organizational roles to runtime types.
// Changes when runtime types are added/removed from org.

const roleToRuntimeType: Record<string, string> = {
  "CEO":                  "CEO",
  "CTO":                  "CTO",
  "COO":                  "COO",
  "Lead DevOps":          "CTO",
  "Senior Architect":     "CTO",
  "Security Auditor":     "CTO",
  "Database Engineer":    "CTO",
  "Inventory Manager":    "COO",
  "QA Lead":              "CTO",
  "Generalist":           "CEO",
  "Chat":                 "Chat",
};

class RoleGraph {
  getRuntimeType(role: string): string | null {
    for (const [r, rt] of Object.entries(roleToRuntimeType)) {
      if (r.toLowerCase() === role.toLowerCase()) return rt;
    }
    return null;
  }

  hasRole(role: string): boolean {
    for (const r of Object.keys(roleToRuntimeType)) {
      if (r.toLowerCase() === role.toLowerCase()) return true;
    }
    return false;
  }

  allRoles(): string[] { return Object.keys(roleToRuntimeType); }
}

export const roleGraph = new RoleGraph();
