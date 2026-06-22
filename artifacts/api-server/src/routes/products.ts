import { Router } from "express";
import { db, productsTable, categoriesTable, semiFinishedTable, currentInventoryTable, recipesTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth, requireBranchAccess, requireRole, canAccessBranch } from "../middlewares/requireAuth";

const router = Router();

// Helper: ambil stok produk dari setengah jadi (yang paling membatasi)
async function getProductStock(productId: number, branchId: number): Promise<number> {
  // Ambil semua komponen setengah jadi dari resep produk
  const recipeRows = await db
    .select({
      componentId: recipesTable.componentId,
      quantity: recipesTable.quantity,
    })
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.parentType, "product"),
        eq(recipesTable.parentId, productId),
        eq(recipesTable.componentType, "semi_finished")
      )
    );

  if (recipeRows.length === 0) return 0;

  let maxPossible = Infinity;
  for (const row of recipeRows) {
    // Konversi quantity ke number (fix error #1)
    const quantity = typeof row.quantity === 'string' ? parseFloat(row.quantity) : Number(row.quantity);
    
    // Ambil stok setengah jadi
    const stockRow = await db
      .select({
        currentStock: currentInventoryTable.currentStock,
      })
      .from(currentInventoryTable)
      .where(
        and(
          eq(currentInventoryTable.itemType, "semi_finished"),
          eq(currentInventoryTable.itemId, row.componentId),
          eq(currentInventoryTable.branchId, branchId)
        )
      )
      .limit(1);

    const stock = stockRow.length > 0 ? parseFloat(stockRow[0].currentStock) : 0;
    const possible = Math.floor(stock / quantity);
    maxPossible = Math.min(maxPossible, possible);
  }

  return maxPossible === Infinity ? 0 : maxPossible;
}

// Helper: hitung HPP produk dari setengah jadi
async function getProductCost(productId: number, branchId: number): Promise<number> {
  const recipeRows = await db
    .select({
      componentId: recipesTable.componentId,
      quantity: recipesTable.quantity,
    })
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.parentType, "product"),
        eq(recipesTable.parentId, productId),
        eq(recipesTable.componentType, "semi_finished")
      )
    );

  let totalCost = 0;
  for (const row of recipeRows) {
    // Konversi quantity ke number (fix error #1)
    const quantity = typeof row.quantity === 'string' ? parseFloat(row.quantity) : Number(row.quantity);
    
    const sf = await db
      .select({
        costPricePerUnit: semiFinishedTable.costPricePerUnit,
      })
      .from(semiFinishedTable)
      .where(eq(semiFinishedTable.id, row.componentId))
      .limit(1);

    const costPerUnit = sf.length > 0 ? parseFloat(sf[0].costPricePerUnit) : 0;
    totalCost += costPerUnit * quantity;
  }

  return totalCost;
}

// GET /products
router.get("/products", requireAuth, requireBranchAccess((req) => Number(req.query.branchId)), async (req, res) => {
  // Pastikan ada return di semua code path (fix error #2)
  try {
    const branchId = Number(req.query.branchId);
    const { categoryId, search, active } = req.query as {
      categoryId?: string;
      search?: string;
      active?: string;
    };

    if (!branchId) {
      return res.status(400).json({ error: "branchId required" });
    }

    // Build kondisi WHERE
    const conditions: any[] = [eq(productsTable.branchId, branchId)];
    if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
    if (active !== undefined) conditions.push(eq(productsTable.isActive, active === "true"));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        categoryId: productsTable.categoryId,
        price: productsTable.price,
        imageUrl: productsTable.imageUrl,
        isActive: productsTable.isActive,
        categoryName: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(...conditions));

    // Hitung stok & HPP untuk setiap produk
    const productsWithStock = await Promise.all(
      rows.map(async (row) => {
        const stock = await getProductStock(row.id, branchId);
        const costPrice = await getProductCost(row.id, branchId);
        return {
          id: row.id,
          name: row.name,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          price: parseFloat(row.price),
          costPrice,
          stock,
          imageUrl: row.imageUrl,
          isActive: row.isActive,
        };
      })
    );

    return res.json(productsWithStock);
  } catch (error) {
    console.error("GET /products error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /products/:id
router.get("/products/:id", requireAuth, requireBranchAccess((req) => Number(req.query.branchId)), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const branchId = Number(req.query.branchId);

    if (!branchId) {
      return res.status(400).json({ error: "branchId required" });
    }

    const [row] = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        categoryId: productsTable.categoryId,
        price: productsTable.price,
        imageUrl: productsTable.imageUrl,
        isActive: productsTable.isActive,
        categoryName: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(eq(productsTable.id, id), eq(productsTable.branchId, branchId)));

    if (!row) {
      return res.status(404).json({ error: "Product not found" });
    }

    const stock = await getProductStock(id, branchId);
    const costPrice = await getProductCost(id, branchId);

    return res.json({
      id: row.id,
      name: row.name,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      price: parseFloat(row.price),
      costPrice,
      stock,
      imageUrl: row.imageUrl,
      isActive: row.isActive,
    });
  } catch (error) {
    console.error("GET /products/:id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products
router.post("/products", requireRole("owner", "manager"), requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, name, categoryId, price, imageUrl, isActive } = req.body as {
      branchId: number;
      name: string;
      categoryId?: number | null;
      price: number;
      imageUrl?: string | null;
      isActive?: boolean;
    };

    if (!branchId) {
      return res.status(400).json({ error: "branchId required" });
    }
    if (!name?.trim() || price == null || price <= 0) {
      return res.status(400).json({ error: "name and valid price are required" });
    }

    // Gunakan kolom yang sesuai dengan schema (tanpa branchId jika schema belum update)
    // Catatan: Jika schema sudah ditambahkan branchId, gunakan kode di bawah
    const [prod] = await db
      .insert(productsTable)
      .values({
        branchId, // Pastikan branchId disertakan jika sudah ada di schema
        name: name.trim(),
        categoryId: categoryId ?? null,
        price: String(price),
        imageUrl: imageUrl ?? null,
        isActive: isActive ?? true,
      }) // Temporary: gunakan as any sampai schema diupdate
      .returning();

    return res.status(201).json({
      id: prod.id,
      name: prod.name,
      categoryId: prod.categoryId,
      price: parseFloat(prod.price),
      imageUrl: prod.imageUrl,
      isActive: prod.isActive,
      stock: 0,
      costPrice: 0,
    });
  } catch (error) {
    console.error("POST /products error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /products/:id
router.patch("/products/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);

    // Fetch product first to check branch access
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (!(await canAccessBranch(req, existing.branchId!))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    const { name, categoryId, price, imageUrl, isActive } = req.body as {
      name?: string;
      categoryId?: number | null;
      price?: number;
      imageUrl?: string | null;
      isActive?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (name !== undefined) update["name"] = name.trim();
    if (categoryId !== undefined) update["categoryId"] = categoryId;
    if (price !== undefined) update["price"] = String(price);
    if (imageUrl !== undefined) update["imageUrl"] = imageUrl;
    if (isActive !== undefined) update["isActive"] = isActive;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [prod] = await db
      .update(productsTable)
      .set(update as any) // Temporary: gunakan as any sampai schema diupdate
      .where(eq(productsTable.id, id))
      .returning();

    if (!prod) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({
      id: prod.id,
      name: prod.name,
      categoryId: prod.categoryId,
      price: parseFloat(prod.price),
      imageUrl: prod.imageUrl,
      isActive: prod.isActive,
    });
  } catch (error) {
    console.error("PATCH /products/:id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /products/:id
router.delete("/products/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);

    // Fetch product first to check branch access
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (!(await canAccessBranch(req, existing.branchId!))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    await db.delete(productsTable).where(eq(productsTable.id, id));
    return res.status(204).send();
  } catch (error) {
    console.error("DELETE /products/:id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
