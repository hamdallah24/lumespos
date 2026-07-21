import { describe, it, expect, beforeAll } from "vitest";
import { db, suppliersTable, purchaseOrdersTable, purchaseOrderItemsTable, goodsReceiptsTable, goodsReceiptItemsTable, supplierInvoicesTable, purchaseEventsTable, branchesTable, warehousesTable, ingredientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createSupplier } from "../src/purchasing/services/supplierService";
import { createPurchaseOrder, transitionPoStatus, getPurchaseOrders } from "../src/purchasing/services/poService";
import { createGoodsReceipt } from "../src/purchasing/services/receiptService";
import { createInvoice, approveInvoice, getInvoices } from "../src/purchasing/services/invoiceService";
import { runPurchasingValidation } from "../src/purchasing/services/validationEngine";
import { getPurchasingDashboard } from "../src/purchasing/services/dashboardService";
import { getStockCard } from "../src/inventory/services/stockCardService";

const PREFIX = `PUR-E2E-${Date.now()}`;
let branchId: number, warehouseId: number, supId: number, ingId: number, poId: number, invId: number;

beforeAll(async () => {
  const [b] = await db.insert(branchesTable).values({ name: `${PREFIX}-B` }).returning({ id: branchesTable.id });
  branchId = b.id;
  const [w] = await db.insert(warehousesTable).values({ branchId, code: `WH-${PREFIX}`, name: `${PREFIX} WH`, type: "branch" }).returning({ id: warehousesTable.id });
  warehouseId = w.id;
  const [ig] = await db.insert(ingredientsTable).values({ branchId, name: `${PREFIX}-Item`, unit: "kg", costPricePerUnit: "5000" }).returning({ id: ingredientsTable.id });
  ingId = ig.id;
});

describe("Purchasing Full Lifecycle", () => {
  it("1. Create Supplier", async () => {
    const s = await createSupplier({ name: `${PREFIX} Supplier`, paymentTerms: "NET30" });
    expect(s.code).toBeTruthy();
    supId = s.id;
  });

  it("2. Create Purchase Order", async () => {
    const po = await createPurchaseOrder({
      supplierId: supId, branchId, orderDate: new Date().toISOString().split("T")[0],
      items: [{ itemType: "ingredient", itemId: ingId, quantityOrdered: 100, unitCost: 5000 }],
    });
    expect(po.status).toBe("draft");
    poId = po.id;
  });

  it("3. Submit PO", async () => {
    const po = await transitionPoStatus(poId, "submitted");
    expect(po.status).toBe("submitted");
  });

  it("4. Approve PO", async () => {
    const po = await transitionPoStatus(poId, "approved");
    expect(po.status).toBe("approved");
  });

  it("5. Send PO", async () => {
    const po = await transitionPoStatus(poId, "sent");
    expect(po.status).toBe("sent");
  });

  it("6. Goods Receipt — triggers Inventory movement", async () => {
    const gr = await createGoodsReceipt({
      poId, branchId, warehouseId,
      receivedDate: new Date().toISOString().split("T")[0],
    });
    expect(gr.grNumber).toBeTruthy();
    expect(gr.items.length).toBe(1);

    // Verify PO status updated to completed
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
    expect(po.status).toBe("completed");

    // Verify Inventory stock card was created
    const sc = await getStockCard(branchId, warehouseId, "ingredient", ingId, 1, 10);
    expect(sc.total).toBeGreaterThan(0);
    expect(sc.items[0].movementType).toBe("supplier_receipt");
  });

  it("7. Create Supplier Invoice with three-way match", async () => {
    const inv = await createInvoice({
      invoiceNumber: `${PREFIX}-INV-001`, supplierId: supId, poId,
      invoiceDate: new Date().toISOString().split("T")[0],
      totalAmount: 500000, // 100 kg × 5000
    });
    expect(inv.threeWayMatch.status).toBe("passed");
    invId = inv.id;
  });

  it("8. Approve Invoice — publishes Finance event", async () => {
    const inv = await approveInvoice(invId);
    expect(inv.status).toBe("approved");

    // Verify purchase event created
    const [evt] = await db.select().from(purchaseEventsTable)
      .where(eq(purchaseEventsTable.eventType, "invoice.approved")).orderBy(sql`id DESC`).limit(1);
    expect(evt).toBeDefined();
  });

  it("9. Invalid transition rejected", async () => {
    await expect(transitionPoStatus(poId, "draft")).rejects.toThrow("Invalid PO transition");
  });

  it("10. Validation Engine runs", async () => {
    const report = await runPurchasingValidation();
    expect(report.totalChecks).toBeGreaterThan(0);
    expect(typeof report.overallScore).toBe("number");
  });

  it("11. Dashboard returns procurement metrics", async () => {
    const dash = await getPurchasingDashboard();
    expect(typeof dash.openPOs).toBe("number");
    expect(typeof dash.procurementValue).toBe("number");
    expect(typeof dash.validationScore).toBe("number");
  });

  it("12. Full PO list returns with items", async () => {
    const pos = await getPurchaseOrders(branchId);
    expect(pos.length).toBeGreaterThanOrEqual(1);
    expect(pos[0].items).toBeDefined();
  });

  it("13. Invoice list returns with status", async () => {
    const invs = await getInvoices(poId);
    expect(invs.length).toBeGreaterThanOrEqual(1);
    expect(invs[0].threeWayMatchStatus).toBe("passed");
  });

  it("14. Event Verification", async () => {
    const events = await db.select().from(purchaseEventsTable).orderBy(sql`id ASC`);
    const eventTypes = events.map(e => e.eventType);
    expect(eventTypes).toContain("supplier.created");
    expect(eventTypes).toContain("po.created");
    expect(eventTypes).toContain("po.approved");
    expect(eventTypes).toContain("goods.received");
    expect(eventTypes).toContain("invoice.created");
    expect(eventTypes).toContain("invoice.approved");
  });
});
