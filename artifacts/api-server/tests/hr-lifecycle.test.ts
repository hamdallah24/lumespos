import { describe, it, expect, beforeAll } from "vitest";
import { db, employeesTable, hrEventsTable, attendanceRecordsTable, leaveRequestsTable, departmentsTable, positionsTable, branchesTable, VALID_TRANSITIONS, LEAVE_STATUS_FLOW } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createEmployee, changeEmployeeStatus, getEmployeeById } from "../src/hr/services/employeeService";
import { checkIn, checkOut, breakStart, breakEnd, overtimeStart, overtimeEnd, getAttendanceSummary } from "../src/hr/services/attendanceService";
import { createLeave, transitionLeaveStatus, getLeaves } from "../src/hr/services/leaveService";
import { getEmployeeTimeline } from "../src/hr/services/timelineService";
import { runHrValidation } from "../src/hr/services/validationEngine";
import { getHrDashboard } from "../src/hr/services/dashboardService";
import { getManagerChain } from "../src/hr/services/orgStructureService";

const PREFIX = `HR-E2E-${Date.now()}`;
let branchId: number;
let deptId: number;
let posId: number;
let empId: number;
let leaveId: number;

beforeAll(async () => {
  const [branch] = await db.insert(branchesTable).values({ name: `${PREFIX}-Branch` }).returning({ id: branchesTable.id });
  branchId = branch.id;
  const [dept] = await db.insert(departmentsTable).values({ name: `${PREFIX}-Dept`, branchId }).returning({ id: departmentsTable.id });
  deptId = dept.id;
  const [pos] = await db.insert(positionsTable).values({ title: `${PREFIX}-Role`, baseSalary: "5000000" }).returning({ id: positionsTable.id });
  posId = pos.id;
});

describe("HR Full Lifecycle", () => {
  it("1. Candidate → create as candidate status", async () => {
    const emp = await createEmployee({
      fullName: "E2E Candidate", branchId, departmentId: deptId, positionId: posId,
      hireDate: new Date().toISOString().split("T")[0], status: "candidate",
    });
    expect(emp.status).toBe("candidate");
    expect(emp.employeeCode).toBeTruthy();
    empId = emp.id;
  });

  it("2. Hire → transition to hired", async () => {
    const emp = await changeEmployeeStatus(empId, "hired");
    expect(emp.status).toBe("hired");
  });

  it("3. Probation → transition to probation", async () => {
    const emp = await changeEmployeeStatus(empId, "probation");
    expect(emp.status).toBe("probation");
  });

  it("4. Active → transition to active", async () => {
    const emp = await changeEmployeeStatus(empId, "active");
    expect(emp.status).toBe("active");
  });

  it("5. Invalid transition rejected", async () => {
    await expect(changeEmployeeStatus(empId, "archived")).rejects.toThrow("Invalid status transition");
  });

  it("6. Check In", async () => {
    const record = await checkIn(empId);
    expect(record.checkIn).toBeTruthy();
    expect(record.date).toBe(new Date().toISOString().split("T")[0]);
  });

  it("7. Double check-in rejected", async () => {
    await expect(checkIn(empId)).rejects.toThrow("Already checked in today");
  });

  it("8. Break Start", async () => {
    const record = await breakStart(empId);
    expect(record.breakStart).toBeTruthy();
  });

  it("9. Break End", async () => {
    const record = await breakEnd(empId);
    expect(record.breakEnd).toBeTruthy();
  });

  it("10. Overtime Start", async () => {
    const record = await overtimeStart(empId);
    expect(record.overtimeStart).toBeTruthy();
  });

  it("11. Overtime End", async () => {
    const record = await overtimeEnd(empId);
    expect(record.overtimeMinutes).toBeGreaterThanOrEqual(0);
  });

  it("12. Check Out", async () => {
    const record = await checkOut(empId);
    expect(record.checkOut).toBeTruthy();
  });

  it("13. Create Leave Request (draft)", async () => {
    const leave = await createLeave({
      employeeId: empId, leaveType: "annual",
      startDate: "2026-08-01", endDate: "2026-08-03",
      reason: "E2E test leave",
    });
    expect(leave.status).toBe("draft");
    expect(leave.totalDays).toBe(3);
    leaveId = leave.id;
  });

  it("14. Submit Leave", async () => {
    const leave = await transitionLeaveStatus(leaveId, "submitted");
    expect(leave.status).toBe("submitted");
  });

  it("15. Approve Leave", async () => {
    const leave = await transitionLeaveStatus(leaveId, "approved");
    expect(leave.status).toBe("approved");
    expect(leave.approvedAt).toBeTruthy();
  });

  it("16. Complete Leave", async () => {
    const leave = await transitionLeaveStatus(leaveId, "completed");
    expect(leave.status).toBe("completed");
  });

  it("17. Invalid leave transition rejected", async () => {
    await expect(transitionLeaveStatus(leaveId, "submitted")).rejects.toThrow("Invalid transition");
  });

  it("18. Resign", async () => {
    const emp = await changeEmployeeStatus(empId, "resigned");
    expect(emp.status).toBe("resigned");
    expect(emp.resignationDate).toBeTruthy();
  });

  it("19. Archive", async () => {
    const emp = await changeEmployeeStatus(empId, "archived");
    expect(emp.status).toBe("archived");
  });

  it("20. Timeline contains all events", async () => {
    const events = await getEmployeeTimeline(empId);
    const eventTypes = events.map(e => e.eventType);
    expect(eventTypes).toContain("employee.hired");
    expect(eventTypes).toContain("employee.activated");
    expect(eventTypes).toContain("employee.resigned");
    expect(eventTypes).toContain("employee.archived");
    expect(eventTypes).toContain("attendance.check_in");
    expect(eventTypes).toContain("attendance.check_out");
    expect(eventTypes).toContain("leave.created");
    expect(eventTypes).toContain("leave.approved");
    expect(events.length).toBeGreaterThanOrEqual(12);
  });

  it("21. Event Verification — each operation creates exactly one event", async () => {
    const allEvents = await getEmployeeTimeline(empId);
    const counts = new Map<string, number>();
    for (const e of allEvents) {
      counts.set(e.eventType, (counts.get(e.eventType) || 0) + 1);
    }
    expect(counts.get("employee.hired")).toBe(2); // createEmployee + status transition to hired
    expect(counts.get("attendance.check_in")).toBe(1);
    expect(counts.get("attendance.check_out")).toBe(1);
    expect(counts.get("leave.created")).toBe(1);
    expect(counts.get("leave.approved")).toBe(1);
  });

  it("22. Manager Chain returns expected path", async () => {
    const chain = await getManagerChain(empId);
    expect(Array.isArray(chain)).toBe(true);
  });

  it("23. Validation Engine passes", async () => {
    const report = await runHrValidation(branchId);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.totalChecks).toBeGreaterThan(0);
  });

  it("24. Dashboard returns attendance + leave metrics", async () => {
    const dashboard = await getHrDashboard(branchId);
    expect(dashboard.totalEmployees).toBeGreaterThanOrEqual(1);
    expect(dashboard.attendance).toBeDefined();
    expect(dashboard.attendance.totalToday).toBeGreaterThanOrEqual(1);
    expect(typeof dashboard.pendingLeaves).toBe("number");
  });

  it("25. Attendance Summary returns today's data", async () => {
    const summary = await getAttendanceSummary();
    expect(summary.totalToday).toBeGreaterThanOrEqual(1);
    expect(typeof summary.present).toBe("number");
    expect(typeof summary.late).toBe("number");
  });
});
