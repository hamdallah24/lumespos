import { db, productsTable, productVariantsTable, recipesTable, ingredientsTable, semiFinishedTable, currentInventoryTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];

class AddProductHandler implements ActionHandler {
  readonly action = "add_product";
  readonly module = "product";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { name, price, category, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-product-${Date.now()}`;

    const [product] = await db.insert(productsTable).values({
      name: name as string,
      price: String(Number(price)),
      category: (category as string) || null,
      isActive: true,
    }).returning({ id: productsTable.id });

    const event = {
      id: eventId,
      type: "product.created",
      version: 1,
      timestamp: new Date(),
      aggregateId: `product:${product.id}`,
      aggregateType: "product",
      data: { name, price, category, productId: product.id, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "add_product", module: "product", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Produk ${name} berhasil dibuat (ID: ${product.id})`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class UpdatePriceHandler implements ActionHandler {
  readonly action = "update_price";
  readonly module = "product";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { productId, price, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-product-${Date.now()}`;

    const [before] = await db.select({ price: productsTable.price }).from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);

    await db.update(productsTable).set({ price: String(Number(price)) }).where(eq(productsTable.id, Number(productId)));

    const [after] = await db.select({ price: productsTable.price }).from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);

    const event = {
      id: eventId,
      type: "price.updated",
      version: 1,
      timestamp: new Date(),
      aggregateId: `product:${productId}`,
      aggregateType: "product",
      data: { productId, price, beforePrice: before?.price, afterPrice: after?.price, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "update_price", module: "product", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Harga produk ID ${productId} diupdate ke ${price}`, eventIds: [eventId],
      errors: [], warnings: [],
      affectedItems: [{ type: "product", id: Number(productId), before: { price: before?.price }, after: { price: after?.price } }],
      events: [event],
    };
  }
}

class DeactivateProductHandler implements ActionHandler {
  readonly action = "deactivate_product";
  readonly module = "product";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { productId, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-product-${Date.now()}`;

    await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, Number(productId)));

    const event = {
      id: eventId,
      type: "product.deactivated",
      version: 1,
      timestamp: new Date(),
      aggregateId: `product:${productId}`,
      aggregateType: "product",
      data: { productId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "deactivate_product", module: "product", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Produk ID ${productId} dinonaktifkan`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class AddRecipeHandler implements ActionHandler {
  readonly action = "add_recipe";
  readonly module = "product";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { productId, items, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-product-${Date.now()}`;

    await db.transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await tx.insert(recipesTable).values({
            parentType: "product",
            parentId: Number(productId),
            componentType: (item.componentType || "ingredient") as string,
            componentId: Number(item.componentId),
            quantity: String(Number(item.quantity)),
            unit: (item.unit || "pcs") as string,
          });
        }
      }
    });

    const event = {
      id: eventId,
      type: "recipe.created",
      version: 1,
      timestamp: new Date(),
      aggregateId: `product:${productId}`,
      aggregateType: "recipe",
      data: { productId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "add_recipe", module: "product", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Resep untuk produk ID ${productId} berhasil ditambahkan`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerProductHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new AddProductHandler());
  registry.register(new UpdatePriceHandler());
  registry.register(new DeactivateProductHandler());
  registry.register(new AddRecipeHandler());
}
