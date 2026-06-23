import { type Request, type Response, type NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { compare, hash } from "bcryptjs";
import { db, usersTable, userBranchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

const isProduction = process.env.NODE_ENV === "production";
const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET environment variable is required.");
}

const RESET_TOKEN_SECRET = authSecret;

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

// Google OAuth strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${appBaseUrl}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          const name = profile.displayName || email?.split("@")[0] || "Pengguna";

          // Try find by googleId first
          try {
            const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, googleId));
            if (existing) return done(null, existing);
          } catch {}

          // Try find by email (link accounts)
          if (email) {
            try {
              const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
              if (byEmail) {
                await db.update(usersTable).set({ clerkId: googleId } as any).where(eq(usersTable.id, byEmail.id));
                return done(null, byEmail);
              }
            } catch {}
          }

          // Reject new Google signup if invite code is required
          const signupCode = process.env.SIGNUP_CODE;
          let isFirstUser = false;
          try {
            isFirstUser = (await db.select().from(usersTable).limit(1)).length === 0;
          } catch {}
          if (signupCode && !isFirstUser) {
            return done(null, false, { message: "Akun belum terdaftar. Silakan daftar melalui form dengan kode undangan terlebih dahulu, lalu login dengan Google." });
          }

          // Create new user
          const role = isFirstUser ? "owner" : "cashier";

          const createdResult = await db
            .insert(usersTable as any)
            .values({
              clerkId: googleId,
              email: email ?? `${googleId}@google.local`,
              name,
              passwordHash: "",
              role,
            } as any)
            .returning();

          const newUser = (createdResult as any[])[0];
          return done(null, newUser);
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

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

async function userCanAccessBranch(user: AppUser, branchId: number) {
  if (user.role === "owner" || user.role === "manager") {
    return true;
  }

  if (user.branchId === branchId) {
    return true;
  }

  const [mapping] = await db
    .select({ id: userBranchesTable.id })
    .from(userBranchesTable)
    .where(and(eq(userBranchesTable.userId, user.id), eq(userBranchesTable.branchId, branchId)))
    .limit(1);

  return Boolean(mapping);
}

export async function canAccessBranch(req: Request, branchId: number) {
  if (!req.user || !Number.isFinite(branchId) || branchId <= 0) {
    return false;
  }

  return userCanAccessBranch(req.user, branchId);
}

export function requireBranchAccess(getBranchId: (req: Request) => number | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const branchId = getBranchId(req);
    if (!branchId || !Number.isFinite(branchId) || branchId <= 0) {
      res.status(400).json({ error: "branchId required" });
      return;
    }

    if (!(await userCanAccessBranch(req.user, branchId))) {
      res.status(403).json({ error: "Forbidden branch" });
      return;
    }

    next();
  };
}
