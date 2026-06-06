import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

router.post("/users/sync", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const { email, name } = req.body as { email: string; name: string };

  if (!email || !name) {
    res.status(400).json({ error: "email and name are required" });
    return;
  }

  const clerkId = auth!.userId!;

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, name })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    res.json(updated);
    return;
  }

  const isFirstUser = (await db.select().from(usersTable)).length === 0;

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email,
      name,
      role: isFirstUser ? "owner" : "cashier",
    })
    .returning();

  res.status(201).json(created);
});

router.get("/users/me", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth!.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.get("/users", requireRole("owner", "manager"), async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

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

export default router;
