import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { checkIn, checkOut, breakStart, breakEnd, overtimeStart, overtimeEnd, getTodayAttendance, getAttendanceSummary } from "../services/attendanceService";

const router = Router();

router.post("/hr/attendance/check-in", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await checkIn(Number(employeeId), req.user?.id ? Number(req.user.id) : undefined);
    return res.status(201).json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.post("/hr/attendance/check-out", requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId required" });
    const record = await checkOut(Number(employeeId));
    return res.json(record);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

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

router.get("/hr/attendance/today", requireAuth, async (_req, res) => {
  try {
    const records = await getTodayAttendance();
    return res.json(records);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/hr/attendance/summary", requireAuth, async (_req, res) => {
  try {
    const summary = await getAttendanceSummary();
    return res.json(summary);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
