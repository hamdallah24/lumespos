import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createPosition, getAllPositions, getPositionById } from "../services/positionService";

const router = Router();

router.get("/hr/positions", requireAuth, async (_req, res) => {
  try {
    const positions = await getAllPositions();
    return res.json(positions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/positions/:id", requireAuth, async (req, res) => {
  try {
    const pos = await getPositionById(Number(req.params["id"]));
    if (!pos) return res.status(404).json({ error: "Position not found" });
    return res.json(pos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/positions", requireAuth, async (req, res) => {
  try {
    const { title, departmentId, grade, baseSalary } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const pos = await createPosition({ title, departmentId: departmentId || null, grade, baseSalary: baseSalary || "0" });
    return res.status(201).json(pos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
