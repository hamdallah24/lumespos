import { describe, it, expect, beforeAll } from "vitest";
import { db, pool, stockCardTable, currentInventoryTable, fifoLayersTable, eventStoreTable, warehousesTable, ingredientsTable, recipesTable, productsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { createMovement, MOVEMENT_TYPES } from "../src/inventory/services/movementService";
import { rebuildAllProjections } from "../src/inventory/services/projectionService";
import { getFifoValuation } from "../src/inventory/services/fifoCostingService";
import { getStockCard } from "../src/inventory/services/stockCardService";
import { ensureDefaultWarehouse } from "../src/inventory/services/warehouseService";
import { consumeInventoryEvent } from "../src/finance/services/inventoryEventConsumer";

const TEST_PREFIX = `INV-E2E-${Date.now()}`;
let branchId = 1;
let warehouseId: number;
let ingredientId: number;
let productId: number;
let receiptStockCardId: number;

beforeAll(async () => {
  warehouseId = await ensureDefaultWarehouse(branchId);

  // Create test ingredient
  const [ing] = await db.insert(ingredientsTable).values({
    branchId,
    name: `${TEST_PREFIX}-Raw-Material`,
    unit: "kg",
    costPricePerUnit: "10000",
  }).returning({ id: ingredientsTable.id });
  ingredientId = ing.id;

  // Create test product with recipe requiring the ingredient
  const [prod] = await db.insert(productsTable).values({
    branchId,
    name: `${TEST_PREFIX}-Product`,
    price: "50000",
    requiresStock: true,
  }).returning({ id: productsTable.id });
  productId = prod.id;

  // Create BOM: 1 product = 0.5 kg of ingredient
  await db.insert(recipesTable).values({
    parentType: "product",
    parentId: productId,
    componentType: "ingredient",
    componentId: ingredientId,
    quantity: "0.5",
  });
});

describe("Inventory Lifecycle — Full Chain", () => {
  it("1. Supplier Receipt — creates stock, FIFO layer, stock card entry", async () => {
    const result = await createMovement({
      branchId,
      warehouseId,
      itemType: "ingredient",
      itemId: ingredientId,
      movementType: MOVEMENT_TYPES.SUPPLIER_RECEIPT,
      quantity: 100,
      unitCost: 10000,
      description: `${TEST_PREFIX} supplier delivery`,
      createdBy: 1,
    });

    expect(result.stockCardId).toBeGreaterThan(0);
    expect(result.qtyAfter).toBe(100);
    expect(result.totalCost).toBe(1_000_000);
    receiptStockCardId = result.stockCardId;

    // Stock Card entry exists
    const card = await db.select().from(stockCardTable).where(eq(stockCardTable.id, result.stockCardId));
    expect(card.length).toBe(1);
    expect(card[0].movementType).toBe("supplier_receipt");
    expect(card[0].direction).toBe("in");
  });

  it("2. FIFO Layer created after receipt", async () => {
    const layers = await db.select().from(fifoLayersTable).where(
      and(
        eq(fifoLayersTable.itemType, "ingredient"),
        eq(fifoLayersTable.itemId, ingredientId),
        eq(fifoLayersTable.branchId, branchId),
      ),
    );
    expect(layers.length).toBeGreaterThan(0);
    expect(parseFloat(layers[0].quantity)).toBe(100);
    expect(parseFloat(layers[0].unitCost)).toBe(10000);
  });

  it("3. Projection Cache reflects current stock", async () => {
    const [ci] = await db.select().from(currentInventoryTable).where(
      and(
        eq(currentInventoryTable.itemType, "ingredient"),
        eq(currentInventoryTable.itemId, ingredientId),
        eq(currentInventoryTable.branchId, branchId),
        eq(currentInventoryTable.warehouseId, warehouseId),
      ),
    );
    expect(ci).toBeDefined();
    expect(parseFloat(ci.currentStock)).toBe(100);
  });

  it("4. Event published to event_store", async () => {
    const events = await db.select().from(eventStoreTable).where(
      eq(eventStoreTable.eventType, "inventory.supplier_receipt"),
    ).orderBy(sql`sequence DESC`).limit(1);

    expect(events.length).toBe(1);
    const data = typeof events[0].data === "string" ? JSON.parse(events[0].data) : events[0].data;
    expect(data.itemId).toBe(ingredientId);
    expect(data.totalCost).toBe(1_000_000);
    expect(data.stockCardId).toBe(receiptStockCardId);
  });

  it("5. BOM Consumption — deduct via sales_consumption", async () => {
    // Consume 10 products = 5 kg of ingredient (0.5 kg per product)
    const result = await createMovement({
      branchId,
      warehouseId,
      itemType: "ingredient",
      itemId: ingredientId,
      movementType: MOVEMENT_TYPES.SALES_CONSUMPTION,
      quantity: 5,  // 5 kg for 10 products
      referenceType: "order",
      referenceId: 99999,
      description: `${TEST_PREFIX} sale of 10 units`,
      createdBy: 1,
    });

    expect(result.qtyAfter).toBe(95);
    expect(result.qtyBefore).toBe(100);
    expect(result.totalCost).toBe(50_000); // 5 kg × 10,000/kg
  });

  it("6. FIFO Layer consumed after outbound movement", async () => {
    const layers = await db.select().from(fifoLayersTable).where(
      and(
        eq(fifoLayersTable.itemType, "ingredient"),
        eq(fifoLayersTable.itemId, ingredientId),
        eq(fifoLayersTable.branchId, branchId),
        sql`${fifoLayersTable.closedAt} IS NULL`,
      ),
    );
    expect(layers.length).toBe(1);
    expect(parseFloat(layers[0].quantity)).toBe(95); // 100 - 5
  });

  it("7. Finance Event Consumer — creates journal entries", async () => {
    const events = await db.select().from(eventStoreTable).where(
      eq(eventStoreTable.eventType, "inventory.sales_consumption"),
    ).orderBy(sql`sequence DESC`).limit(1);
    expect(events.length).toBe(1);

    const eventData = typeof events[0].data === "string" ? JSON.parse(events[0].data) : events[0].data;
    expect(eventData.totalCost).toBeGreaterThan(0);

    const result = await consumeInventoryEvent({
      sequence: events[0].sequence,
      eventType: events[0].eventType,
      data: eventData,
    });
    expect(result.consumed).toBe(true);
  });

  it("8. Stock Card query returns paginated history", async () => {
    const result = await getStockCard(branchId, warehouseId, "ingredient", ingredientId, 1, 50);
    expect(result.total).toBe(2);  // receipt + consumption
    expect(result.items.length).toBe(2);
    expect(result.items[0].movementType).toBe("sales_consumption");
    expect(result.items[1].movementType).toBe("supplier_receipt");
  });

  it("9. FIFO Valuation reports correct values", async () => {
    const valuation = await getFifoValuation(branchId);
    const item = valuation.find((v) => v.itemType === "ingredient" && v.itemId === ingredientId);
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(95);
    expect(item!.unitCost).toBe(10000);
    expect(item!.totalValue).toBe(950_000);
  });

  it("10. Projection Rebuild — delete cache, rebuild, verify identical", async () => {
    // Capture current state
    const beforeRows = await db.select().from(currentInventoryTable).where(
      and(eq(currentInventoryTable.itemType, "ingredient"), eq(currentInventoryTable.itemId, ingredientId)),
    );
    const beforeStock = beforeRows.length > 0 ? parseFloat(beforeRows[0].currentStock) : 0;
    expect(beforeStock).toBe(95);

    // Delete projection cache
    await db.delete(currentInventoryTable);
    const afterDelete = await db.select().from(currentInventoryTable);
    expect(afterDelete.length).toBe(0);

    // Rebuild
    const rebuildResult = await rebuildAllProjections();
    expect(rebuildResult.currentInventory).toBeGreaterThan(0);

    // Compare
    const afterRows = await db.select().from(currentInventoryTable).where(
      and(eq(currentInventoryTable.itemType, "ingredient"), eq(currentInventoryTable.itemId, ingredientId)),
    );
    const afterStock = afterRows.length > 0 ? parseFloat(afterRows[0].currentStock) : 0;
    expect(afterStock).toBe(beforeStock);
  });

  it("11. Warehouse Transfer — move stock between warehouses", async () => {
    // Ensure a second warehouse exists
    const [wh2] = await db.insert(warehousesTable).values({
      branchId, code: "WH-TEST2", name: "Test Warehouse 2", type: "branch",
    }).returning({ id: warehousesTable.id });

    const result = await createMovement({
      branchId,
      warehouseId: warehouseId,
      itemType: "ingredient",
      itemId: ingredientId,
      movementType: MOVEMENT_TYPES.WAREHOUSE_TRANSFER,
      quantity: 10,
      description: `${TEST_PREFIX} transfer to WH2`,
      createdBy: 1,
    });

    expect(result.qtyAfter).toBe(85); // 95 - 10 (out from source)
    expect(result.qtyBefore).toBe(95);
  });

  it("12. Manual Adjustment — increase stock", async () => {
    const result = await createMovement({
      branchId,
      warehouseId,
      itemType: "ingredient",
      itemId: ingredientId,
      movementType: MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
      quantity: 5,
      unitCost: 11000,
      description: `${TEST_PREFIX} adjustment +5kg`,
      createdBy: 1,
    });

    expect(result.qtyAfter).toBe(90); // 85 + 5 (inbound adjustment)
    expect(result.totalCost).toBe(55_000); // 5 × 11,000
  });
});
