import { Router } from "express";
import { db, productVariantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// GET variants by product
router.get("/products/:productId/variants", requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params["productId"]);
    if (!productId) {
      return res.status(400).json({ error: "productId required" });
    }

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId))
      .orderBy(productVariantsTable.name);

    return res.json(variants);
  } catch (error) {
    console.error("GET variants error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST create variant
router.post("/products/:productId/variants", requireRole("owner", "manager"), async (req, res) => {
  try {
    const productId = Number(req.params["productId"]);
    const { name, price, requiresStock } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId required" });
    }
    if (!name?.trim() || !price) {
      return res.status(400).json({ error: "name and price are required" });
    }

    const [variant] = await db
      .insert(productVariantsTable)
      .values({
        productId,
        name: name.trim(),
        price: String(price),
        requiresStock: requiresStock ?? true,
      })
      .returning();

    return res.status(201).json(variant);
  } catch (error) {
    console.error("POST variant error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH update variant
router.patch("/product-variants/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { name, price, requiresStock } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "id required" });
    }

     const updateData: Record<string, string | boolean> = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (price !== undefined && parseFloat(price) > 0) updateData.price = String(price);
    if (requiresStock !== undefined) updateData.requiresStock = requiresStock;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [variant] = await db
      .update(productVariantsTable)
      .set(updateData)
      .where(eq(productVariantsTable.id, id))
      .returning();

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    return res.json({
      id: variant.id,
      productId: variant.productId,
      name: variant.name,
      price: parseFloat(variant.price),
      requiresStock: variant.requiresStock,
      createdAt: variant.createdAt,
    });
  } catch (error) {
    console.error("PATCH variant error:", error);
    return res.status(500).json({ error: "Gagal memperbarui varian" });
  }
});
// DELETE variant
router.delete("/product-variants/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (!id) {
      return res.status(400).json({ error: "id required" });
    }

    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, id));
    return res.status(204).send();
  } catch (error) {
    console.error("DELETE variant error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;