// ConfigCenter — Milestone 6 Phase 4: Ecosystem Operations REST surface.
// ADDITIVE router — does NOT touch the locked settings/api/* layer. Thin HTTP
// mapping only; all logic lives behind the EcosystemOperations facade and the
// read-only health/diagnostics/explorer projections. Read-heavy endpoints;
// only explicit install/remove/force-remove are mutating (through PackageManager
// public surface + journal). Mounted at /v1/ecosystem in src/routes/index.ts.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getEcosystem } from "./composition";
import type { EcosystemEventType } from "./types";
import { ECOSYSTEM_EVENT_TYPES } from "./journal-types";

const router: Router = Router();

const nameParam = z.object({ name: z.string().min(1) });

const forceRemoveBody = z.object({
  version: z.string().optional(),
  actor: z.string().optional(),
  correlationId: z.string().optional(),
  reason: z.string().min(1),
});

// GET /ecosystem/health
router.get("/health", (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getEcosystem().health());
  } catch (err) { next(err); }
});

// GET /ecosystem/diagnostics — optionally ?package=NAME
router.get("/diagnostics", (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = typeof req.query["package"] === "string" ? req.query["package"] : undefined;
    res.json(getEcosystem().diagnostics(p));
  } catch (err) { next(err); }
});

// GET /ecosystem/packages — operational status of all packages
router.get("/packages", (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getEcosystem().packages());
  } catch (err) { next(err); }
});

// GET /ecosystem/packages/:name — one package operational status
router.get("/packages/:name", (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = nameParam.safeParse(req.params);
    if (!p.success) { res.status(400).json({ error: "invalid package name" }); return; }
    const found = getEcosystem().packages(p.data.name);
    if (found.length === 0) { res.status(404).json({ error: "package not found" }); return; }
    res.json(found);
  } catch (err) { next(err); }
});

// GET /ecosystem/capabilities — ?required=a,b,c
router.get("/capabilities", (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query["required"] === "string" ? req.query["required"].split(",").filter(Boolean) : undefined;
    res.json(getEcosystem().capabilities(q));
  } catch (err) { next(err); }
});

// GET /ecosystem/events — ?type=...&package=... (chronological journal read)
router.get("/events", (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = typeof req.query["type"] === "string" ? req.query["type"] : undefined;
    const pkg = typeof req.query["package"] === "string" ? req.query["package"] : undefined;
    res.json(getEcosystem().events({ type: type as EcosystemEventType | undefined, package: pkg }));
  } catch (err) { next(err); }
});

// GET /ecosystem/operations/:id — one operation's correlated journal trail
router.get("/operations/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const trail = getEcosystem().operation(id);
    if (trail.length === 0) { res.status(404).json({ error: "operation not found" }); return; }
    res.json(trail);
  } catch (err) { next(err); }
});

// POST /ecosystem/packages/:name/install — explicit install (PackageManager public surface)
router.post("/packages/:name/install", (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = nameParam.safeParse(req.params);
    if (!p.success) { res.status(400).json({ error: "invalid package name" }); return; }
    const body = (req.body ?? {}) as { version?: string; actor?: string; correlationId?: string };
    const r = getEcosystem().install(p.data.name, body.version, body);
    res.status(r.ok ? 200 : 409).json(r.ok ? r.result : { ok: false, error: r.error });
  } catch (err) { next(err); }
});

// POST /ecosystem/packages/:name/remove — explicit remove (PackageManager public surface)
router.post("/packages/:name/remove", (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = nameParam.safeParse(req.params);
    if (!p.success) { res.status(400).json({ error: "invalid package name" }); return; }
    const body = (req.body ?? {}) as { version?: string; actor?: string; correlationId?: string };
    const r = getEcosystem().remove(p.data.name, body.version, body);
    res.status(r.ok ? 200 : 409).json(r.ok ? r.result : { ok: false, error: r.error });
  } catch (err) { next(err); }
});

// POST /ecosystem/packages/:name/force-remove — explicit + reason-aware + journaled
router.post("/packages/:name/force-remove", (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = nameParam.safeParse(req.params);
    if (!p.success) { res.status(400).json({ error: "invalid package name" }); return; }
    const b = forceRemoveBody.safeParse(req.body ?? {});
    if (!b.success) { res.status(400).json({ error: "force-remove requires a non-empty reason", detail: b.error.issues }); return; }
    const r = getEcosystem().forceRemove(p.data.name, b.data.version, { actor: b.data.actor ?? "", correlationId: b.data.correlationId ?? "", reason: b.data.reason });
    res.status(r.ok ? 200 : 409).json(r.ok ? r.result : { ok: false, error: r.error });
  } catch (err) { next(err); }
});

// sanity export for tests that import the type list
export const ECOSYSTEM_EVENT_TYPES_EXPORT = ECOSYSTEM_EVENT_TYPES;

export default router;
