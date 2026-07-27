import { db, purchaseOrdersTable, purchaseOrderItemsTable, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

class CreatePurchaseOrderHandler implements ActionHandler {
  readonly action = "create_purchase_order";
  readonly module = "purchasing";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    const { supplierId, items } = decision.parameters;
    if (!supplierId) return { valid: false, error: "supplierId is required" };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { valid: false, error: "items must be a non-empty array" };
    }
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { supplierId, items, branchId, notes } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-po-${Date.now()}`;
    const branch = Number(branchId) || decision.branchId;

    const [po] = await db.insert(purchaseOrdersTable).values({
      supplierId: Number(supplierId),
      branchId: branch,
      userId,
      status: "pending",
      notes: (notes as string) || null,
      totalAmount: "0",
    }).returning({ id: purchaseOrdersTable.id });

    let total = 0;
    for (const item of (items as any[])) {
      const lineTotal = Number(item.qty) * Number(item.price || 0);
      total += lineTotal;
      await db.insert(purchaseOrderItemsTable).values({
        poId: po.id,
        itemName: item.name as string,
        qty: String(Number(item.qty)),
        unit: (item.unit || "pcs") as string,
        price: String(Number(item.price || 0)),
        total: String(lineTotal),
      });
    }

    await db.update(purchaseOrdersTable).set({ totalAmount: String(total) }).where(eq(purchaseOrdersTable.id, po.id));

    const event = {
      id: eventId,
      type: "po.created",
      version: 1,
      timestamp: new Date(),
      aggregateId: `po:${po.id}`,
      aggregateType: "purchase_order",
      data: { poId: po.id, supplierId, items, total, branchId: branch, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "create_purchase_order", module: "purchasing", actor: decision.executive,
      branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Purchase order #${po.id} created (supplier: ${supplierId}, items: ${(items as any[]).length})`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerPurchaseHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new CreatePurchaseOrderHandler());
}
