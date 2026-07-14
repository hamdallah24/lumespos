# EIOS API Reference

## Event Bus

### `EventBus`
```typescript
class EventBus {
  subscribe(eventType: string, handler: (event: BusEvent) => void): void;
  unsubscribe(eventType: string, handler: (event: BusEvent) => void): void;
  publish(eventType: string, payload: unknown): void;
}

interface BusEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  sequence?: number;
}
```

### Domain Events
| Event | Payload | Emitted By |
|-------|---------|-----------|
| `StockAdjusted` | `{ productId, quantity, reason, stockAfter }` | inventory service |
| `PurchaseReceived` | `{ productId, quantity, cost }` | inventory service |
| `OrderCreated` | `{ orderId, items, total }` | orders route |
| `OrderCompleted` | `{ orderId, total }` | orders route |
| `ShiftOpened` | `{ shiftId, branchId, cashStart }` | shift audits route |
| `ShiftClosed` | `{ shiftId, cashEnd, discrepancies }` | shift audits route |
| `ExpenseRecorded` | `{ expenseId, amount, category }` | expenses route |
| `ProductCreated` | `{ productId, name, price }` | products route |
| `PriceChanged` | `{ productId, oldPrice, newPrice }` | product variants route |

---

## Business Intelligence

### `MetricStore`
```typescript
class MetricStore {
  record(name: string, value: Record<string, unknown>, domain: string, ttlMs?: number): void;
  getMetrics(domain: string, period: string): Metric[];
  aggregate(name: string, field: string): MetricAggregate;
  clear(): void;
}
```

### `InsightEngine`
```typescript
const InsightEngine = {
  generate(metrics: Metric[]): Insight[];
}
```

### `FactEngine`
```typescript
const FactEngine = {
  generate(insights: Insight[]): BusinessFact[];
}
```

---

## Decision Engine

### `RuleEngine`
```typescript
class RuleEngine {
  registerRule(id: string, rule: RuleDefinition): void;
  evaluate(facts: BusinessFact[]): OperationalSituation[];
}

interface RuleDefinition {
  name: string;
  condition: (fact: BusinessFact) => boolean;
  priority?: number;
}
```

---

## Execution Planner

### `PlanProvider`
```typescript
const PlanProvider = {
  createFromObjective(objective: StrategicObjective): ExecutionPlan;
  createFromTemplate(templateName: string, branchId?: number): ExecutionPlan;
  getAll(): ExecutionPlan[];
  getById(id: string): ExecutionPlan | undefined;
}
```

---

## Knowledge Platform

### `KnowledgeProvider`
```typescript
const KnowledgeProvider = {
  ingestSemantic(params: SemanticParams): KnowledgeBlock;
  ingestEpisode(params: EpisodeParams): KnowledgeBlock;
  ingestProcedural(params: ProceduralParams): KnowledgeBlock;
  searchAll(query: string): KnowledgeBlock[];
  getLatestEpisodes(limit?: number): KnowledgeBlock[];
  getStats(): KnowledgeStats;
}
```

---

## Governance

### `GovernanceProvider`
```typescript
const GovernanceProvider = {
  canExecute(role: ExecutiveRole, action: string, resource: string, value?: number): { allow: boolean; reason: string };
  checkCompliance(role: ExecutiveRole, action: string, resource: string, data?: Record<string, unknown>): ComplianceResult;
  getApprovalLevel(value: number, resource: string): string;
  getApprovers(level: string): string[];
  getAuditLog(): AuditEntry[];
}
```

---

## Executive Runtimes

### `ceoRuntime` / `ctoProgram` / `cfoRuntime` / `cmoRuntime` / `caioRuntime` / `ckoRuntime`
```typescript
interface ExecutiveRuntime {
  name: string;
  version: string;
  capabilities: string[];
  dependencies: string[];
  health(): { status: string; uptime: number; version: string; custom: Record<string, unknown> };
  execute(task: ExecutiveTask, execContract?: ExecutionContract): Promise<ExecutiveResult>;
}
```

---

## Brief Generator

### `BriefGenerator`
```typescript
const BriefGenerator = {
  generate(params: {
    role: string;
    situations: OperationalSituation[];
    objectives: StrategicObjective[];
    plans: ExecutionPlan[];
    knowledge: KnowledgeBlock[];
  }): ExecutiveBrief;
}
```

---

## Communication

### `CommunicationProvider`
```typescript
const CommunicationProvider = {
  dispatch(params: {
    channel: string;
    recipient: string;
    content: string;
    priority?: DeliveryPriority;
  }): DeliveryTask;
  process(): Promise<number>;
  getPending(): DeliveryTask[];
}
```
