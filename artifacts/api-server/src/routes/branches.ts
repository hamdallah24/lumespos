import { Router } from "express";
import {
  db,
  branchesTable,
  userBranchesTable,
  employeesTable,
  ordersTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/branches", requireAuth, async (req, res) => {
  const user = req.user!;

  // Owner & Manager lihat semua cabang
  if (user.role === "owner" || user.role === "manager") {
    const rows = await db
      .select()
      .from(branchesTable)
      .orderBy(branchesTable.id);

    return res.json(rows);
  }

  const mappings = await db
    .select({
      branchId: userBranchesTable.branchId,
    })
    .from(userBranchesTable)
    .where(eq(userBranchesTable.userId, user.id));

  const branchIds = mappings.map((m) => m.branchId);

  // fallback sistem lama
  if (branchIds.length === 0 && user.branchId) {
    const rows = await db
      .select()
      .from(branchesTable)
      .where(eq(branchesTable.id, user.branchId));

    return res.json(rows);
  }

  if (branchIds.length === 0) {
    return res.json([]);
  }

  const rows = await db
    .select()
    .from(branchesTable)
    .where(inArray(branchesTable.id, branchIds));

  return res.json(rows);
});

router.post("/branches", requireAuth, requireRole("owner", "manager"), async (req, res) => {
  const { name, location } = req.body as { name?: string; location?: string | null };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [branch] = await db
    .insert(branchesTable)
    .values({ name: name.trim(), location: location ?? null })
    .returning();
  res.status(201).json(branch);
});

router.patch("/branches/:id", requireAuth, requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { name, location } = req.body as { name?: string; location?: string | null };

    const update: Record<string, any> = {};
    if (name !== undefined) update["name"] = name.trim();
    if (location !== undefined) update["location"] = location || null;

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "Tidak ada field yang diupdate" });
      return;
    }

    const { eq } = await import("drizzle-orm");
    const [updated] = await db
      .update(branchesTable)
      .set(update)
      .where(eq(branchesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cabang tidak ditemukan" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("PATCH /branches/:id error:", err);
    res.status(500).json({ error: "Gagal mengupdate cabang" });
  }
});

router.delete("/branches/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);

    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
    if (!branch) return res.status(404).json({ error: "Cabang tidak ditemukan" });

    const [empResult] = await db.select({ count: sql<string>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.branchId, id));
    const empCount = parseInt(empResult?.count || "0");
    const [orderResult] = await db.select({ count: sql<string>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.branchId, id));
    const orderCount = parseInt(orderResult?.count || "0");

    const deps: string[] = [];
    if (empCount > 0) deps.push(`${empCount} karyawan`);
    if (orderCount > 0) deps.push(`${orderCount} pesanan`);

    if (deps.length > 0) {
      return res.status(400).json({
        error: `Tidak bisa hapus cabang "${branch.name}". Masih terhubung dengan: ${deps.join(", ")}. Hapus data tersebut terlebih dahulu.`,
      });
    }

    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    return res.json({ success: true, message: `Cabang "${branch.name}" berhasil dihapus` });
  } catch (err: any) {
    console.error("DELETE /branches/:id error:", err);
    return res.status(500).json({ error: "Gagal menghapus cabang: " + (err.message || "Unknown error") });
  }
});

export default router;
