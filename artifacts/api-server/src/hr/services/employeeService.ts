import { db, employeesTable, departmentsTable, positionsTable, EMPLOYEE_STATUS, VALID_TRANSITIONS } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { Employee, InsertEmployee } from "@workspace/db";
import { publishHrEvent } from "../events/hrEventPublisher";

export async function createEmployee(data: InsertEmployee): Promise<Employee> {
  const code = `EMP-${String(Date.now()).slice(-6)}`;
  const [emp] = await db.insert(employeesTable).values({ ...data, employeeCode: code, status: data.status || "candidate" }).returning();
  await publishHrEvent("employee.hired", "employee", emp.id, {
    fullName: emp.fullName, positionId: emp.positionId, departmentId: emp.departmentId, managerId: emp.managerId, status: emp.status,
  }, { source: "createEmployee" });
  return emp;
}

const STATUS_EVENT_MAP: Record<string, string> = {
  hired: "employee.hired", probation: "employee.probation_started", active: "employee.activated",
  suspended: "employee.suspended", resigned: "employee.resigned", terminated: "employee.terminated", archived: "employee.archived",
};

export async function changeEmployeeStatus(id: number, newStatus: string, reason?: string): Promise<Employee> {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) throw new Error("Employee not found");
  const allowed = VALID_TRANSITIONS[emp.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${emp.status} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`);
  }
  const updateData: any = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "resigned" || newStatus === "terminated") updateData.resignationDate = new Date().toISOString().split("T")[0];
  const [updated] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, id)).returning();
  const eventType = STATUS_EVENT_MAP[newStatus] || `employee.status_changed`;
  await publishHrEvent(eventType, "employee", id, { oldStatus: emp.status, newStatus, reason }, { source: "changeEmployeeStatus" });
  return updated;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
  const old = await getEmployeeById(id);
  const [emp] = await db.update(employeesTable).set({ ...data, updatedAt: new Date() }).where(eq(employeesTable.id, id)).returning();
  if (old && emp) {
    const changes: string[] = [];
    if (data.positionId && data.positionId !== old.positionId) changes.push("positionId");
    if (data.departmentId && data.departmentId !== old.departmentId) changes.push("departmentId");
    if (data.baseSalary && data.baseSalary !== old.baseSalary) changes.push("baseSalary");
    if (data.managerId && data.managerId !== old.managerId) changes.push("managerId");
    if (changes.length > 0) {
      await publishHrEvent("employee.updated", "employee", id, { changes, data }, { source: "updateEmployee" });
    }
  }
  return emp;
}

export async function getAllEmployees(branchId?: number, status?: string): Promise<Employee[]> {
  const conditions: any[] = [];
  if (branchId) conditions.push(eq(employeesTable.branchId, branchId));
  if (status) conditions.push(eq(employeesTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(employeesTable).where(where);
}

export async function getEmployeeById(id: number): Promise<Employee | undefined> {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  return emp;
}

export async function getEmployeesWithRelations(branchId?: number): Promise<any[]> {
  const rows = await db
    .select({
      id: employeesTable.id, employeeCode: employeesTable.employeeCode,
      fullName: employeesTable.fullName, status: employeesTable.status,
      hireDate: employeesTable.hireDate, phone: employeesTable.phone,
      baseSalary: employeesTable.baseSalary, managerId: employeesTable.managerId,
      positionTitle: positionsTable.title, departmentName: departmentsTable.name,
      branchId: employeesTable.branchId,
    })
    .from(employeesTable)
    .leftJoin(positionsTable, eq(employeesTable.positionId, positionsTable.id))
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .where(branchId ? eq(employeesTable.branchId, branchId) : undefined);
  return rows;
}
