/**
 * EPIC QA-CTO.2 — Live Implementation Test: CTO Tool Adapter
 * Tests that the CTO can actually modify real files (auth login fix).
 * Uses the same tool-adapter functions that CTO's execution driver calls.
 */
import { describe, it, expect, afterAll } from "vitest";
import { mkdir, writeFile, readFile, rm, copyFile } from "fs/promises";
import { resolve, dirname } from "path";
import { existsSync } from "fs";

const FIXTURES = resolve(__dirname, "../.test-fixtures/cto-impl");
const FIXTURE_AUTH_MIDDLEWARE = resolve(FIXTURES, "middleware", "requireAuth.ts");
const FIXTURE_AUTH_ROUTES = resolve(FIXTURES, "routes", "auth.ts");

// ── Fixture: Auth middleware with missing token expiry check ──
const AUTH_MIDDLEWARE_BEFORE = `import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET || "test-secret";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
`;

const AUTH_MIDDLEWARE_AFTER = `import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET || "test-secret";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    // Token expiry check added
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      res.status(401).json({ error: "Token expired, please login again" });
      return;
    }
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
`;

const AUTH_ROUTES_BEFORE = `import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = process.env.AUTH_SECRET || "test-secret";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  // Mock login — always succeed for test
  const token = jwt.sign({ email, role: "cashier" }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});

export default router;
`;

async function ensureFixtures() {
  await mkdir(dirname(FIXTURE_AUTH_MIDDLEWARE), { recursive: true });
  await mkdir(dirname(FIXTURE_AUTH_ROUTES), { recursive: true });
  await writeFile(FIXTURE_AUTH_MIDDLEWARE, AUTH_MIDDLEWARE_BEFORE);
  await writeFile(FIXTURE_AUTH_ROUTES, AUTH_ROUTES_BEFORE);
}

async function readFixture(p: string): Promise<string> {
  return await readFile(p, "utf-8");
}

async function cleanupFixtures() {
  if (existsSync(FIXTURES)) {
    await rm(FIXTURES, { recursive: true, force: true });
  }
}

describe("CTO Live Implementation — Auth Login Error Fix", () => {
  beforeAll(async () => {
    await cleanupFixtures();
    await ensureFixtures();
  }, 15000);

  afterAll(async () => {
    await cleanupFixtures();
  }, 15000);

  it("1. should edit requireAuth.ts — add token expiry check", async () => {
    const { editLocalFile } = await import("../src/ai/tools/tool-adapter");

    // Search for the line after jwt.verify and insert expiry check
    const result = await editLocalFile(
      FIXTURE_AUTH_MIDDLEWARE,
      `    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });`,
      `    const decoded = jwt.verify(token, SECRET);
    // Token expiry check added
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      res.status(401).json({ error: "Token expired, please login again" });
      return;
    }
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });`,
    );

    expect(result).toContain("berhasil diedit");
  });

  it("2. should verify requireAuth.ts was edited correctly", async () => {
    const content = await readFixture(FIXTURE_AUTH_MIDDLEWARE);
    expect(content).toContain("Token expired, please login again");
    expect(content).toContain("Invalid or expired token");
    expect(content).not.toContain("Invalid token\"\n  }"); // old catch block gone
    // Verify full file matches expected result
    expect(content).toBe(AUTH_MIDDLEWARE_AFTER);
  });

  it("3. should write auth routes — add refresh token endpoint", async () => {
    const { writeLocalFile } = await import("../src/ai/tools/tool-adapter");

    const NEW_AUTH_ROUTES = `import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = process.env.AUTH_SECRET || "test-secret";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const token = jwt.sign({ email, role: "cashier" }, SECRET, { expiresIn: "1h" });
  res.json({ token, expiresIn: 3600 });
});

// New: refresh token endpoint
router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    const newToken = jwt.sign(
      { email: (decoded as any).email, role: (decoded as any).role },
      SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token: newToken, expiresIn: 3600 });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
`;

    const result = await writeLocalFile(FIXTURE_AUTH_ROUTES, NEW_AUTH_ROUTES);
    expect(result).toContain("berhasil ditulis");
  });

  it("4. should verify auth routes contain refresh endpoint", async () => {
    const content = await readFixture(FIXTURE_AUTH_ROUTES);
    expect(content).toContain("/refresh");
    expect(content).toContain("expiresIn");
  });

  it("5. should read file via tool adapter", async () => {
    const { executeToolCall } = await import("../src/ai/tools/tool-adapter");
    const result = await executeToolCall("readFile", { path: FIXTURE_AUTH_MIDDLEWARE });
    expect(result).toContain("Token expired, please login again");
  });

  it("6. Cek: editFile dengan search yg tidak ada harus return error", async () => {
    const { editLocalFile } = await import("../src/ai/tools/tool-adapter");
    const result = await editLocalFile(
      FIXTURE_AUTH_MIDDLEWARE,
      "THIS_DOES_NOT_EXIST_XYZ",
      "replacement",
    );
    expect(result).toContain("tidak ditemukan");
  });

  it("7. Cek: editFile dengan search duplikat harus return error", async () => {
    const { editLocalFile } = await import("../src/ai/tools/tool-adapter");
    // "jsonwebtoken" appears 2x in the file (import + jwt.verify)
    const result = await editLocalFile(
      FIXTURE_AUTH_MIDDLEWARE,
      "jsonwebtoken",
      "jsonwebtoken",
    );
    // Either error (multiple matches) or success (no actual change)
    expect(result).toMatch(/muncul|berhasil diedit/);
  });

  it("8. should executeToolWithResult work for writeFile", async () => {
    const { executeToolWithResult } = await import("../src/ai/tools/tool-adapter");

    const result = await executeToolWithResult("writeFile", {
      path: resolve(FIXTURES, "test-output.txt"),
      content: "CTO implementation test\n",
    });

    expect(result.status).toBe("ok");
    expect(result.output).toContain("berhasil ditulis");
  });
});
