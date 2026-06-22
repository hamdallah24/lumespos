import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";

const router = Router();

const toSafeNumber = (val: any) => {
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
};

router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    if (branchId && !(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }
    if (!branchId && req.user?.role !== "owner" && req.user?.role !== "manager") {
      return res.status(400).json({ error: "branchId required" });
    }
    const rows = await db
      .select()
      .from(expensesTable)
      .where(branchId ? eq(expensesTable.branchId, branchId) : undefined)
      .orderBy(desc(expensesTable.createdAt));
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /expenses error:", err);
    return res.status(500).json({ error: "Gagal mengambil data pengeluaran" });
  }
});

router.post("/expenses", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, description, amount, category, notes } = req.body;

    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });
    if (!description || String(description).trim() === "") return res.status(400).json({ error: "Deskripsi wajib diisi" });

    const [result] = await db.insert(expensesTable).values({
      branchId: Number(branchId),
      description: String(description).trim(),
      amount: String(toSafeNumber(amount)),
      category: category ? String(category).trim() : null,
      notes: notes ? String(notes).trim() : null,
    }).returning();

    return res.status(201).json(result);
  } catch (err: any) {
    console.error("POST /expenses error:", err);
    if (err.code === "23503") {
      return res.status(400).json({ error: "Branch tidak ditemukan" });
    }
    return res.status(500).json({ error: "Gagal menambah pengeluaran" });
  }
});

router.patch("/expenses/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const { description, amount, category, notes } = req.body;
    const update: Record<string, any> = {};

    if (description !== undefined) update["description"] = String(description).trim();
    if (amount !== undefined) update["amount"] = String(toSafeNumber(amount));
    if (category !== undefined) update["category"] = category ? String(category).trim() : null;
    if (notes !== undefined) update["notes"] = notes ? String(notes).trim() : null;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang diupdate" });
    }

    const [updated] = await db
      .update(expensesTable)
      .set(update)
      .where(eq(expensesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Pengeluaran tidak ditemukan" });
    return res.json(updated);
  } catch (err: any) {
    console.error("PATCH /expenses error:", err);
    return res.status(500).json({ error: "Gagal mengupdate pengeluaran" });
  }
});

router.delete("/expenses/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    const [existing] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id));

    if (!existing) return res.status(404).json({ error: "Pengeluaran tidak ditemukan" });

    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    console.error("DELETE /expenses error:", err);
    if (err.code === "23503") {
      return res.status(409).json({ error: "Pengeluaran tidak bisa dihapus" });
    }
    return res.status(500).json({ error: "Gagal menghapus pengeluaran" });
  }
});

export default router;
