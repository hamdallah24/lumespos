import { db, currentInventoryTable, stockCardTable, itemsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ItemType = "ingredient" | "semi_finished";

async function getItemId(
  itemName: string,
  branchId: number,
): Promise<{ id: number; type: ItemType } | null> {
  const [item] = await db
    .select({ id: itemsTable.id, type: itemsTable.type })
    .from(itemsTable)
    .where(
      and(
        eq(itemsTable.branchId, branchId),
        sql`LOWER(${itemsTable.name}) = LOWER(${itemName})`,
      ),
    )
    .limit(1);
  if (!item) return null;
  const itemType = item.type === "product" ? "ingredient" : (item.type as ItemType);
  return { id: item.id, type: itemType };
}

async function ensureInventoryRow(
  tx: Executor,
  itemName: string,
  itemId: number,
  itemType: string,
  unit: string,
  branchId: number,
  qty: number,
): Promise<void> {
  const [existing] = await tx
    .select({ id: currentInventoryTable.id, warehouseId: currentInventoryTable.warehouseId })
    .from(currentInventoryTable)
    .where(
      and(
        eq(currentInventoryTable.branchId, branchId),
        eq(currentInventoryTable.itemId, itemId),
        eq(currentInventoryTable.itemType, itemType),
      ),
    )
    .limit(1);

  if (existing) {
    await tx
      .update(currentInventoryTable)
      .set({ currentStock: sql`${currentInventoryTable.currentStock} + ${qty}` })
      .where(eq(currentInventoryTable.id, existing.id));
  } else {
    const defaultWarehouseId = 0;
    await tx.insert(currentInventoryTable).values({
      branchId,
      warehouseId: defaultWarehouseId,
      itemId,
      itemType,
      currentStock: String(qty),
    });
  }
}

async function recordMovement(
  tx: Executor,
  itemName: string,
  qty: number,
  unit: string,
  type: string,
  branchId: number,
  userId: number,
  reference?: string,
): Promise<void> {
  await tx.insert(stockCardTable).values({
    branchId,
    warehouseId: 0,
    itemType: type === "in" || type === "transfer_in" ? "ingredient" : "ingredient",
    itemId: 0,
    movementType: type,
    direction: type.includes("in") ? "in" : "out",
    qtyBefore: "0",
    qtyChange: String(qty),
    qtyAfter: String(qty),
    valueBefore: "0",
    valueChange: "0",
    valueAfter: "0",
    description: `${itemName} ${unit} — ${reference ?? type}`,
    createdBy: userId,
  });
}

class AddStockHandler implements ActionHandler {
  readonly action = "add_stock";
  readonly module = "inventory";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { itemName, qty, unit } = decision.parameters;
    const branchId = decision.branchId;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const existing = await getItemId(itemName as string, branchId);
    const eventId = `evt-stock-${Date.now()}`;

    if (existing) {
      await db.transaction(async (tx) => {
        await ensureInventoryRow(tx, itemName as string, existing.id, existing.type, unit as string, branchId, Number(qty));
        await recordMovement(tx, itemName as string, Number(qty), unit as string, "in", branchId, userId, `add_stock:${execId}`);
      });
    }

    const event = {
      id: eventId,
      type: "stock.added",
      version: 1,
      timestamp: new Date(),
      aggregateId: `branch:${branchId}`,
      aggregateType: "inventory",
      data: { itemName, qty: Number(qty), unit, branchId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "add_stock", module: "inventory", actor: decision.executive,
      branchId, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Stok ${itemName} ditambahkan ${qty} ${unit}`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class ReduceStockHandler implements ActionHandler {
  readonly action = "reduce_stock";
  readonly module = "inventory";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { itemName, qty, unit } = decision.parameters;
    const branchId = decision.branchId;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const existing = await getItemId(itemName as string, branchId);
    if (!existing) {
      return { success: false, decisionId: decision.decisionId, executionId: execId,
        action: "reduce_stock", module: "inventory", actor: decision.executive,
        branchId, userId, timestamp: new Date().toISOString(), durationMs: 0,
        message: `Item ${itemName} tidak ditemukan`, eventIds: [], errors: [`Item ${itemName} tidak ditemukan`], warnings: [] };
    }

    const eventId = `evt-stock-${Date.now()}`;
    await db.transaction(async (tx) => {
      await ensureInventoryRow(tx, itemName as string, existing.id, existing.type, unit as string, branchId, -Number(qty));
      await recordMovement(tx, itemName as string, Number(qty), unit as string, "out", branchId, userId, `reduce_stock:${execId}`);
    });

    const event = {
      id: eventId,
      type: "stock.reduced",
      version: 1,
      timestamp: new Date(),
      aggregateId: `branch:${branchId}`,
      aggregateType: "inventory",
      data: { itemName, qty: Number(qty), unit, branchId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "reduce_stock", module: "inventory", actor: decision.executive,
      branchId, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Stok ${itemName} dikurangi ${qty} ${unit}`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class CorrectStockHandler implements ActionHandler {
  readonly action = "correct_stock";
  readonly module = "inventory";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { itemName, qty, unit } = decision.parameters;
    const branchId = decision.branchId;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-stock-${Date.now()}`;

    await db.transaction(async (tx) => {
      await tx
        .update(currentInventoryTable)
        .set({ currentStock: String(qty) })
        .where(
          and(
            eq(currentInventoryTable.branchId, branchId),
            sql`LOWER(${currentInventoryTable.itemName}) = LOWER(${itemName as string})`,
          ),
        );
      await recordMovement(tx, itemName as string, Number(qty), unit as string, "adjust", branchId, userId, `correct_stock:${execId}`);
    });

    const event = {
      id: eventId,
      type: "stock.corrected",
      version: 1,
      timestamp: new Date(),
      aggregateId: `branch:${branchId}`,
      aggregateType: "inventory",
      data: { itemName, qty: Number(qty), unit, branchId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "correct_stock", module: "inventory", actor: decision.executive,
      branchId, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Stok ${itemName} dikoreksi ke ${qty} ${unit}`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class LossCorrectionHandler implements ActionHandler {
  readonly action = "loss_correction";
  readonly module = "inventory";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { itemName, qty, unit, reason } = decision.parameters;
    const branchId = decision.branchId;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-stock-${Date.now()}`;

    await db.transaction(async (tx) => {
      await tx
        .update(currentInventoryTable)
        .set({ currentStock: sql`${currentInventoryTable.currentStock} - ${Number(qty)}` })
        .where(
          and(
            eq(currentInventoryTable.branchId, branchId),
            sql`LOWER(${currentInventoryTable.itemName}) = LOWER(${itemName as string})`,
          ),
        );
      await recordMovement(tx, itemName as string, Number(qty), unit as string, "loss", branchId, userId, `loss:${reason}:${execId}`);
    });

    const event = {
      id: eventId,
      type: "stock.loss_corrected",
      version: 1,
      timestamp: new Date(),
      aggregateId: `branch:${branchId}`,
      aggregateType: "inventory",
      data: { itemName, qty: Number(qty), unit, reason, branchId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "loss_correction", module: "inventory", actor: decision.executive,
      branchId, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Loss correction: ${itemName} -${qty} ${unit} (${reason})`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

class TransferStockHandler implements ActionHandler {
  readonly action = "transfer_stock";
  readonly module = "inventory";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    const { fromBranchId, toBranchId } = decision.parameters;
    if (fromBranchId === toBranchId) {
      return { valid: false, error: "Source and destination branch must be different" };
    }
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { itemName, qty, unit, fromBranchId, toBranchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-stock-${Date.now()}`;

    await db.transaction(async (tx) => {
      await tx
        .update(currentInventoryTable)
        .set({ currentStock: sql`${currentInventoryTable.currentStock} - ${Number(qty)}` })
        .where(
          and(
            eq(currentInventoryTable.branchId, Number(fromBranchId)),
            sql`LOWER(${currentInventoryTable.itemName}) = LOWER(${itemName as string})`,
          ),
        );
      await tx
        .update(currentInventoryTable)
        .set({ currentStock: sql`${currentInventoryTable.currentStock} + ${Number(qty)}` })
        .where(
          and(
            eq(currentInventoryTable.branchId, Number(toBranchId)),
            sql`LOWER(${currentInventoryTable.itemName}) = LOWER(${itemName as string})`,
          ),
        );
      await recordMovement(tx, itemName as string, Number(qty), unit as string, "transfer_out", Number(fromBranchId), userId, `transfer:${toBranchId}:${execId}`);
      await recordMovement(tx, itemName as string, Number(qty), unit as string, "transfer_in", Number(toBranchId), userId, `transfer:${fromBranchId}:${execId}`);
    });

    const event = {
      id: eventId,
      type: "stock.transferred",
      version: 1,
      timestamp: new Date(),
      aggregateId: `branch:${fromBranchId}`,
      aggregateType: "inventory",
      data: { itemName, qty: Number(qty), unit, fromBranchId, toBranchId, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "transfer_stock", module: "inventory", actor: decision.executive,
      branchId: Number(fromBranchId), userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Transfer ${itemName} ${qty} ${unit} dari branch ${fromBranchId} ke ${toBranchId}`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerStockHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new AddStockHandler());
  registry.register(new ReduceStockHandler());
  registry.register(new CorrectStockHandler());
  registry.register(new LossCorrectionHandler());
  registry.register(new TransferStockHandler());
}
