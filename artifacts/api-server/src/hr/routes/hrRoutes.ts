import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { runHrValidation } from "../services/validationEngine";
import { getHrDashboard } from "../services/dashboardService";
import { getOrgTree, getManagerChain } from "../services/orgStructureService";
import { getRecentHrEvents } from "../services/timelineService";

const router = Router();

router.get("/hr/validation", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const report = await runHrValidation(branchId);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/dashboard", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const dashboard = await getHrDashboard(branchId);
    return res.json(dashboard);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/org-tree", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const tree = await getOrgTree(branchId);
    return res.json(tree);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/employees/:id/manager-chain", requireAuth, async (req, res) => {
  try {
    const chain = await getManagerChain(Number(req.params["id"]));
    return res.json(chain);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/events", requireAuth, async (req, res) => {
  try {
    const events = await getRecentHrEvents();
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
