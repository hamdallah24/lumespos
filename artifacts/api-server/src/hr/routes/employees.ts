import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  getEmployeeExplorer, getEmployeeProfile, createEmployee, updateEmployee,
  changeEmployeeStatus, getExplorerStats, getEmployeeDocuments, upsertEmployeeDocument,
  getEmployeeAssignments, upsertEmployeeAssignment, deleteEmployeeAssignment,
  getEmployeeAISuggestions,
} from "../services/employeeEngine";
import { getEmployeeTimeline } from "../services/timelineService";

const router = Router();

// Explorer
router.get("/hr/employees", requireAuth, async (req, res) => {
  try {
    const result = await getEmployeeExplorer({
      search: req.query.search as string,
      branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
      positionId: req.query.positionId ? Number(req.query.positionId) : undefined,
      status: req.query.status as string,
      employmentType: req.query.employmentType as string,
      managerId: req.query.managerId ? Number(req.query.managerId) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
router.get("/hr/employees/stats", requireAuth, async (req, res) => {
  try {
    res.json(await getExplorerStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Suggestions
router.get("/hr/employees/ai-suggestions", requireAuth, async (req, res) => {
  try {
    const empId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    res.json(await getEmployeeAISuggestions(empId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Profile
router.get("/hr/employees/:id", requireAuth, async (req, res) => {
  try {
    const profile = await getEmployeeProfile(Number(req.params.id));
    if (!profile) return res.status(404).json({ error: "Employee not found" });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Timeline
router.get("/hr/employees/:id/timeline", requireAuth, async (req, res) => {
  try {
    res.json(await getEmployeeTimeline(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Documents
router.get("/hr/employees/:id/documents", requireAuth, async (req, res) => {
  try {
    res.json(await getEmployeeDocuments(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/employees/:id/documents", requireAuth, async (req, res) => {
  try {
    res.json(await upsertEmployeeDocument(Number(req.params.id), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Assignments
router.get("/hr/employees/:id/assignments", requireAuth, async (req, res) => {
  try {
    res.json(await getEmployeeAssignments(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/employees/:id/assignments", requireAuth, async (req, res) => {
  try {
    res.json(await upsertEmployeeAssignment(Number(req.params.id), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/employees/assignments/:assignmentId", requireAuth, async (req, res) => {
  try {
    await deleteEmployeeAssignment(Number(req.params.assignmentId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create / Update / Status
router.post("/hr/employees", requireAuth, async (req, res) => {
  try {
    const { fullName, positionId, departmentId, branchId, hireDate, status, phone, address, employmentType, baseSalary, managerId } = req.body;
    if (!fullName || !branchId || !hireDate) return res.status(400).json({ error: "fullName, branchId, hireDate required" });
    res.status(201).json(await createEmployee({
      fullName, positionId, departmentId, branchId, hireDate, status, phone, address, employmentType, baseSalary, managerId,
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/hr/employees/:id", requireAuth, async (req, res) => {
  try {
    const emp = await updateEmployee(Number(req.params.id), req.body);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/employees/:id/status", requireAuth, async (req, res) => {
  try {
    res.json(await changeEmployeeStatus(Number(req.params.id), req.body.status, req.body.reason));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
