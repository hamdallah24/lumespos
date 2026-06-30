// SPRINT 6: Constitutional Validator — every proposal checked against Foundation
// Fails fast if proposal violates Constitution, North Star, or Governance

interface ValidationResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  checkedAt: string;
}

// Constitutional rules — derived from CONSTITUTION.md chapters
const CONSTITUTIONAL_RULES = [
  {
    rule: "No data deletion without approval",
    check: (p: any) => {
      if (p.affectedAssets?.some((a: string) => a.includes("delete") || a.includes("DROP"))) {
        return { passed: false, violation: "Constitution Ch.6: No data deletion without explicit Founder approval and rollback plan" };
      }
      return { passed: true };
    },
  },
  {
    rule: "No hardcoded secrets",
    check: (p: any) => {
      if (p.summary?.toLowerCase().includes("hardcode secret") || p.summary?.toLowerCase().includes("hardcode credential")) {
        return { passed: false, violation: "Constitution Ch.6: No hardcoded secrets. Use env vars or vault." };
      }
      return { passed: true };
    },
  },
  {
    rule: "Foundation requires Founder",
    check: (p: any) => {
      const foundation = ["north-star-v1", "constitution-v1"];
      const touches = p.affectedAssets?.some((a: string) => foundation.includes(a));
      if (touches && !p.requiresFounder) {
        return { passed: false, violation: "Constitution Ch.4: Foundation changes require Founder approval. Set requiresFounder=true." };
      }
      return { passed: true };
    },
  },
  {
    rule: "Architecture before code",
    check: (p: any) => {
      if (p.type === "architecture" && !p.affectedAssets?.length) {
        return { passed: false, violation: "Constitution Ch.3: Architecture proposals must list affected assets." };
      }
      return { passed: true };
    },
  },
  {
    rule: "Documentation is product",
    check: (p: any) => {
      if ((p.type === "code" || p.type === "architecture") && p.affectedAssets?.length === 0) {
        return { passed: false, violation: "Constitution Ch.8: Code and architecture changes must update documentation. No affected assets listed." };
      }
      return { passed: true };
    },
  },
];

// North Star alignment checks
const NORTH_STAR_RULES = [
  {
    rule: "Amplify human creativity",
    check: (p: any) => {
      const blacklist = ["fully autonomous without oversight", "remove human review", "bypass founder"];
      const summary = (p.summary || "").toLowerCase();
      const violates = blacklist.some(b => summary.includes(b));
      if (violates) {
        return { passed: false, violation: "North Star: Must amplify human creativity, not replace human oversight." };
      }
      return { passed: true };
    },
  },
];

/** Validate a proposal against Constitution and North Star */
export function validate(proposal: { id: string; type: string; summary: string; affectedAssets: string[]; requiresFounder?: boolean }): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check Constitutional rules
  for (const rule of CONSTITUTIONAL_RULES) {
    try {
      const result = rule.check(proposal);
      if (!result.passed) violations.push(result.violation!);
    } catch {
      warnings.push(`Constitutional check "${rule.rule}" failed to execute — manual review recommended`);
    }
  }

  // Check North Star rules
  for (const rule of NORTH_STAR_RULES) {
    try {
      const result = rule.check(proposal);
      if (!result.passed) violations.push(result.violation!);
    } catch {
      warnings.push(`North Star check "${rule.rule}" failed to execute`);
    }
  }

  // Architecture check: verify affected assets exist
  // (Lightweight — doesn't import files, just checks pattern)
  if (proposal.affectedAssets?.length > 0) {
    const invalidIds = proposal.affectedAssets.filter(id => !/^[a-z0-9-]+-v\d+$/.test(id));
    if (invalidIds.length > 0) {
      warnings.push(`Possibly invalid asset IDs: ${invalidIds.join(", ")}. Verify against Knowledge Graph.`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

/** Full constitutional checkpoint — validate + gate in sequence */
export function checkpoint(proposal: Parameters<typeof validate>[0]): ValidationResult & { gated: boolean } {
  const v = validate(proposal);

  // Additional governance checks
  if (proposal.type === "governance" && !proposal.requiresFounder) {
    v.violations.push("Governance proposals always require Founder approval. Set requiresFounder=true.");
  }

  return {
    ...v,
    passed: v.passed && v.violations.length === 0,
    gated: true,
  };
}

export const constitutionalValidator = {
  name: "ConstitutionalValidator",
  version: "1.0.0",
  capabilities: ["proposal-validation", "constitution-enforcement", "north-star-alignment"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
