import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  createLeave, transitionLeaveStatus, getLeaves,
  getLeaveCalendar, getLeaveBalance, getTeamLeave, getLeaveAnalytics,
} from "../services/leaveService";

const router = Router();

/* ── Create Leave ── */
router.post("/hr/leaves", requireAuth, async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: "employeeId, leaveType, startDate, endDate required" });
    }
    const leave = await createLeave({
      employeeId: Number(employeeId), leaveType, startDate, endDate, reason,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });
    return res.status(201).json(leave);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Get All Leaves ── */
router.get("/hr/leaves", requireAuth, async (req, res) => {
  try {
    const employeeId = req.query["employeeId"] ? Number(req.query["employeeId"]) : undefined;
    const status = req.query["status"] as string | undefined;
    const leaves = await getLeaves(employeeId, status);
    return res.json(leaves);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Transition Status ── */
router.patch("/hr/leaves/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });
    const leave = await transitionLeaveStatus(
      Number(req.params["id"]), status,
      req.user?.id ? Number(req.user.id) : undefined,
    );
    return res.json(leave);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Leave Calendar ── */
router.get("/hr/leaves/calendar", requireAuth, async (req, res) => {
  try {
    const month = req.query["month"] as string || new Date().toISOString().slice(0, 7);
    const calendar = await getLeaveCalendar(month);
    return res.json(calendar);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Leave Balance ── */
router.get("/hr/leaves/balance/:employeeId", requireAuth, async (req, res) => {
  try {
    const balance = await getLeaveBalance(Number(req.params["employeeId"]));
    return res.json(balance);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Team Leave ── */
router.get("/hr/leaves/team", requireAuth, async (req, res) => {
  try {
    const departmentId = req.query["departmentId"] ? Number(req.query["departmentId"]) : undefined;
    const month = req.query["month"] as string | undefined;
    const team = await getTeamLeave(departmentId, month);
    return res.json(team);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Leave Analytics ── */
router.get("/hr/leaves/analytics", requireAuth, async (req, res) => {
  try {
    const year = req.query["year"] as string | undefined;
    const analytics = await getLeaveAnalytics(year);
    return res.json(analytics);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
