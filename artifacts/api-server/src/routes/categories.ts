import { Router } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/categories", async (req, res) => {
  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      productCount: count(productsTable.id),
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id, categoriesTable.name);
  res.json(cats);
});

router.post("/categories", async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({ name: name.trim() }).returning();
  res.status(201).json({ ...cat, productCount: 0 });
});

router.patch("/categories/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const { name } = req.body as { name?: string };
  const update: Partial<{ name: string }> = {};
  if (name !== undefined) update.name = name.trim();
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [cat] = await db.update(categoriesTable).set(update).where(eq(categoriesTable.id, id)).returning();
  if (!cat) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [{ productCount }] = await db
    .select({ productCount: count(productsTable.id) })
    .from(productsTable)
    .where(eq(productsTable.categoryId, id));
  res.json({ ...cat, productCount });
});

router.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
