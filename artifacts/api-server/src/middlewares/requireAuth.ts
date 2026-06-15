import { type Request, type Response, type NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { compare, hash } from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mockStorage } from "../lib/mockStorage";

export type AppUser = typeof usersTable.$inferSelect;

declare global {
  namespace Express {
    interface User extends AppUser {}
    interface Request {
      dbUser?: AppUser;
    }
  }
}

const RESET_TOKEN_SECRET = process.env.AUTH_SECRET ?? "dev-sayq-pos-secret";

passport.serializeUser((user: any, done: (err: any, id?: string) => void) => {
  done(null, user.clerkId);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: any | false) => void) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
    if (!user) {
      done(null, false);
      return;
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email: string, password: string, done: any) => {
      try {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail) {
          return done(null, false, { message: "Email is required" });
        }

        // Try database first, fallback to mockStorage
        let user: any;
        try {
          const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
          user = dbUser;
        } catch (dbError) {
          console.log("Database unavailable, using mock storage");
          user = mockStorage.findByEmail(normalizedEmail);
        }

        if (!user) {
          return done(null, false, { message: "Email atau password salah" });
        }

        const isMatch = await compare(password, (user as any).passwordHash);
        if (!isMatch) {
          return done(null, false, { message: "Email atau password salah" });
        }

        return done(null, user, { message: "Authenticated" });
      } catch (error) {
        return done(error);
      }
    },
  ),
);

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function generateResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string) {
  return createHmac("sha256", RESET_TOKEN_SECRET).update(token).digest("base64url");
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

export const requireDbUser = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.dbUser = req.user;
  next();
};

export const requireRole = (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    req.dbUser = req.user;
    next();
  };
