import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  checkIn, checkOut, breakStart, breakEnd, overtimeStart, overtimeEnd,
  getTodayAttendance, getAttendanceSummary,
  getMissingCheckout, getOvertimeActive, getAttendanceHistory,
  getAttendanceAnalytics, correctAttendance,
} from "../services/attendanceService";

const router = Router();

/* ── Check In ── */
router.post("/hr/attendance/check-in", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await checkIn(Number(employeeId), req.user?.id ? Number(req.user.id) : undefined);
    return res.status(201).json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Check Out ── */
router.post("/hr/attendance/check-out", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await checkOut(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Break Start / End ── */
router.post("/hr/attendance/break-start", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await breakStart(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.post("/hr/attendance/break-end", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await breakEnd(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Overtime Start / End ── */
router.post("/hr/attendance/overtime-start", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await overtimeStart(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.post("/hr/attendance/overtime-end", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await overtimeEnd(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Today ── */
router.get("/hr/attendance/today", requireAuth, async (_req, res) => {
  try {
    const records = await getTodayAttendance();
    return res.json(records);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Summary ── */
router.get("/hr/attendance/summary", requireAuth, async (_req, res) => {
  try {
    const summary = await getAttendanceSummary();
    return res.json(summary);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Missing Checkout (HR-03) ── */
router.get("/hr/attendance/missing-checkout", requireAuth, async (_req, res) => {
  try {
    const records = await getMissingCheckout();
    return res.json(records);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Overtime Active (HR-03) ── */
router.get("/hr/attendance/overtime-active", requireAuth, async (_req, res) => {
  try {
    const records = await getOvertimeActive();
    return res.json(records);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── History (HR-03) ── */
router.get("/hr/attendance/history", requireAuth, async (req, res) => {
  try {
    const { employeeId, from, to, branchId, status, page, limit } = req.query;
    const result = await getAttendanceHistory({
      employeeId: employeeId ? Number(employeeId) : undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      branchId: branchId ? Number(branchId) : undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return res.json(result);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Analytics (HR-03) ── */
router.get("/hr/attendance/analytics", requireAuth, async (req, res) => {
  try {
    const { from, to, branchId } = req.query;
    const result = await getAttendanceAnalytics({
      from: from as string | undefined,
      to: to as string | undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
    return res.json(result);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/* ── Correction (HR-03) ── */
router.patch("/hr/attendance/:id/correct", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { checkIn, checkOut, status, lateMinutes, earlyLeaveMinutes, overtimeMinutes, notes } = req.body;
    const updated = await correctAttendance(id, {
      checkIn, checkOut, status, lateMinutes, earlyLeaveMinutes, overtimeMinutes, notes,
    }, req.user?.id ? Number(req.user.id) : undefined);
    return res.json(updated);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

export default router;
