import { db, attendanceRecordsTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

export async function checkIn(employeeId: number, createdBy?: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [existing] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (existing) throw new Error("Already checked in today");

  const [record] = await db.insert(attendanceRecordsTable).values({
    employeeId, date: today, checkIn: now, status: "present", createdBy,
  }).returning();

  await publishHrEvent("attendance.check_in", "attendance", record.id, { employeeId, date: today, checkIn: now.toISOString() }, { source: "checkIn" });
  return record;
}

export async function checkOut(employeeId: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found for today");
  if (record.checkOut) throw new Error("Already checked out");

  const checkInTime = record.checkIn ? new Date(record.checkIn) : new Date();
  const workedMs = now.getTime() - checkInTime.getTime();
  const breakMs = record.breakStart && record.breakEnd
    ? new Date(record.breakEnd).getTime() - new Date(record.breakStart).getTime()
    : 0;
  const netMs = workedMs - breakMs;
  const earlyLeaveMin = netMs < 8 * 3600000 ? Math.round((8 * 3600000 - netMs) / 60000) : 0;

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ checkOut: now, earlyLeaveMinutes: earlyLeaveMin })
    .where(eq(attendanceRecordsTable.id, record.id)).returning();

  await publishHrEvent("attendance.check_out", "attendance", record.id, { employeeId, date: today, checkOut: now.toISOString(), workedMinutes: Math.round(netMs / 60000) }, { source: "checkOut" });
  return updated;
}

export async function breakStart(employeeId: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (record.breakStart) throw new Error("Break already started");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ breakStart: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.break_start", "attendance", record.id, { employeeId, date: today }, { source: "breakStart" });
  return updated;
}

export async function breakEnd(employeeId: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (!record.breakStart) throw new Error("Break not started");
  if (record.breakEnd) throw new Error("Break already ended");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ breakEnd: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.break_end", "attendance", record.id, { employeeId, date: today }, { source: "breakEnd" });
  return updated;
}

export async function overtimeStart(employeeId: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (record.overtimeStart) throw new Error("Overtime already started");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ overtimeStart: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.overtime_start", "attendance", record.id, { employeeId, date: today }, { source: "overtimeStart" });
  return updated;
}

export async function overtimeEnd(employeeId: number): Promise<any> {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (!record.overtimeStart) throw new Error("Overtime not started");
  if (record.overtimeEnd) throw new Error("Overtime already ended");

  const start = new Date(record.overtimeStart);
  const end = new Date();
  const otMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ overtimeEnd: end, overtimeMinutes: otMinutes }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.overtime_end", "attendance", record.id, { employeeId, date: today, overtimeMinutes: otMinutes }, { source: "overtimeEnd" });
  return updated;
}

export async function getTodayAttendance(): Promise<any[]> {
  const today = new Date().toISOString().split("T")[0];
  return db.select({
    id: attendanceRecordsTable.id, employeeId: attendanceRecordsTable.employeeId,
    checkIn: attendanceRecordsTable.checkIn, checkOut: attendanceRecordsTable.checkOut,
    status: attendanceRecordsTable.status, lateMinutes: attendanceRecordsTable.lateMinutes,
    overtimeMinutes: attendanceRecordsTable.overtimeMinutes,
    breakStart: attendanceRecordsTable.breakStart, breakEnd: attendanceRecordsTable.breakEnd,
  }).from(attendanceRecordsTable).where(eq(attendanceRecordsTable.date, today));
}

export async function getAttendanceSummary(): Promise<{
  present: number; late: number; onLeave: number; overtimeToday: number; totalToday: number;
}> {
  const today = new Date().toISOString().split("T")[0];
  const [present] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), eq(attendanceRecordsTable.status, "present"), sql`${attendanceRecordsTable.checkIn} IS NOT NULL`));
  const [late] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), sql`${attendanceRecordsTable.lateMinutes} > 0`));
  const [onLeave] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), eq(attendanceRecordsTable.status, "leave")));
  const [overtime] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), sql`${attendanceRecordsTable.overtimeMinutes} > 0`));
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.date, today));

  return {
    present: present?.count || 0, late: late?.count || 0,
    onLeave: onLeave?.count || 0, overtimeToday: overtime?.count || 0,
    totalToday: total?.count || 0,
  };
}
