import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  getHeadcountTrend, getTurnoverStats, getTenureDistribution,
  getProbationStatus, getCostPerDepartment, getWorkforceSummary,
} from "../services/workforceAnalyticsService";

const router = Router();

router.get("/hr/workforce/summary", requireAuth, async (_req, res) => {
  try { return res.json(await getWorkforceSummary()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/workforce/headcount-trend", requireAuth, async (req, res) => {
  try {
    const months = req.query["months"] ? Number(req.query["months"]) : 12;
    return res.json(await getHeadcountTrend(months));
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/workforce/turnover", requireAuth, async (req, res) => {
  try {
    const year = req.query["year"] as string | undefined;
    return res.json(await getTurnoverStats(year));
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/workforce/tenure", requireAuth, async (_req, res) => {
  try { return res.json(await getTenureDistribution()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/workforce/probation", requireAuth, async (_req, res) => {
  try { return res.json(await getProbationStatus()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/workforce/cost-per-dept", requireAuth, async (_req, res) => {
  try { return res.json(await getCostPerDepartment()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
