import { db, leaveRequestsTable, employeesTable, LEAVE_STATUS_FLOW } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

export async function createLeave(data: {
  employeeId: number; leaveType: string; startDate: string; endDate: string;
  reason?: string; createdBy?: number;
}): Promise<any> {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  const [leave] = await db.insert(leaveRequestsTable).values({
    employeeId: data.employeeId, leaveType: data.leaveType,
    startDate: data.startDate, endDate: data.endDate, totalDays,
    reason: data.reason, createdBy: data.createdBy,
  }).returning();

  await publishHrEvent("leave.created", "leave", leave.id, {
    employeeId: data.employeeId, leaveType: data.leaveType,
    startDate: data.startDate, endDate: data.endDate, totalDays,
    status: "draft",
  }, { source: "createLeave" });

  return leave;
}

const LEAVE_EVENT_MAP: Record<string, string> = {
  submitted: "leave.submitted", approved: "leave.approved",
  rejected: "leave.rejected", completed: "leave.completed", cancelled: "leave.cancelled",
};

export async function transitionLeaveStatus(leaveId: number, newStatus: string, userId?: number): Promise<any> {
  const [leave] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, leaveId));
  if (!leave) throw new Error("Leave request not found");

  const allowed = LEAVE_STATUS_FLOW[leave.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${leave.status} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`);
  }

  const updateData: any = { status: newStatus };
  if (newStatus === "approved") {
    updateData.approvedBy = userId;
    updateData.approvedAt = new Date();
  }

  const [updated] = await db.update(leaveRequestsTable).set(updateData).where(eq(leaveRequestsTable.id, leaveId)).returning();
  const eventType = LEAVE_EVENT_MAP[newStatus] || `leave.status_changed`;
  await publishHrEvent(eventType, "leave", leaveId, {
    employeeId: leave.employeeId, leaveType: leave.leaveType,
    oldStatus: leave.status, newStatus, approvedBy: userId,
  }, { source: "transitionLeaveStatus" });

  return updated;
}

export async function getLeaves(employeeId?: number, status?: string): Promise<any[]> {
  const conditions: any[] = [];
  if (employeeId) conditions.push(eq(leaveRequestsTable.employeeId, employeeId));
  if (status) conditions.push(eq(leaveRequestsTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(leaveRequestsTable).where(where);
}


