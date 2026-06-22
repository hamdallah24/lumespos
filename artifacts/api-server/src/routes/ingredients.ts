import { Router } from "express";
import { db, ingredientsTable, currentInventoryTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";

const router = Router();

const toSafeNumber = (val: any) => {
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
};

const getWithStock = async (branchId?: number) => {
  return db
    .select({
      id: ingredientsTable.id,
      branchId: ingredientsTable.branchId,
      name: ingredientsTable.name,
      unit: ingredientsTable.unit,
      costPricePerUnit: ingredientsTable.costPricePerUnit,
      minimalStock: ingredientsTable.minimalStock,
      trackInShift: ingredientsTable.trackInShift,
      currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
    })
    .from(ingredientsTable)
    .leftJoin(
      currentInventoryTable,
      and(
        eq(currentInventoryTable.itemType, sql`'ingredient'`),
        eq(currentInventoryTable.itemId, ingredientsTable.id),
        eq(currentInventoryTable.branchId, ingredientsTable.branchId),
      ),
    )
    .where(branchId ? eq(ingredientsTable.branchId, branchId) : undefined)
    .orderBy(ingredientsTable.name);
};

const formatRow = (r: any) => ({
  id: r.id,
  branchId: r.branchId,
  name: r.name,
  unit: r.unit,
  costPricePerUnit: parseFloat(r.costPricePerUnit),
  minimalStock: parseFloat(r.minimalStock),
  trackInShift: r.trackInShift,
  currentStock: parseFloat(r.currentStock),
});

// GET /ingredients
router.get("/ingredients", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    if (branchId && !(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }
    if (!branchId && req.user?.role !== "owner" && req.user?.role !== "manager") {
      return res.status(400).json({ error: "branchId required" });
    }
    const rows = await getWithStock(branchId);
    return res.json(rows.map(formatRow));
  } catch (err: any) {
    console.error("GET /ingredients error:", err);
    return res.status(500).json({ error: "Gagal mengambil data bahan baku" });
  }
});

// POST /ingredients
router.post("/ingredients", requireRole("owner", "manager"), requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, name, unit, costPricePerUnit, minimalStock, trackInShift } = req.body;

    // Validasi input
    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });
    if (!name || String(name).trim() === "") return res.status(400).json({ error: "Nama bahan baku wajib diisi" });
    if (!unit || String(unit).trim() === "") return res.status(400).json({ error: "Satuan wajib diisi" });

    const [result] = await db.insert(ingredientsTable).values({
      branchId: Number(branchId),
      name: String(name).trim(),
      unit: String(unit).trim(),
      costPricePerUnit: String(toSafeNumber(costPricePerUnit)),
      minimalStock: String(toSafeNumber(minimalStock)),
      trackInShift: trackInShift !== undefined ? trackInShift : true,
    }).returning();

    return res.status(201).json(formatRow({ ...result, currentStock: "0" }));
  } catch (err: any) {
    console.error("POST /ingredients error:", err);
    if (err.code === "23503") {
      return res.status(400).json({ error: "Branch tidak ditemukan" });
    }
    if (err.code === "23505") {
      return res.status(409).json({ error: "Bahan baku sudah ada" });
    }
    return res.status(500).json({ error: "Gagal menambah bahan baku" });
  }
});

// PATCH /ingredients/:id
router.patch("/ingredients/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const { name, unit, costPricePerUnit, minimalStock, trackInShift } = req.body;
    const update: Record<string, any> = {};

    if (name !== undefined) update["name"] = String(name).trim();
    if (unit !== undefined) update["unit"] = String(unit).trim();
    if (costPricePerUnit !== undefined) update["costPricePerUnit"] = String(toSafeNumber(costPricePerUnit));
    if (minimalStock !== undefined) update["minimalStock"] = String(toSafeNumber(minimalStock));
    if (trackInShift !== undefined) update["trackInShift"] = trackInShift;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang diupdate" });
    }

    const [updated] = await db
      .update(ingredientsTable)
      .set(update)
      .where(eq(ingredientsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Bahan baku tidak ditemukan" });

    // Ambil currentStock dari DB setelah update
    const rows = await getWithStock(updated.branchId);
    const fresh = rows.find((r) => r.id === id);

    return res.json(formatRow(fresh ?? { ...updated, currentStock: "0" }));
  } catch (err: any) {
    console.error("PATCH /ingredients error:", err);
    return res.status(500).json({ error: "Gagal mengupdate bahan baku" });
  }
});

// DELETE /ingredients/:id
router.delete("/ingredients/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const [existing] = await db
      .select()
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Bahan baku tidak ditemukan" });

    await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    console.error("DELETE /ingredients error:", err);
    if (err.code === "23503") {
      return res.status(409).json({ error: "Bahan baku tidak bisa dihapus karena masih digunakan di resep" });
    }
    return res.status(500).json({ error: "Gagal menghapus bahan baku" });
  }
});

export default router
