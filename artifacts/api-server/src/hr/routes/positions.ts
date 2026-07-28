import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  createPosition, getAllPositions, getPositionById, updatePosition,
  deletePosition, getPositionTree, getPositionStats, getPositionDependencies,
  getPositionSuggestions, EMPLOYMENT_TYPES, POSITION_STATUSES,
} from "../services/positionService";

const router = Router();

router.get("/hr/positions", requireAuth, async (_req, res) => {
  try {
    const positions = await getAllPositions();
    return res.json(positions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/positions/tree", requireAuth, async (_req, res) => {
  try {
    const tree = await getPositionTree();
    return res.json(tree);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/positions/stats", requireAuth, async (_req, res) => {
  try {
    const stats = await getPositionStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/positions/suggestions", requireAuth, async (_req, res) => {
  try {
    const suggestions = await getPositionSuggestions();
    return res.json(suggestions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/positions/employment-types", requireAuth, async (_req, res) => {
  return res.json(EMPLOYMENT_TYPES);
});

router.get("/hr/positions/statuses", requireAuth, async (_req, res) => {
  return res.json(POSITION_STATUSES);
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

router.get("/hr/positions/:id/dependencies", requireAuth, async (req, res) => {
  try {
    const deps = await getPositionDependencies(Number(req.params["id"]));
    return res.json(deps);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/positions", requireAuth, async (req, res) => {
  try {
    const { title, positionCode, departmentId, grade, level, reportsToPositionId, successorPositionId,
      baseSalary, responsibilities, requiredSkills, competencyTags, minExperience, employmentType, status } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const pos = await createPosition({
      title, positionCode: positionCode || null, departmentId: departmentId || null,
      grade: grade || null, level: level || null,
      reportsToPositionId: reportsToPositionId || null,
      successorPositionId: successorPositionId || null,
      baseSalary: baseSalary || "0", responsibilities: responsibilities || null,
      requiredSkills: requiredSkills || null, competencyTags: competencyTags || null,
      minExperience: minExperience || null, employmentType: employmentType || "full_time",
      status: status || "draft",
    });
    return res.status(201).json(pos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/hr/positions/:id", requireAuth, async (req, res) => {
  try {
    const pos = await updatePosition(Number(req.params["id"]), req.body);
    if (!pos) return res.status(404).json({ error: "Position not found" });
    return res.json(pos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/positions/:id", requireAuth, async (req, res) => {
  try {
    await deletePosition(Number(req.params["id"]));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/hr/positions/:id/move", requireAuth, async (req, res) => {
  try {
    const { reportsToPositionId } = req.body;
    const pos = await updatePosition(Number(req.params["id"]), { reportsToPositionId: reportsToPositionId ?? null });
    if (!pos) return res.status(404).json({ error: "Position not found" });
    return res.json(pos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/positions/reorder", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
    for (let i = 0; i < ids.length; i++) {
      await updatePosition(ids[i], { sortOrder: i + 1 });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
