# Executive Configuration Guide

## Overview

Each executive runtime is configured via a `.config.ts` file and a foundation directive. The config defines:
- Role identity and authority
- Required and optional facts for brief generation
- Forbidden topics
- Approval level requirements

## Configuration Schema

```typescript
interface ExecutiveConfig {
  role: string;
  requiredFacts: string[];    // Facts that must appear in brief
  optionalFacts: string[];    // Facts that may appear if available
  forbidden: string[];        // Topics the executive cannot handle
  approvalLevel: string | null;  // Default approval chain
  description: string;
}
```

## Current Executives

| Executive | Required Facts | Forbidden | Approval Level |
|-----------|---------------|-----------|----------------|
| CEO | Branch, Finance, Sales, Growth | Shift details, Stock items | founder |
| CTO | Codebase, Architecture, Dependencies | — | ceo |
| CFO | Finance, Margin, Expense, Cashflow | Operations, Staff | ceo |
| CMO | Customer, Sales, Product | Inventory, Production | ceo |
| CAIO | System, AI, Knowledge, Automation | Business decisions | ceo |
| CKO | All knowledge types | Business decisions | — |
| COO | Inventory, Operations, Shift | Price changes, Recipe edits | ceo |

## Adding a New Executive

1. Create directory: `src/executive-runtime/executives/{ROLE}/`
2. Create `{ROLE}.config.ts` with ExecutiveConfig
3. Create `{ROLE}Program.ts` extending the executive template pattern:
   ```typescript
   import { getIdentity } from "...";
   import { GovernanceProvider } from "...";
   // ... standard pipeline

   async function execute(task: ExecutiveTask, execContract?: ExecutionContract): Promise<ExecutiveResult> {
     // 1. Identity + Directive
     // 2. Semantic Understanding → Spec → Verification
     // 3. Governance check
     // 4. CKO Consultation
     // 5. Context gathering
     // 6. LLM/ExecutionPipeline call
     // 7. Knowledge recording
     // 8. Audit logging
   }

   export const roleRuntime = { name, version, capabilities, dependencies, health, execute };
   ```
4. Create `index.ts` exporting config + runtime
5. Update `src/executive-runtime/executives/index.ts` to include new role
6. Add foundation directive in `foundation/` directory
7. If needed, add role to `ExecutiveRole` type in `src/governance/governance-types.ts`
