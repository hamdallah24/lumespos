import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { getOrgChart, getOrgAnalytics, getOrgSuggestions, getManagerChain } from "../services/orgChartService";

const router = Router();

router.get("/hr/org/chart", requireAuth, async (_req, res) => {
  try {
    const chart = await getOrgChart();
    return res.json(chart);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/org/analytics", requireAuth, async (_req, res) => {
  try {
    const analytics = await getOrgAnalytics();
    return res.json(analytics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/org/suggestions", requireAuth, async (_req, res) => {
  try {
    const suggestions = await getOrgSuggestions();
    return res.json(suggestions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/org/manager-chain/:employeeId", requireAuth, async (req, res) => {
  try {
    const chain = await getManagerChain(Number(req.params["employeeId"]));
    return res.json(chain);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
