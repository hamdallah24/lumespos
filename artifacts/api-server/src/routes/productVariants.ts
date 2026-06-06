import { Router } from "express";
import { db, productVariantsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/products/:id/variants", requireAuth, async (req, res) => {
  const productId = Number(req.params["id"]);
  const rows = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId))
    .orderBy(asc(productVariantsTable.sortOrder));
  res.json(
    rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      name: r.name,
      price: parseFloat(r.price),
      sortOrder: r.sortOrder,
    })),
  );
});

router.post("/products/:id/variants", requireRole("owner", "manager"), async (req, res) => {
  const productId = Number(req.params["id"]);
  const { name, price, sortOrder } = req.body as {
    name: string;
    price: number;
    sortOrder?: number;
  };
  if (!name?.trim() || price == null) {
    res.status(400).json({ error: "name and price are required" });
    return;
  }
  const [created] = await db
    .insert(productVariantsTable)
    .values({
      productId,
      name: name.trim(),
      price: String(price),
      sortOrder: sortOrder ?? 0,
    })
    .returning();
  res.status(201).json({
    ...created,
    price: parseFloat(created.price),
  });
});

router.patch("/variants/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, price, sortOrder } = req.body as {
    name?: string;
    price?: number;
    sortOrder?: number;
  };
  const update: Record<string, unknown> = {};
  if (name !== undefined) update["name"] = name.trim();
  if (price !== undefined) update["price"] = String(price);
  if (sortOrder !== undefined) update["sortOrder"] = sortOrder;
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(productVariantsTable)
    .set(update)
    .where(eq(productVariantsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    ...updated,
    price: parseFloat(updated.price),
  });
});

router.delete("/variants/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(productVariantsTable).where(eq(productVariantsTable.id, id));
  res.status(204).send();
});

export default router;
