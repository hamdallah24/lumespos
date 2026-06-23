import { Router } from "express";
import passport from "passport";
import { compare } from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { hashPassword, generateResetToken, hashResetToken, requireAuth, type AppUser } from "../middlewares/requireAuth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mockStorage } from "../lib/mockStorage";
import { sendPasswordResetEmail } from "../lib/email";


const router = Router();
const RESET_REQUEST_MESSAGE = "Jika akun ada, link reset password telah dikirim.";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password minimal 8 karakter";
  if (!/[a-zA-Z]/.test(password)) return "Password harus mengandung huruf";
  if (!/[0-9]/.test(password)) return "Password harus mengandung angka";
  return null;
}

router.post("/auth/signup", async (req, res, next) => {
  const { email, name, password, inviteCode } = req.body as {
    email?: string;
    name?: string;
    password?: string;
    inviteCode?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email dan password diperlukan" });
    return;
  }

  // Invite code check: first user (owner) is free, others need code
  const signupCode = process.env.SIGNUP_CODE;
  if (signupCode) {
    let isFirstUser = false;
    try {
      isFirstUser = (await db.select().from(usersTable).limit(1)).length === 0;
    } catch {
      isFirstUser = mockStorage.list().length === 0;
    }
    if (!isFirstUser && (!inviteCode || inviteCode !== signupCode)) {
      res.status(403).json({ error: "Kode undangan tidak valid" });
      return;
    }
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedName = (name ?? normalizedEmail.split("@")[0] ?? "Pengguna").trim();

  try {
    // Try database first
    try {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
      if (existing) {
        res.status(409).json({ error: "Email sudah terdaftar" });
        return;
      }
    } catch (dbError) {
      // Fall back to mock storage
      const existing = mockStorage.findByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "Email sudah terdaftar" });
        return;
      }
    }

    const passwordHash = await hashPassword(password);

    let createdUser: any;

    // Try database first
    try {
      const isFirstUser = (await db.select().from(usersTable).limit(1)).length === 0;
      const role = isFirstUser ? "owner" : "cashier";

      const createdUserResult = await db
        .insert(usersTable as any)
        .values({
          clerkId: normalizedEmail,
          email: normalizedEmail,
          name: normalizedName,
          passwordHash,
          role,
        } as any)
        .returning();

      createdUser = Array.isArray(createdUserResult)
        ? createdUserResult[0]
        : (createdUserResult as any).rows?.[0] ?? createdUserResult;
    } catch (dbError) {
      // Fall back to mock storage
      console.log("Database unavailable, using mock storage for signup");
      const isFirstUser = mockStorage.isEmpty();
      const role = isFirstUser ? "owner" : "cashier";

      createdUser = mockStorage.createUser({
        clerkId: normalizedEmail,
        email: normalizedEmail,
        name: normalizedName,
        passwordHash,
        role,
      });
    }

    req.login(createdUser as Express.User, (error: any) => {
      if (error) {
        return next(error);
      }
      res.status(201).json(createdUser);
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message ?? "Email atau password salah" });
    }
    req.login(user, (loginError: any) => {
      if (loginError) {
        return next(loginError);
      }
      res.json(user);
    });
  })(req, res, next);
});

router.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session?.destroy(() => {
      res.status(204).end();
    });
  });
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const user = req.user as AppUser;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Password lama dan baru diperlukan" });
    return;
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const isMatch = await compare(currentPassword, (user as any).passwordHash as string);
  if (!isMatch) {
    res.status(400).json({ error: "Password lama tidak cocok" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable as any).set({ passwordHash } as any).where(eq(usersTable.id, user.id));

  res.status(204).end();
});

router.post("/auth/request-password-reset", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email diperlukan" });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) {
    res.status(200).json({ message: RESET_REQUEST_MESSAGE });
    return;
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 15);

  await db
    .update(usersTable)
    .set({ resetTokenHash, resetTokenExpiresAt } as any)
    .where(eq(usersTable.id, user.id));

  await sendPasswordResetEmail(normalizedEmail, resetToken);

  res.status(200).json({ message: RESET_REQUEST_MESSAGE });
});

router.post("/auth/reset-password", async (req, res) => {
  const { email, resetToken, newPassword } = req.body as {
    email?: string;
    resetToken?: string;
    newPassword?: string;
  };

  if (!email || !resetToken || !newPassword) {
    res.status(400).json({ error: "Email, token reset, dan password baru diperlukan" });
    return;
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const [user] = await db.select().from(usersTable as any).where(eq(usersTable.email, normalizedEmail));
  if (!user || !(user as any).resetTokenHash || !(user as any).resetTokenExpiresAt) {
    res.status(400).json({ error: "Token reset tidak valid atau kadaluwarsa" });
    return;
  }

  const expectedHash = hashResetToken(resetToken);
  const isValid = timingSafeEqual(Buffer.from(expectedHash), Buffer.from((user as any).resetTokenHash));
  if (!isValid || (user as any).resetTokenExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "Token reset tidak valid atau kadaluwarsa" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db
  .update(usersTable as any).set({ passwordHash, resetTokenHash: null, resetTokenExpiresAt: null } as any)
    .where(eq(usersTable.id, user.id));

  res.status(204).end();
});

// Google OAuth routes
router.get("/auth/google", (req, res) => {
  const redirectTo = (req.query.redirect as string) ?? "/";
  (req.session as any).authRedirect = redirectTo;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })(req, res);
});

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/sign-in" }),
  (req, res) => {
    const redirectTo = (req.session as any)?.authRedirect ?? "/";
    delete (req.session as any).authRedirect;
    res.redirect(redirectTo);
  },
);

export default router;
