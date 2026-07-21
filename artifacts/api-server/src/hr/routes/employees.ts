import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createEmployee, getAllEmployees, getEmployeeById, updateEmployee, changeEmployeeStatus, getEmployeesWithRelations } from "../services/employeeService";
import { getEmployeeTimeline } from "../services/timelineService";

const router = Router();

router.get("/hr/employees", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const status = req.query["status"] as string | undefined;
    const rows = await getEmployeesWithRelations(branchId);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/hr/employees/:id", requireAuth, async (req, res) => {
  try {
    const emp = await getEmployeeById(Number(req.params["id"]));
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    return res.json(emp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/employees", requireAuth, async (req, res) => {
  try {
    const { fullName, positionId, departmentId, branchId, hireDate, status, idNumber, phone, address, bankName, bankAccount, taxId, baseSalary } = req.body;
    if (!fullName || !branchId || !hireDate) return res.status(400).json({ error: "fullName, branchId, hireDate required" });
    const emp = await createEmployee({
      fullName, positionId: positionId || null, departmentId: departmentId || null,
      branchId, hireDate, status: status || "active", idNumber, phone, address,
      bankName, bankAccount, taxId, baseSalary: baseSalary || "0",
    });
    return res.status(201).json(emp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/hr/employees/:id", requireAuth, async (req, res) => {
  try {
    const emp = await updateEmployee(Number(req.params["id"]), req.body);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    return res.json(emp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/hr/employees/:id/status", requireAuth, async (req, res) => {
  try {
    const emp = await changeEmployeeStatus(Number(req.params["id"]), req.body.status, req.body.reason);
    return res.json(emp);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get("/hr/employees/:id/timeline", requireAuth, async (req, res) => {
  try {
    const events = await getEmployeeTimeline(Number(req.params["id"]));
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
