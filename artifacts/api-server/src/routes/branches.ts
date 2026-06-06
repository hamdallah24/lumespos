import { Router } from "express";
import { db, branchesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/branches", requireAuth, async (_req, res) => {
  const rows = await db.select().from(branchesTable).orderBy(branchesTable.id);
  res.json(rows);
});

router.post("/branches", requireRole("owner", "manager"), async (req, res) => {
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

export default router;
