import { editLocalFile } from "../src/ai/tools/tool-adapter";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { dirname, resolve } from "path";

const FIXTURES = resolve(process.cwd(), ".test-fixtures", "cto-impl-val");
const FIXTURE_FILE = resolve(FIXTURES, "middleware", "requireAuth.ts");

const BEFORE = `import { type Request, type Response, type NextFunction } from "express";
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

async function main() {
  await mkdir(dirname(FIXTURE_FILE), { recursive: true });
  await writeFile(FIXTURE_FILE, BEFORE);

  console.log("=== BEFORE (sebelum implementasi CTO) ===");
  console.log(await readFile(FIXTURE_FILE, "utf-8"));

  console.log("\n>>> CTO menjalankan: editLocalFile() — tambah token expiry check...\n");

  const result = await editLocalFile(
    FIXTURE_FILE,
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

  console.log(`>> Hasil Tool: ${result}\n`);

  console.log("=== AFTER (setelah implementasi CTO) ===");
  console.log(await readFile(FIXTURE_FILE, "utf-8"));

  console.log("\n=== VALIDASI ===");
  const content = await readFile(FIXTURE_FILE, "utf-8");
  const checks = [
    { name: "Token expired check exists", pass: content.includes("Token expired") },
    { name: "Error message improved", pass: content.includes("Invalid or expired token") },
    { name: "Old catch message removed", pass: !content.includes('catch {\n    res.status(401).json({ error: "Invalid token" });') },
    { name: "Expiry guard condition", pass: content.includes("decoded.exp < Date.now()") },
    { name: "Return after expiry", pass: content.includes("return;") },
  ];
  let allPass = true;
  for (const c of checks) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
    if (!c.pass) allPass = false;
  }
  console.log(`\n${allPass ? "✅ SEMUA VALIDASI LULUS" : "❌ ADA VALIDASI GAGAL"}`);

  await rm(FIXTURES, { recursive: true, force: true });
}

main().catch(console.error);
