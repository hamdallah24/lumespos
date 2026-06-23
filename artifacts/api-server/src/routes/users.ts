import { Router } from "express";
import { db, usersTable, userBranchesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// Sync user
router.post("/users/sync", requireAuth, async (req, res) => {
  const user = req.user!;
  const { email, name } = req.body as { email: string; name: string };
  if (!email || !name) {
    res.status(400).json({ error: "email and name are required" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const [updated] = await db
    .update(usersTable)
    .set({ email: normalizedEmail, name })
    .where(eq(usersTable.clerkId, user.clerkId))
    .returning();
  res.json(updated);
});

// Get current user
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const branches = await db
      .select({ branchId: userBranchesTable.branchId })
      .from(userBranchesTable)
      .where(eq(userBranchesTable.userId, user.id));
    res.json({
      ...user,
      allowedBranches: branches.map((b) => b.branchId),
    });
  } catch (err) {
    // Fallback kalau tabel belum ada di database
    res.json({ ...req.user, allowedBranches: [] });
  }
});

// List all users
router.get("/users", requireRole("owner", "manager"), async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    // Ambil semua user_branches sekaligus
    const userIds = users.map((u) => u.id);
    const branches = userIds.length
      ? await db.select().from(userBranchesTable).where(inArray(userBranchesTable.userId, userIds))
      : [];

    const result = users.map((u) => ({
      ...u,
      allowedBranches: branches.filter((b) => b.userId === u.id).map((b) => b.branchId),
    }));
    res.json(result);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: "Gagal mengambil data pengguna" });
  }
});

// Update role
router.patch("/users/:id/role", requireRole("owner"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { role } = req.body as { role: string };
  if (!["owner", "manager", "cashier"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated);
});

// Update allowed branches untuk user
router.patch("/users/:id/branches", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { branchIds } = req.body as { branchIds: number[] };

    if (!Array.isArray(branchIds)) {
      res.status(400).json({ error: "branchIds harus berupa array" });
      return;
    }

    // Hapus semua akses cabang lama
    await db.delete(userBranchesTable).where(eq(userBranchesTable.userId, id));

    // Insert akses cabang baru
    if (branchIds.length > 0) {
      await db.insert(userBranchesTable).values(
        branchIds.map((branchId) => ({ userId: id, branchId }))
      );
    }

    const branches = await db
      .select()
      .from(userBranchesTable)
      .where(eq(userBranchesTable.userId, id));

    res.json({ userId: id, allowedBranches: branches.map((b) => b.branchId) });
  } catch (err) {
    console.error("PATCH /users/:id/branches error:", err);
    res.status(500).json({ error: "Gagal update akses cabang" });
  }
});

// Hapus user
router.delete("/users/:id", requireRole("owner"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const requestingUser = req.user!;

    // Tidak bisa hapus diri sendiri
    if (id === requestingUser.id) {
      res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "User tidak ditemukan" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /users error:", err);
    res.status(500).json({ error: "Gagal menghapus pengguna" });
  }
});

export default router;