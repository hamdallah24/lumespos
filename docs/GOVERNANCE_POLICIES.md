# Governance Policies

## Policy Architecture

Governance enforces policies at every layer of EIOS. Each policy is a rule that evaluates an action + role + resource and returns allow/deny.

## Policy Categories

### Permission Policies (GOV-001, GOV-002)

Define what each role can and cannot do.

| Policy | Rule | Enforcement |
|--------|------|-------------|
| GOV-001 | Only CEO/Founder can approve budgets > 10M | PermissionEngine |
| GOV-002 | COO cannot change prices | PermissionEngine |
| GOV-003 | Only CTO can approve code changes | PermissionEngine |
| GOV-004 | CKO cannot make business decisions | PermissionEngine |

### Approval Policies (GOV-003, GOV-004)

Define approval chains based on value thresholds.

| Policy | Threshold | Required Approvals | Enforcement |
|--------|-----------|-------------------|-------------|
| GOV-005 | < 1M | Auto-approve | ApprovalMatrix |
| GOV-006 | 1M–10M | COO | ApprovalMatrix |
| GOV-007 | 10M–50M | CEO | ApprovalMatrix |
| GOV-008 | > 50M | Founder | ApprovalMatrix |

### Compliance Policies (GOV-005+)

Regulatory and data governance rules.

| Policy | Rule | Enforcement |
|--------|------|-------------|
| GOV-009 | Data retention: max 90 days for raw events | ComplianceChecker |
| GOV-010 | All decisions must be logged (audit trail) | AuditEngine |
| GOV-011 | PII data cannot be stored in knowledge platform | ComplianceChecker |
| GOV-012 | Financial approvals require dual signature if > 25M | ComplianceChecker |

## Policy Format

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  evaluate(params: PolicyParams): PolicyResult;
}

interface PolicyResult {
  allow: boolean;
  reason: string;
  requiredApprovals?: string[];
}
```

## Adding a New Policy

1. Create file in `src/governance/policies/`
2. Implement the `Policy` interface
3. Register in `src/governance/policies/index.ts`
4. Add test in `tests/unit/governance-policy.test.ts`

## Audit Trail

Every policy evaluation is logged via `AuditEngine` with:
- Actor (role)
- Action
- Resource
- Result (allowed/denied)
- Reason
- Metadata (timestamp, value, context)

View recent audit: `GovernanceProvider.getAuditLog()`

## Policy Evaluation Flow

```
Action Request
    ↓
PermissionEngine.canExecute()
    ↓
  ┌─ allow? ──→ ApprovalMatrix.getLevel()
  │                ↓
  │              ┌─ needs approval? ──→ Route to approver
  │              ↓
  │              ComplianceChecker.check()
  │                ↓
  │              ┌─ compliant? ──→ ALLOW
  │              ↓
  │              DENY (compliance failure)
  ↓
DENY (permission denied)
```
