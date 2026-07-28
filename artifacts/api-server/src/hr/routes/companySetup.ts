import { Router } from "express";
import {
  getWizardState, getWizardData, saveStep, finalizeWizard, getWizardStatus,
} from "../services/companySetupService";

const router = Router();

router.get("/status", async (req, res) => {
  try {
    const status = await getWizardStatus();
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const state = await getWizardState();
    res.json(state);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/data", async (req, res) => {
  try {
    const data = await getWizardData();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/step/:step", async (req, res) => {
  try {
    const step = parseInt(req.params.step);
    if (step < 1 || step > 8) return res.status(400).json({ error: "Invalid step (1-8)" });
    await saveStep(step, req.body);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finalize", async (req, res) => {
  try {
    const result = await finalizeWizard();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const { db, sql } = await import("@workspace/db");
    await db.execute(sql`UPDATE company_setup SET status = 'reset' WHERE status = 'in_progress'`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
