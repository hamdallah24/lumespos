import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createLeave, transitionLeaveStatus, getLeaves } from "../services/leaveService";

const router = Router();

router.post("/hr/leaves", requireAuth, async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: "employeeId, leaveType, startDate, endDate required" });
    }
    const leave = await createLeave({ employeeId: Number(employeeId), leaveType, startDate, endDate, reason, createdBy: req.user?.id ? Number(req.user.id) : undefined });
    return res.status(201).json(leave);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/leaves", requireAuth, async (req, res) => {
  try {
    const employeeId = req.query["employeeId"] ? Number(req.query["employeeId"]) : undefined;
    const status = req.query["status"] as string | undefined;
    const leaves = await getLeaves(employeeId, status);
    return res.json(leaves);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/hr/leaves/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });
    const leave = await transitionLeaveStatus(Number(req.params["id"]), status, req.user?.id ? Number(req.user.id) : undefined);
    return res.json(leave);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

export default router;
