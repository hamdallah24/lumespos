import { db, stockCardTable, currentInventoryTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getLastStockCardEntry } from "./stockCardService";
import { createFifoLayer, consumeFifo } from "./fifoCostingService";
import { ensureDefaultWarehouse } from "./warehouseService";
import { publishEvent } from "../events/inventoryEventPublisher";

export const MOVEMENT_TYPES = {
  SUPPLIER_RECEIPT: "supplier_receipt",
  WAREHOUSE_TRANSFER: "warehouse_transfer",
  BRANCH_TRANSFER: "branch_transfer",
  SALES_CONSUMPTION: "sales_consumption",
  RECIPE_CONSUMPTION: "recipe_consumption",
  PRODUCTION_OUTPUT: "production_output",
  MANUAL_ADJUSTMENT: "manual_adjustment",
  STOCK_OPNAME: "stock_opname",
  RETURN_TO_SUPPLIER: "return_to_supplier",
  CUSTOMER_RETURN: "customer_return",
  WASTE_DAMAGE: "waste_damage",
  EXPIRED_GOODS: "expired_goods",
} as const;

type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

const OUTBOUND_TYPES: Set<string> = new Set([
  MOVEMENT_TYPES.SALES_CONSUMPTION,
  MOVEMENT_TYPES.RECIPE_CONSUMPTION,
  MOVEMENT_TYPES.RETURN_TO_SUPPLIER,
  MOVEMENT_TYPES.WASTE_DAMAGE,
  MOVEMENT_TYPES.EXPIRED_GOODS,
  MOVEMENT_TYPES.WAREHOUSE_TRANSFER,
  MOVEMENT_TYPES.BRANCH_TRANSFER,
]);

const INBOUND_TYPES: Set<string> = new Set([
  MOVEMENT_TYPES.SUPPLIER_RECEIPT,
  MOVEMENT_TYPES.PRODUCTION_OUTPUT,
  MOVEMENT_TYPES.CUSTOMER_RETURN,
]);

export interface MovementParams {
  branchId: number;
  warehouseId?: number;
  itemType: string;
  itemId: number;
  movementType: MovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  batchId?: string;
  description?: string;
  createdBy?: number;
  itemName?: string;
}

export interface MovementResult {
  stockCardId: number;
  qtyBefore: number;
  qtyAfter: number;
  valueBefore: number;
  valueAfter: number;
  totalCost: number;
}

export async function createMovement(params: MovementParams): Promise<MovementResult> {
  const direction = OUTBOUND_TYPES.has(params.movementType) ? "out" : "in";
  const qty = Math.abs(params.quantity);
  const warehouseId = params.warehouseId || (await ensureDefaultWarehouse(params.branchId));

  // Resolve item name for event readability
  let itemName = params.itemName;
  if (!itemName) {
    if (params.itemType === "ingredient") {
      const [row] = await db.select({ name: ingredientsTable.name }).from(ingredientsTable).where(eq(ingredientsTable.id, params.itemId));
      itemName = row?.name;
    } else if (params.itemType === "semi_finished") {
      const [row] = await db.select({ name: semiFinishedTable.name }).from(semiFinishedTable).where(eq(semiFinishedTable.id, params.itemId));
      itemName = row?.name;
    }
  }

  return db.transaction(async (tx) => {
    const last = await getLastStockCardEntry(tx, params.branchId, warehouseId, params.itemType, params.itemId);
    let qtyBefore = last?.qtyAfter ?? 0;
    let valueBefore = last?.valueAfter ?? 0;

    if (!last) {
      const [invRow] = await tx
        .select({ stock: currentInventoryTable.currentStock })
        .from(currentInventoryTable)
        .where(
          and(
            eq(currentInventoryTable.branchId, params.branchId),
            eq(currentInventoryTable.warehouseId, warehouseId),
            eq(currentInventoryTable.itemType, params.itemType),
            eq(currentInventoryTable.itemId, params.itemId),
          ),
        );
      if (invRow) {
        qtyBefore = parseFloat(invRow.stock);
      }
    }

    if (direction === "out" && qty > qtyBefore) {
      throw new Error(`Insufficient stock: have ${qtyBefore}, need ${qty}`);
    }

    let totalCost = 0;
    let unitCost = params.unitCost ?? 0;

    if (direction === "out") {
      const fifoResult = await consumeFifo(tx, params.branchId, warehouseId, params.itemType, params.itemId, qty);
      totalCost = fifoResult.totalCost;
      unitCost = totalCost / qty;
    } else if (params.unitCost) {
      unitCost = params.unitCost;
      totalCost = qty * unitCost;
    }

    const qtyChange = direction === "out" ? -qty : qty;
    const valueChange = direction === "out" ? -totalCost : totalCost;
    const qtyAfter = Math.round((qtyBefore + qtyChange) * 10000) / 10000;
    const valueAfter = Math.round((valueBefore + valueChange) * 100) / 100;

    const [cardEntry] = await tx
      .insert(stockCardTable)
      .values({
        branchId: params.branchId,
        warehouseId,
        itemType: params.itemType,
        itemId: params.itemId,
        movementType: params.movementType,
        direction,
        qtyBefore: String(qtyBefore),
        qtyChange: String(qtyChange),
        qtyAfter: String(qtyAfter),
        valueBefore: String(valueBefore),
        valueChange: String(valueChange),
        valueAfter: String(valueAfter),
        unitCost: unitCost > 0 ? String(unitCost) : null,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        batchId: params.batchId,
        description: itemName ? `[${itemName}] ${params.description || params.movementType}` : params.description,
        createdBy: params.createdBy,
      })
      .returning({ id: stockCardTable.id });

    if (direction === "in" && unitCost > 0) {
      await createFifoLayer(tx, params.branchId, warehouseId, params.itemType, params.itemId, qty, unitCost, cardEntry.id);
    }

    await refreshProjectionCache(tx, params.branchId, warehouseId, params.itemType, params.itemId, qtyAfter);

    return { stockCardId: cardEntry.id, qtyBefore, qtyAfter, valueBefore, valueAfter, totalCost };
  }).then(async (result) => {
    await publishEvent({
      movementType: params.movementType,
      branchId: params.branchId,
      warehouseId,
      itemType: params.itemType,
      itemId: params.itemId,
      itemName,
      quantity: qty,
      totalCost: result.totalCost,
      unitCost: result.totalCost / qty,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      stockCardId: result.stockCardId,
      description: params.description,
    });
    return result;
  });
}

async function refreshProjectionCache(
  tx: any,
  branchId: number,
  warehouseId: number,
  itemType: string,
  itemId: number,
  currentStock: number,
): Promise<void> {
  await tx.execute(sql`
    INSERT INTO current_inventory (branch_id, warehouse_id, item_type, item_id, current_stock)
    VALUES (${branchId}, ${warehouseId}, ${itemType}, ${itemId}, ${String(currentStock)})
    ON CONFLICT (branch_id, warehouse_id, item_type, item_id)
    DO UPDATE SET current_stock = ${String(currentStock)}
  `);
}


