import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

export const requireDbUser = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.status(403).json({ error: "User not provisioned. Please sign in first." });
    return;
  }
  req.dbUser = user;
  next();
};

export const requireRole = (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
    if (!user) {
      res.status(403).json({ error: "User not provisioned." });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    req.dbUser = user;
    next();
  };
