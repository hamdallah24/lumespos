import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { getStockCard } from "../services/stockCardService";
import { db, ingredientsTable, semiFinishedTable, productsTable } from "@workspace/db";
import { eq, like, and, isNull, sql } from "drizzle-orm";

const router = Router();

router.get("/inventory/stock-card/items/search", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : 1;
    const q = String(req.query["q"] || "").trim();
    const limit = Math.min(Number(req.query["limit"]) || 20, 50);
    if (!q || q.length < 2) return res.json([]);

    const pattern = `%${q}%`;

    const [ingredients, semiFinished, products] = await Promise.all([
      db
        .select({ itemType: sql<string>`'ingredient'`, itemId: ingredientsTable.id, itemName: ingredientsTable.name, unit: ingredientsTable.unit })
        .from(ingredientsTable)
        .where(and(eq(ingredientsTable.branchId, branchId), like(ingredientsTable.name, pattern)))
        .limit(limit),
      db
        .select({ itemType: sql<string>`'semi_finished'`, itemId: semiFinishedTable.id, itemName: semiFinishedTable.name, unit: semiFinishedTable.unit })
        .from(semiFinishedTable)
        .where(and(eq(semiFinishedTable.branchId, branchId), like(semiFinishedTable.name, pattern)))
        .limit(limit),
      db
        .select({ itemType: sql<string>`'product'`, itemId: productsTable.id, itemName: productsTable.name, unit: sql<string>`'pcs'` })
        .from(productsTable)
        .where(and(eq(productsTable.branchId, branchId), isNull(productsTable.deletedAt), like(productsTable.name, pattern)))
        .limit(limit),
    ]);

    const results = [...ingredients, ...semiFinished, ...products].slice(0, limit);
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/stock-card/:itemType/:itemId", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const warehouseId = req.query["warehouseId"] ? Number(req.query["warehouseId"]) : undefined;
    const page = req.query["page"] ? Number(req.query["page"]) : 1;
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 50;

    if (!branchId || !warehouseId) {
      return res.status(400).json({ error: "branchId and warehouseId required" });
    }

    const itemType = String(req.params["itemType"]);
    const itemId = Number(req.params["itemId"]);

    const result = await getStockCard(branchId, warehouseId, itemType, itemId, page, limit);
    const totalPages = Math.ceil(result.total / limit);
    return res.json({ ...result, totalPages, page });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
