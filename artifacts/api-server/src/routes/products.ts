import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router = Router();

const toProduct = (row: {
  id: number;
  name: string;
  categoryId: number | null;
  price: string;
  costPrice: string;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
}) => ({
  id: row.id,
  name: row.name,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  price: parseFloat(row.price),
  costPrice: parseFloat(row.costPrice),
  stock: row.stock,
  imageUrl: row.imageUrl,
  isActive: row.isActive,
});

router.get("/products", async (req, res) => {
  const { categoryId, search, active } = req.query as {
    categoryId?: string;
    search?: string;
    active?: string;
  };

  const conditions: SQL[] = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  if (active !== undefined) conditions.push(eq(productsTable.isActive, active === "true"));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      categoryId: productsTable.categoryId,
      price: productsTable.price,
      costPrice: productsTable.costPrice,
      stock: productsTable.stock,
      imageUrl: productsTable.imageUrl,
      isActive: productsTable.isActive,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(conditions.length ? and(...conditions) : undefined);

  res.json(rows.map(toProduct));
});

router.post("/products", async (req, res) => {
  const { name, categoryId, price, costPrice, stock, imageUrl, isActive } = req.body as {
    name: string;
    categoryId?: number | null;
    price: number;
    costPrice?: number;
    stock?: number;
    imageUrl?: string | null;
    isActive?: boolean;
  };
  if (!name?.trim() || price == null) {
    res.status(400).json({ error: "name and price are required" });
    return;
  }
  const [prod] = await db
    .insert(productsTable)
    .values({
      name: name.trim(),
      categoryId: categoryId ?? null,
      price: String(price),
      costPrice: costPrice != null ? String(costPrice) : "0",
      stock: stock ?? 0,
      imageUrl: imageUrl ?? null,
      isActive: isActive ?? true,
    })
    .returning();

  let categoryName: string | null = null;
  if (prod.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, prod.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.status(201).json(toProduct({ ...prod, categoryName }));
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      categoryId: productsTable.categoryId,
      price: productsTable.price,
      costPrice: productsTable.costPrice,
      stock: productsTable.stock,
      imageUrl: productsTable.imageUrl,
      isActive: productsTable.isActive,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toProduct(row));
});

router.patch("/products/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, categoryId, price, costPrice, stock, imageUrl, isActive } = req.body as {
    name?: string;
    categoryId?: number | null;
    price?: number;
    costPrice?: number;
    stock?: number;
    imageUrl?: string | null;
    isActive?: boolean;
  };
  const update: Record<string, unknown> = {};
  if (name !== undefined) update["name"] = name.trim();
  if (categoryId !== undefined) update["categoryId"] = categoryId;
  if (price !== undefined) update["price"] = String(price);
  if (costPrice !== undefined) update["costPrice"] = String(costPrice);
  if (stock !== undefined) update["stock"] = stock;
  if (imageUrl !== undefined) update["imageUrl"] = imageUrl;
  if (isActive !== undefined) update["isActive"] = isActive;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [prod] = await db.update(productsTable).set(update).where(eq(productsTable.id, id)).returning();
  if (!prod) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  let categoryName: string | null = null;
  if (prod.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, prod.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.json(toProduct({ ...prod, categoryName }));
});

router.delete("/products/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).send();
});

export default router;
