# EIOS Event Catalog

> Version 1.0 — Event types, schemas, publishers, consumers, and data contracts for the Event-Driven Intelligence Operating System.

---

## 1. Base Event Contract

Every event flowing through the primary `EventBus` adheres to the `BaseEvent` interface:

```typescript
interface BaseEvent {
  id: string;                    // Unique event ID (UUID or ksuid)
  type: string;                  // Event type discriminator (e.g. "order.created")
  version: number;               // Schema version (all current events use 1)
  timestamp: Date;               // When the event occurred
  aggregateId: string;           // Domain entity reference (e.g. "order:123")
  aggregateType: string;         // Entity type (e.g. "order", "inventory")
  data: Record<string, unknown>; // Typed payload per event
  metadata?: Record<string, unknown>;
}
```

**Status values**: `"pending"` | `"delivered"` | `"failed"`

---

## 2. Domain Events (Primary EventBus)

These events are published via the primary `EventBus` singleton (`src/event-bus/EventBus.ts`) and persisted to the `event_store` table via `EventStore`.

### 2.1 Sales & Orders

#### `order.created`
| Field | Type | Description |
|---|---|---|
| **Published in** | `routes/orders.ts:281` | After order insertion |
| **Consumed by** | `SalesEventConsumer` | |

```typescript
// data: OrderCreatedData
{
  branchId: number;
  orderId: number;
  total: number;
  totalCogs: number;
  paymentMethod: string;
  cashierName: string;
  items: Array<{
    productId: number;
    productVariantId?: number;
    quantity: number;
    price: number;
  }>;
}
```

#### `order.completed`
| Field | Value |
|---|---|
| **Published in** | `routes/orders.ts:291` |
| **Consumed by** | `SalesEventConsumer` → creates `Metric` in `"sales"` domain |

```typescript
// data: OrderCompletedData
{
  branchId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
}
```

#### `payment.received`
| Field | Value |
|---|---|
| **Published in** | `routes/orders.ts` (internal) |
| **Consumed by** | None currently |

```typescript
// data: PaymentReceivedData
{
  branchId: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
}
```

---

### 2.2 Inventory

#### `stock.adjusted`
| Field | Value |
|---|---|
| **Published in** | `routes/inventory.ts:139`, `routes/ai-business.ts:114,146` |
| **Consumed by** | `InventoryEventConsumer` |

```typescript
// data: StockAdjustedData
{
  branchId: number;
  itemType: "ingredient" | "semi_finished";
  itemId: number;
  delta: number;           // positive = addition, negative = reduction
  newStock: number;
  previousStock: number;
}
```

#### `purchase.received`
| Field | Value |
|---|---|
| **Published in** | `routes/inventory.ts:150` |
| **Consumed by** | `InventoryEventConsumer` |

```typescript
// data: PurchaseReceivedData
{
  branchId: number;
  ingredientId: number;
  quantity: number;
  purchaseTotal: number;
  newAverageCost: number;
}
```

#### `stock.corrected`
| Field | Value |
|---|---|
| **Published in** | `routes/ai-business.ts:180` |
| **Consumed by** | None currently |

```typescript
// data: StockCorrectedData
{
  branchId: number;
  itemType: "ingredient" | "semi_finished";
  itemId: number;
  previousStock: number;
  correctedStock: number;
  delta: number;
  reason?: string;
}
```

---

### 2.3 Products

#### `product.created`
| Field | Value |
|---|---|
| **Published in** | `routes/products.ts:354`, `routes/ai-business.ts:236` |
| **Consumed by** | None currently |

```typescript
// data: ProductCreatedData
{
  branchId: number;
  productId: number;
  name: string;
  price: number;
}
```

#### `price.changed`
| Field | Value |
|---|---|
| **Published in** | `routes/productVariants.ts:98`, `routes/ai-business.ts:259` |
| **Consumed by** | None currently |

```typescript
// data: PriceChangedData
{
  productVariantId: number;
  productId: number;
  variantName: string;
  oldPrice: number;
  newPrice: number;
}
```

#### `recipe.changed`
| Field | Value |
|---|---|
| **Published in** | `routes/ai-business.ts:329,363` |
| **Consumed by** | None currently |

```typescript
// data: RecipeChangedData
{
  productId: number;
  productName: string;
  branchId: number;
  action: "created" | "updated";
}
```

---

### 2.4 Production

#### `ingredient.consumed`
| Field | Value |
|---|---|
| **Published in** | `routes/semiFinished.ts:272` (per recipe item) |
| **Consumed by** | None currently |

```typescript
// data: IngredientConsumedData
{
  branchId: number;
  semiFinishedId: number;
  componentType: "ingredient" | "semi_finished";
  componentId: number;
  quantity: number;
}
```

#### `batch.produced`
| Field | Value |
|---|---|
| **Published in** | `routes/semiFinished.ts:281`, `routes/ai-business.ts:450` |
| **Consumed by** | None currently |

```typescript
// data: BatchProducedData
{
  branchId: number;
  semiFinishedId: number;
  semiFinishedName: string;
  producedWeight: number;
  totalCost: number;
  newHpp: number;           // Harga Pokok Produksi (new unit cost)
}
```

---

### 2.5 Finance

#### `expense.recorded`
| Field | Value |
|---|---|
| **Published in** | `routes/expenses.ts:51`, `routes/ai-business.ts:393` |
| **Consumed by** | `FinanceEventConsumer` → creates `Metric` + calculates expense ratio |

```typescript
// data: ExpenseRecordedData
{
  branchId: number;
  expenseId: number;
  amount: number;
  category: string;
  description: string;
}
```

---

### 2.6 Shift Audits

#### `shift.opened`
| Field | Value |
|---|---|
| **Published in** | `routes/shiftAudits.ts:255` |
| **Consumed by** | `FinanceEventConsumer` |

```typescript
// data: ShiftOpenedData
{
  shiftId: number;
  branchId: number;
  cashierId: number;
  openingBalance: number;
}
```

#### `shift.closed`
| Field | Value |
|---|---|
| **Published in** | `routes/shiftAudits.ts:406` |
| **Consumed by** | `FinanceEventConsumer` |

```typescript
// data: ShiftClosedData
{
  shiftId: number;
  branchId: number;
  status: string;
  expectedBalance: number;
  closingBalance: number;
  difference: number;
}
```

---

## 3. Event Consumers

| Consumer | File | Subscribes To | Action |
|---|---|---|---|
| `SalesEventConsumer` | `business-intelligence/event-consumers/SalesEventConsumer.ts` | `order.created` | `processOrderCreated()` + `calculateGrossMargin()` |
| | | `order.completed` | Creates `Metric` (domain: `"sales"`) |
| `InventoryEventConsumer` | `business-intelligence/event-consumers/InventoryEventConsumer.ts` | `stock.adjusted` | `processStockAdjusted()` |
| | | `purchase.received` | `processPurchaseReceived()` |
| `FinanceEventConsumer` | `business-intelligence/event-consumers/FinanceEventConsumer.ts` | `expense.recorded` | Creates `Metric` + `calculateExpenseRatio()` |
| | | `shift.opened` | `processShiftOpened()` |
| | | `shift.closed` | `processShiftClosed()` |

---

## 4. Kernel Lifecycle Events (KernelEventBus)

Published via the in-memory `KernelEventBus` (`src/kernel/kernel-event-bus.ts`). No persistence.

| Event Type | Source | Description |
|---|---|---|
| `org_booting` | `kernel-lifecycle.ts` | Organization kernel is starting |
| `org_ready` | `kernel-lifecycle.ts` | All components registered |
| `org_active` | `kernel-lifecycle.ts` | Normal operation |
| `org_maintenance` | `kernel-lifecycle.ts` | Maintenance mode |
| `org_recovery` | `kernel-lifecycle.ts` | Recovery in progress |
| `org_shutdown` | `kernel-lifecycle.ts` | Shutting down |
| `org_emergency` | `kernel-lifecycle.ts` | Emergency state |
| `org_restored` | `kernel-lifecycle.ts` | System restored after failure |
| `runtime_recovered` | `kernel-recovery.ts` | A runtime component recovered |
| `runtime_rebooted` | `kernel-recovery.ts` | A runtime component rebooted |
| `runtime_dead` | `kernel-heartbeat.ts` | A runtime component is unresponsive |

---

## 5. Observability / Telemetry Events

Published via the observability `EventBus` (`src/ai/runtime/observability/event-bus.ts`). Used for AI runtime tracing.

| Event Type | Data Shape | Source |
|---|---|---|
| `trace_started` | `{ traceId, runtime, missionId }` | `telemetry.ts:19` |
| `span_completed` | `{ spanId, traceId, name, status, durationMs }` | `telemetry.ts:31` |
| `trace_completed` | `{ traceId, runtime, durationMs }` | `telemetry.ts:38` |
| `decision_made` | `{ traceId, description }` | `telemetry.ts:44` |
| `runtime_event` | `{ runtime, event, detail, traceId, timestamp }` | `telemetry.ts:49` |

---

## 6. Mission Events (Knowledge Queue)

Published via Redis-backed `KnowledgeQueue` (`src/ai/runtime/knowledge/knowledge-queue.ts`). Consumed by `KnowledgeManager`.

| Event Type | Description |
|---|---|
| `MISSION_COMPLETED` | Mission finished successfully |
| `MISSION_FAILED` | Mission encountered an error |
| `MISSION_TIMEOUT` | Mission exceeded time limit |
| `MISSION_ABORTED` | Mission was cancelled |
| `MISSION_DELEGATED` | Mission was delegated to another runtime |
| `MISSION_RETRIED` | Mission is being retried |

**Terminal states** (trigger knowledge ingestion): `MISSION_COMPLETED`, `MISSION_FAILED`, `MISSION_TIMEOUT`, `MISSION_ABORTED`

---

## 7. Learning Engine Events

### 7.1 Legacy Learning Engine (`src/learning/`)

| Event Type | Description |
|---|---|
| `EXPERIENCE_CREATED` | New experience logged |
| `REFLECTION_COMPLETE` | Reflection cycle finished |
| `KNOWLEDGE_ADDED` | Knowledge artifact created |
| `GRAPH_UPDATED` | Knowledge graph modified |
| `MEMORY_UPDATED` | Memory store changed |
| `CYCLE_COMPLETE` | Full learning cycle done |

### 7.2 Knowledge Platform Learning Engine (`src/knowledge-platform/learning/`)

| Event Type | Description |
|---|---|
| `confidence_adjusted` | Knowledge block confidence score changed |
| `promoted` | Block promoted to higher memory tier |
| `deprecated` | Block marked as deprecated |
| `archived` | Block archived |

---

## 8. SSE Streaming Events (Frontend)

Streamed via Server-Sent Events for real-time UI updates.

| Event Type | Description | Source |
|---|---|---|
| `meta` | `{ sender: runtime }` | `execution-stream.ts` |
| `token` | `{ token: string }` — LLM token chunk | `execution-stream.ts` |
| `done` | `{ finalText: string, sender?: string }` | `execution-stream.ts` |

AiMissionService internal SSE events: `snapshot`, `status_change`, `completed`, `error`

---

## 9. Event Schema Validation

The `EventSerializer` (`src/event-bus/EventSerializer.ts`) provides a schema registry:

```typescript
registerEventSchema(eventType: string, version: number, validate: (data: unknown) => boolean): void
```

**Current status**: No schemas are registered. All events pass validation unconditionally (`validateEvent()` returns `true` if no schema found).

To add validation for an event type:

```typescript
import { registerEventSchema } from "./event-bus/EventSerializer";

registerEventSchema("order.created", 1, (data) => {
  const d = data as OrderCreatedData;
  return typeof d.branchId === "number"
    && typeof d.orderId === "number"
    && Array.isArray(d.items);
});
```

---

## 10. Event Flow Diagram

```
                    ┌──────────────┐
                    │   Routes /   │
                    │  AI Actions  │
                    └──────┬───────┘
                           │ publish(BaseEvent)
                           ▼
              ┌────────────────────────┐
              │       EventBus         │
              │  (EventEmitter-based)  │
              └────┬───────────────┬───┘
                   │               │
          on(type, handler)   await store.append()
                   │               │
                   ▼               ▼
         ┌─────────────────┐  ┌──────────┐
         │ Event Consumers │  │ Postgres │
         │  (BI, Metrics)  │  │ event_store
         └─────────────────┘  └──────────┘
```

---

## 11. Adding a New Event

1. Define the data interface in `src/events/` (or appropriate domain file)
2. Create a factory function following the `createXxxEvent()` pattern
3. Call `eventBus.publish(event)` after the domain action completes
4. (Optional) Register a schema validator via `registerEventSchema()`
5. (Optional) Create an event consumer in `business-intelligence/event-consumers/`
