import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createDepartment, getAllDepartments, getDepartmentById, updateDepartment } from "../services/departmentService";

const router = Router();

router.get("/hr/departments", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const depts = await getAllDepartments(branchId);
    return res.json(depts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/departments/:id", requireAuth, async (req, res) => {
  try {
    const dept = await getDepartmentById(Number(req.params["id"]));
    if (!dept) return res.status(404).json({ error: "Department not found" });
    return res.json(dept);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/departments", requireAuth, async (req, res) => {
  try {
    const { name, parentId, headPositionId, branchId } = req.body;
    if (!name || !branchId) return res.status(400).json({ error: "name and branchId required" });
    const dept = await createDepartment({ name, branchId, parentId: parentId || null, headPositionId: headPositionId || null });
    return res.status(201).json(dept);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/hr/departments/:id", requireAuth, async (req, res) => {
  try {
    const dept = await updateDepartment(Number(req.params["id"]), req.body);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    return res.json(dept);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
