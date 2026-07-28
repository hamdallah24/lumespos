import { db, productsTable, recipesTable, currentInventoryTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ItemType = "ingredient" | "semi_finished";

async function getRecipeComponents(tx: Executor, productId: number): Promise<{ componentType: ItemType; componentId: number; quantity: number }[]> {
  const rows = await tx
    .select()
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.parentType, "product"),
        eq(recipesTable.parentId, productId),
      ),
    );
  return rows.map(r => ({
    componentType: r.componentType as ItemType,
    componentId: r.componentId,
    quantity: Number(r.quantity),
  }));
}

async function deductInventory(
  tx: Executor,
  branchId: number,
  itemType: ItemType,
  itemId: number,
  qty: number,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: currentInventoryTable.id, stock: currentInventoryTable.currentStock })
    .from(currentInventoryTable)
    .where(
      and(
        eq(currentInventoryTable.branchId, branchId),
        eq(currentInventoryTable.itemType, itemType),
        eq(currentInventoryTable.itemId, itemId),
      ),
    )
    .limit(1);

  if (!row || Number(row.stock) < qty) return false;

  await tx
    .update(currentInventoryTable)
    .set({ currentStock: sql`${currentInventoryTable.currentStock} - ${qty}` })
    .where(eq(currentInventoryTable.id, row.id));
  return true;
}

class ProduceHandler implements ActionHandler {
  readonly action = "produce";
  readonly module = "production";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { productId, qty, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-prod-${Date.now()}`;
    const branch = Number(branchId) || decision.branchId;

    const errors: string[] = [];
    const warnings: string[] = [];

    const components = await db.transaction(async (tx) => {
      return getRecipeComponents(tx as any, Number(productId));
    });

    if (components.length === 0) {
      return { success: false, decisionId: decision.decisionId, executionId: execId,
        action: "produce", module: "production", actor: decision.executive,
        branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
        message: `Tidak ada resep untuk produk ID ${productId}`, eventIds: [],
        errors: [`No recipe found for product ${productId}`], warnings: [] };
    }

    const totalQty = Number(qty);
    await db.transaction(async (tx) => {
      for (const comp of components) {
        const needed = comp.quantity * totalQty;
        const ok = await deductInventory(tx as any, branch, comp.componentType, comp.componentId, needed);
        if (!ok) {
          errors.push(`Insufficient stock for component ${comp.componentType}:${comp.componentId} (need ${needed})`);
        }
      }
    });

    if (errors.length > 0) {
      return { success: false, decisionId: decision.decisionId, executionId: execId,
        action: "produce", module: "production", actor: decision.executive,
        branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
        message: `Produksi gagal: bahan tidak mencukupi`, eventIds: [],
        errors, warnings };
    }

    const event = {
      id: eventId,
      type: "production.finished",
      version: 1,
      timestamp: new Date(),
      aggregateId: `product:${productId}`,
      aggregateType: "production",
      data: { productId, qty: totalQty, branchId: branch, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "produce", module: "production", actor: decision.executive,
      branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Produksi ${totalQty} unit produk ID ${productId} berhasil`, eventIds: [eventId],
      errors, warnings,
      events: [event],
    };
  }
}

class AddIngredientHandler implements ActionHandler {
  readonly action = "add_ingredient";
  readonly module = "production";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { name, unit, price, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-prod-${Date.now()}`;

    const [ingredient] = await db.insert(ingredientsTable).values({
      name: name as string,
      unit: (unit as string) || "kg",
      price: String(Number(price || 0)),
    }).returning({ id: ingredientsTable.id });

    const event = {
      id: eventId,
      type: "ingredient.created",
      version: 1,
      timestamp: new Date(),
      aggregateId: `ingredient:${ingredient.id}`,
      aggregateType: "ingredient",
      data: { name, unit, ingredientId: ingredient.id, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "add_ingredient", module: "production", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Bahan ${name} berhasil ditambahkan (ID: ${ingredient.id})`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerProductionHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new ProduceHandler());
  registry.register(new AddIngredientHandler());
}
