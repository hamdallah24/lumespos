# Executive Capability Matrix

**Version:** 1.0.0  
**Status:** Architecture v4.1  
**Last Updated:** 2026-07-13

---

## Capability Overview

| Capability | Owner | Shared | Delegatable | Requires Approval | Requires Review | Runtime Dependency | Business Dependency |
|-----------|-------|--------|-------------|------------------|----------------|--------------------|--------------------|
| mission-planning | CEO | CTO | Yes | No | Yes | PipelineScheduler | MissionEngine |
| delegation | CEO | All | Yes | No | Yes | ExecutiveDispatchRegistry | OrganizationEngine |
| proposal-review | CEO | CTO | Yes | No | Yes | DispatchRegistry | None |
| organization-management | CEO | None | No | Founder | Yes | RuntimeFacade | OrganizationEngine |
| business-analysis | CEO | CFO | Yes | No | Yes | KnowledgeProvider | Foundation |
| strategic-decision | CEO | None | No | Founder | Yes | RuntimeFacade | None |
| report-aggregation | CEO | CKO | Yes | No | No | KnowledgeProvider | None |
| code-analysis | CTO | None | No | No | Yes | RuntimeFacade | FileSystem |
| implementation | CTO | None | No | CEO | Yes | ExecutionPipeline | FileSystem |
| architecture-review | CTO | CAIO | Yes | No | Yes | DispatchRegistry | KnowledgePlatform |
| devops | CTO | None | No | No | Yes | RuntimeFacade | System |
| proposal-generation | CTO | CKO | Yes | No | Yes | KnowledgeProvider | None |
| knowledge-evolution | CTO | CKO | Yes | No | Yes | KnowledgeProvider | None |
| financial-analysis | CFO | None | No | No | Yes | KnowledgeProvider | FinanceData |
| budget-review | CFO | CEO | Yes | CEO | Yes | PlanProvider | FinanceData |
| cost-optimization | CFO | COO | Yes | CEO | Yes | KnowledgeProvider | OperationsData |
| margin-analysis | CFO | None | No | No | Yes | KnowledgeProvider | FinanceData |
| market-analysis | CMO | None | No | No | Yes | KnowledgeProvider | MarketData |
| campaign-strategy | CMO | COO | Yes | CEO | Yes | PlanProvider | MarketData |
| customer-insight | CMO | CKO | Yes | No | Yes | KnowledgeProvider | CustomerData |
| product-trend | CMO | CTO | Yes | No | Yes | KnowledgeProvider | ProductData |
| ai-health-monitoring | CAIO | None | No | No | Yes | RuntimeFacade.health | SystemMetrics |
| system-architecture | CAIO | CTO | Yes | No | Yes | DispatchRegistry | System |
| knowledge-management | CAIO | CKO | Yes | No | Yes | KnowledgeProvider | KnowledgePlatform |
| automation-oversight | CAIO | COO | Yes | CEO | Yes | PipelineScheduler | Operations |
| knowledge-curation | CKO | None | No | No | No | KnowledgeProvider | KnowledgePlatform |
| council-secretary | CKO | None | No | No | No | CouncilSessionManager | None |
| best-practices | CKO | All | Yes | No | No | KnowledgeProvider | KnowledgePlatform |
| advisory | CKO | All | Yes | No | No | ConsultantRuntime | KnowledgePlatform |
| learning-recommendation | CKO | CEO | Yes | No | Yes | KnowledgeProvider | KnowledgePlatform |
| inventory-management | COO | None | No | CEO | Yes | RuntimeFacade | OperationsData |
| sales-tracking | COO | CMO | Yes | No | No | KnowledgeProvider | OperationsData |
| product-management | COO | CTO | Yes | No | Yes | RuntimeFacade | ProductData |
| branch-operations | COO | None | No | CEO | Yes | RuntimeFacade | OperationsData |
| approval-handling | COO | CEO | No | Founder | Yes | GovernanceProvider | None |

---

## Capability Distribution by Executive

### CEO (7 capabilities)
```
mission-planning, delegation, proposal-review, organization-management,
business-analysis, strategic-decision, report-aggregation
```

### CTO (6 capabilities)
```
code-analysis, implementation, architecture-review, devops,
proposal-generation, knowledge-evolution
```

### CFO (4 capabilities)
```
financial-analysis, budget-review, cost-optimization, margin-analysis
```

### CMO (4 capabilities)
```
market-analysis, campaign-strategy, customer-insight, product-trend
```

### CAIO (4 capabilities)
```
ai-health-monitoring, system-architecture, knowledge-management, automation-oversight
```

### CKO (5 capabilities)
```
knowledge-curation, council-secretary, best-practices, advisory, learning-recommendation
```

### COO (4 capabilities)
```
inventory-management, sales-tracking, product-management, branch-operations
```

---

## Shared Capabilities

| Capability | Primary | Secondary |
|-----------|---------|-----------|
| mission-planning | CEO | CTO |
| proposal-review | CEO | CTO |
| report-aggregation | CEO | CKO |
| architecture-review | CTO | CAIO |
| proposal-generation | CTO | CKO |
| knowledge-evolution | CTO | CKO |
| budget-review | CFO | CEO |
| cost-optimization | CFO | COO |
| campaign-strategy | CMO | COO |
| customer-insight | CMO | CKO |
| product-trend | CMO | CTO |
| system-architecture | CAIO | CTO |
| knowledge-management | CAIO | CKO |
| automation-oversight | CAIO | COO |
| best-practices | CKO | All |
| advisory | CKO | All |
| learning-recommendation | CKO | CEO |
| sales-tracking | COO | CMO |
| product-management | COO | CTO |
| approval-handling | COO | CEO |

---

## Governance Gates

| Capability | Gate Check | Denial Action |
|-----------|-----------|---------------|
| Any sensitive execution | `GovernanceProvider.canExecute(role, action, domain)` | Block action, log audit, notify user |
| Cross-domain delegation | `ExecutiveDispatchRegistry.dispatch()` | Return null, caller handles |
| System access | `RuntimeFacade.health()` | Return health error |
| Knowledge recording | `KnowledgeProvider.ingestEpisode()` | No effect, log warning |

---

## Delegation Rules by Capability

| From | Capability | Delegates To | Condition |
|------|-----------|-------------|-----------|
| CEO | Strategic decision | Founder | High risk or out of scope |
| CEO | Technical execution | CTO | Technical domain |
| CEO | Financial analysis | CFO | Financial domain |
| CEO | Operational execution | COO | Operations domain |
| CEO | Market analysis | CMO | Market domain |
| CEO | AI system health | CAIO | AI/system domain |
| CEO | Knowledge curation | CKO | Knowledge domain |
| CTO | Plan approval | CEO | Needs approval via `[CEO APPROVAL]` |
| CTO | Architecture review | CAIO | Cross-system impact |
| CTO | Knowledge | CKO | Knowledge recording |
| CFO | Budget approval | CEO | Above spending authority |
| CFO | Cost optimization | COO | Operations-related costs |
| CMO | Campaign execution | COO | Operational logistics |
| COO | Escalation | CEO | High-severity situations |
| CAIO | System changes | CTO | Infrastructure changes |
