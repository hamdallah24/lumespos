import { db, warehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createMovement, MOVEMENT_TYPES } from "./movementService";

export interface TransferParams {
  branchId: number;
  sourceWarehouseId: number;
  destWarehouseId: number;
  itemType: string;
  itemId: number;
  quantity: number;
  transferType?: "warehouse" | "branch";
  description?: string;
  createdBy?: number;
}

export interface TransferResult {
  outboundId: number;
  inboundId: number;
  totalCost: number;
  sourceStockAfter: number;
  destStockAfter: number;
}

export async function createTransfer(params: TransferParams): Promise<TransferResult> {
  const isBranchTransfer = params.transferType === "branch";
  const movementType = isBranchTransfer ? MOVEMENT_TYPES.BRANCH_TRANSFER : MOVEMENT_TYPES.WAREHOUSE_TRANSFER;
  const referenceId = Date.now();

  // Step 1: Outbound from source warehouse
  const outbound = await createMovement({
    branchId: params.branchId,
    warehouseId: params.sourceWarehouseId,
    itemType: params.itemType,
    itemId: params.itemId,
    movementType,
    quantity: params.quantity,
    referenceType: isBranchTransfer ? "branch_transfer" : "warehouse_transfer",
    referenceId,
    description: params.description || `Transfer ${movementType}: WH#${params.sourceWarehouseId} → WH#${params.destWarehouseId}`,
    createdBy: params.createdBy,
  });

  const totalCost = outbound.totalCost;
  const unitCost = params.quantity > 0 ? totalCost / params.quantity : 0;

  // Step 2: Inbound to destination warehouse
  const inbound = await createMovement({
    branchId: params.branchId,
    warehouseId: params.destWarehouseId,
    itemType: params.itemType,
    itemId: params.itemId,
    movementType: MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
    quantity: params.quantity,
    unitCost,
    referenceType: isBranchTransfer ? "branch_transfer_in" : "warehouse_transfer_in",
    referenceId,
    description: `Inbound dari transfer WH#${params.sourceWarehouseId} → WH#${params.destWarehouseId}`,
    createdBy: params.createdBy,
  });

  return {
    outboundId: outbound.stockCardId,
    inboundId: inbound.stockCardId,
    totalCost,
    sourceStockAfter: outbound.qtyAfter,
    destStockAfter: inbound.qtyAfter,
  };
}
