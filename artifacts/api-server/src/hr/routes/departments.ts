import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  createDepartment, getAllDepartments, getDepartmentById, updateDepartment,
  deleteDepartment, getDepartmentTree, moveDepartment, reorderDepartments,
} from "../services/departmentService";

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

router.get("/hr/departments/tree", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const tree = await getDepartmentTree(branchId);
    return res.json(tree);
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
    const { code, name, description, parentId, headPositionId, managerEmployeeId, branchId } = req.body;
    if (!name || !branchId) return res.status(400).json({ error: "name and branchId required" });
    const dept = await createDepartment({
      name, branchId, code: code || null, description: description || null,
      parentId: parentId || null, headPositionId: headPositionId || null,
      managerEmployeeId: managerEmployeeId || null,
    });
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

router.delete("/hr/departments/:id", requireAuth, async (req, res) => {
  try {
    const result = await deleteDepartment(Number(req.params["id"]));
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/hr/departments/:id/move", requireAuth, async (req, res) => {
  try {
    const { parentId } = req.body;
    const dept = await moveDepartment(Number(req.params["id"]), parentId ?? null);
    return res.json(dept);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/departments/reorder", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
    await reorderDepartments(ids);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
