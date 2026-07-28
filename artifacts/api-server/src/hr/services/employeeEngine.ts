import {
  db, pool, employeesTable, departmentsTable, positionsTable, branchesTable,
  usersTable, userBranchesTable, warehousesTable, hrEventsTable,
  employeeDocumentsTable, employeeAssignmentsTable,
  EMPLOYEE_DOC_TYPES, ASSIGNMENT_TYPES, EMPLOYEE_STATUS, VALID_TRANSITIONS,
} from "@workspace/db";
import { eq, and, sql, desc, ilike, or, inArray } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

// ── Explorer ──
export async function getEmployeeExplorer(filters: {
  search?: string; branchId?: number; departmentId?: number;
  positionId?: number; status?: string; employmentType?: string;
  managerId?: number; page?: number; limit?: number;
}) {
  const { search, branchId, departmentId, positionId, status, employmentType, managerId, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (search) conditions.push(or(
    ilike(employeesTable.fullName, `%${search}%`),
    ilike(employeesTable.employeeCode, `%${search}%`),
    ilike(employeesTable.phone, `%${search}%`),
  ));
  if (branchId) conditions.push(eq(employeesTable.branchId, branchId));
  if (departmentId) conditions.push(eq(employeesTable.departmentId, departmentId));
  if (positionId) conditions.push(eq(employeesTable.positionId, positionId));
  if (status) conditions.push(eq(employeesTable.status, status));
  if (employmentType) conditions.push(eq(employeesTable.employmentType, employmentType));
  if (managerId) conditions.push(eq(employeesTable.managerId, managerId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int as total FROM employees ${where ? "WHERE " + where.toSQL().sql : ""}`,
    where ? where.toSQL().params : []
  );
  const total = countResult.rows[0]?.total || 0;

  const rows = await db.select({
    id: employeesTable.id, employeeCode: employeesTable.employeeCode,
    fullName: employeesTable.fullName, photoUrl: employeesTable.photoUrl,
    status: employeesTable.status, hireDate: employeesTable.hireDate,
    phone: employeesTable.phone, baseSalary: employeesTable.baseSalary,
    employmentType: employeesTable.employmentType,
    positionTitle: positionsTable.title, positionLevel: positionsTable.level,
    departmentName: departmentsTable.name,
    branchId: employeesTable.branchId,
    managerId: employeesTable.managerId,
    userId: employeesTable.userId,
    createdAt: employeesTable.createdAt,
  })
    .from(employeesTable)
    .leftJoin(positionsTable, eq(employeesTable.positionId, positionsTable.id))
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .where(where)
    .orderBy(desc(employeesTable.createdAt))
    .limit(limit)
    .offset(offset);

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── Full Profile ──
export async function getEmployeeProfile(id: number) {
  const [emp] = await db.select({
    id: employeesTable.id, employeeCode: employeesTable.employeeCode,
    fullName: employeesTable.fullName, photoUrl: employeesTable.photoUrl,
    status: employeesTable.status, hireDate: employeesTable.hireDate,
    resignationDate: employeesTable.resignationDate,
    probationEndDate: employeesTable.probationEndDate,
    employmentType: employeesTable.employmentType,
    costCenter: employeesTable.costCenter, shiftGroup: employeesTable.shiftGroup,
    nationalIdType: employeesTable.nationalIdType, idNumber: employeesTable.idNumber,
    phone: employeesTable.phone, address: employeesTable.address,
    emergencyContactName: employeesTable.emergencyContactName,
    emergencyContactPhone: employeesTable.emergencyContactPhone,
    bankName: employeesTable.bankName, bankAccount: employeesTable.bankAccount,
    taxId: employeesTable.taxId, baseSalary: employeesTable.baseSalary,
    positionId: employeesTable.positionId, departmentId: employeesTable.departmentId,
    managerId: employeesTable.managerId, branchId: employeesTable.branchId,
    warehouseId: employeesTable.warehouseId, userId: employeesTable.userId,
    createdAt: employeesTable.createdAt, updatedAt: employeesTable.updatedAt,
    positionTitle: positionsTable.title, positionLevel: positionsTable.level,
    positionGrade: positionsTable.grade,
    departmentName: departmentsTable.name,
    branchName: branchesTable.name,
    managerName: sql<string>`(SELECT e2.full_name FROM employees e2 WHERE e2.id = ${employeesTable.managerId})`,
  })
    .from(employeesTable)
    .leftJoin(positionsTable, eq(employeesTable.positionId, positionsTable.id))
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
    .where(eq(employeesTable.id, id));
  if (!emp) return null;

  const posUser = emp.userId ? await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.id, emp.userId)).then(r => r[0] || null) : null;

  const warehouse = emp.warehouseId ? await db.select({
    id: warehousesTable.id, name: warehousesTable.name,
  }).from(warehousesTable).where(eq(warehousesTable.id, emp.warehouseId)).then(r => r[0] || null) : null;

  const timeline = await getEmployeeTimeline(id);
  const documents = await getEmployeeDocuments(id);
  const assignments = await getEmployeeAssignments(id);

  return { ...emp, posUser, warehouse, timeline, documents, assignments };
}

// ── Timeline ──
export async function getEmployeeTimeline(employeeId: number) {
  return db.select({
    id: hrEventsTable.id, eventType: hrEventsTable.eventType,
    data: hrEventsTable.data, metadata: hrEventsTable.metadata,
    createdAt: hrEventsTable.createdAt,
  })
    .from(hrEventsTable)
    .where(eq(hrEventsTable.aggregateId, employeeId))
    .orderBy(desc(hrEventsTable.createdAt));
}

// ── Documents ──
export async function getEmployeeDocuments(employeeId: number) {
  return db.select().from(employeeDocumentsTable)
    .where(eq(employeeDocumentsTable.employeeId, employeeId))
    .orderBy(employeeDocumentsTable.docType);
}

export async function upsertEmployeeDocument(employeeId: number, data: {
  docType: string; docName: string; fileUrl?: string; status?: string; expiresAt?: string; notes?: string;
}) {
  const [existing] = await db.select({ id: employeeDocumentsTable.id })
    .from(employeeDocumentsTable)
    .where(and(
      eq(employeeDocumentsTable.employeeId, employeeId),
      eq(employeeDocumentsTable.docType, data.docType),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(employeeDocumentsTable)
      .set({
        docName: data.docName, fileUrl: data.fileUrl,
        status: data.status || "uploaded",
        uploadedAt: data.fileUrl ? new Date() : undefined,
        expiresAt: data.expiresAt || undefined, notes: data.notes,
      })
      .where(eq(employeeDocumentsTable.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(employeeDocumentsTable)
      .values({
        employeeId, docType: data.docType, docName: data.docName,
        fileUrl: data.fileUrl, status: data.status || (data.fileUrl ? "uploaded" : "missing"),
        uploadedAt: data.fileUrl ? new Date() : undefined,
        expiresAt: data.expiresAt || undefined, notes: data.notes,
      })
      .returning();
    return created;
  }
}

// ── Assignments ──
export async function getEmployeeAssignments(employeeId: number) {
  return db.select().from(employeeAssignmentsTable)
    .where(eq(employeeAssignmentsTable.employeeId, employeeId))
    .orderBy(employeeAssignmentsTable.assignmentType);
}

export async function upsertEmployeeAssignment(employeeId: number, data: {
  assignmentType: string; targetId?: number; targetName?: string; isPrimary?: boolean;
  startDate?: string; endDate?: string;
}) {
  if (data.isPrimary) {
    await db.update(employeeAssignmentsTable)
      .set({ isPrimary: false })
      .where(and(
        eq(employeeAssignmentsTable.employeeId, employeeId),
        eq(employeeAssignmentsTable.assignmentType, data.assignmentType),
      ));
  }
  const [created] = await db.insert(employeeAssignmentsTable)
    .values({
      employeeId, assignmentType: data.assignmentType,
      targetId: data.targetId, targetName: data.targetName,
      isPrimary: data.isPrimary ?? false,
      startDate: data.startDate || new Date().toISOString().split("T")[0],
      endDate: data.endDate,
    })
    .returning();
  return created;
}

export async function deleteEmployeeAssignment(id: number) {
  await db.delete(employeeAssignmentsTable).where(eq(employeeAssignmentsTable.id, id));
}

// ── AI Employee Officer ──
export async function getEmployeeAISuggestions(employeeId?: number) {
  const suggestions: { type: string; severity: "info" | "warning" | "critical"; title: string; detail: string; employeeId?: number; employeeName?: string }[] = [];

  const employees = await db.select({
    id: employeesTable.id, fullName: employeesTable.fullName,
    status: employeesTable.status, managerId: employeesTable.managerId,
    positionId: employeesTable.positionId, departmentId: employeesTable.departmentId,
    warehouseId: employeesTable.warehouseId, userId: employeesTable.userId,
    probationEndDate: employeesTable.probationEndDate,
    hireDate: employeesTable.hireDate, branchId: employeesTable.branchId,
  }).from(employeesTable)
    .where(employeeId ? eq(employeesTable.id, employeeId) : eq(employeesTable.status, "active"));

  for (const emp of employees) {
    if (!emp.managerId && emp.status === "active") {
      suggestions.push({
        type: "no_manager", severity: "warning",
        title: "No Manager Assigned",
        detail: `${emp.fullName} tidak punya manager. Assign manager untuk reporting hierarchy.`,
        employeeId: emp.id, employeeName: emp.fullName,
      });
    }
    if (!emp.positionId) {
      suggestions.push({
        type: "no_position", severity: "warning",
        title: "No Position Assigned",
        detail: `${emp.fullName} belum assign ke posisi. Assign position untuk role clarity.`,
        employeeId: emp.id, employeeName: emp.fullName,
      });
    }
    if (!emp.departmentId) {
      suggestions.push({
        type: "no_department", severity: "info",
        title: "No Department",
        detail: `${emp.fullName} belum assign ke departemen.`,
        employeeId: emp.id, employeeName: emp.fullName,
      });
    }
    if (!emp.warehouseId && emp.status === "active") {
      suggestions.push({
        type: "no_warehouse", severity: "info",
        title: "No Warehouse Assignment",
        detail: `${emp.fullName} belum assign ke gudang.`,
        employeeId: emp.id, employeeName: emp.fullName,
      });
    }
    if (!emp.userId) {
      suggestions.push({
        type: "no_pos_account", severity: "critical",
        title: "No POS Account Linked",
        detail: `${emp.fullName} belum terhubung ke akun POS. Identity integration incomplete.`,
        employeeId: emp.id, employeeName: emp.fullName,
      });
    }
    if (emp.probationEndDate) {
      const probDate = new Date(emp.probationEndDate);
      const now = new Date();
      const daysLeft = Math.ceil((probDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        suggestions.push({
          type: "probation_expired", severity: "critical",
          title: "Probation Expired",
          detail: `${emp.fullName} masa percobaan sudah berakhir ${Math.abs(daysLeft)} hari lalu. Status perlu diupdate.`,
          employeeId: emp.id, employeeName: emp.fullName,
        });
      } else if (daysLeft <= 14) {
        suggestions.push({
          type: "probation_expiring", severity: "warning",
          title: "Probation Expiring Soon",
          detail: `${emp.fullName} masa percobaan berakhir dalam ${daysLeft} hari.`,
          employeeId: emp.id, employeeName: emp.fullName,
        });
      }
    }
  }

  const empDocs = await db.select({
    employeeId: employeeDocumentsTable.employeeId,
    status: employeeDocumentsTable.status,
    docType: employeeDocumentsTable.docType,
  }).from(employeeDocumentsTable);

  const docsByEmp = new Map<number, Map<string, string>>();
  for (const d of empDocs) {
    if (!docsByEmp.has(d.employeeId)) docsByEmp.set(d.employeeId, new Map());
    docsByEmp.get(d.employeeId)!.set(d.docType, d.status);
  }

  for (const emp of employees) {
    const empDocs = docsByEmp.get(emp.id);
    for (const docType of ["KTP", "NPWP", "Contract"]) {
      if (!empDocs?.has(docType) || empDocs.get(docType) === "missing") {
        suggestions.push({
          type: "missing_document", severity: "warning",
          title: `Missing ${docType}`,
          detail: `${emp.fullName} belum upload ${docType}.`,
          employeeId: emp.id, employeeName: emp.fullName,
        });
      }
    }
  }

  return suggestions.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Status Management ──
export async function changeEmployeeStatus(id: number, newStatus: string, reason?: string) {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) throw new Error("Employee not found");
  const allowed = VALID_TRANSITIONS[emp.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${emp.status} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`);
  }
  const updateData: any = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "resigned" || newStatus === "terminated") updateData.resignationDate = new Date().toISOString().split("T")[0];
  const [updated] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, id)).returning();
  await publishHrEvent(`employee.${newStatus}`, "employee", id, { oldStatus: emp.status, newStatus, reason }, { source: "changeEmployeeStatus" });
  return updated;
}

// ── Create / Update ──
export async function createEmployee(data: any) {
  const code = `EMP-${String(Date.now()).slice(-6)}`;
  const [emp] = await db.insert(employeesTable).values({
    ...data, employeeCode: code, status: data.status || "candidate",
  }).returning();
  await publishHrEvent("employee.hired", "employee", emp.id, {
    fullName: emp.fullName, positionId: emp.positionId, departmentId: emp.departmentId,
    status: emp.status, branchId: emp.branchId,
  }, { source: "createEmployee" });
  return emp;
}

export async function updateEmployee(id: number, data: any) {
  const [emp] = await db.update(employeesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employeesTable.id, id))
    .returning();
  return emp;
}

// ── Explorer Stats ──
export async function getExplorerStats() {
  const total = await pool.query(`SELECT COUNT(*)::int as total FROM employees`);
  const byStatus = await pool.query(`SELECT status, COUNT(*)::int as count FROM employees GROUP BY status ORDER BY count DESC`);
  const byEmploymentType = await pool.query(`SELECT employment_type, COUNT(*)::int as count FROM employees GROUP BY employment_type ORDER BY count DESC`);
  const byDepartment = await pool.query(`
    SELECT d.name as department_name, COUNT(e.id)::int as count
    FROM employees e LEFT JOIN departments d ON e.department_id = d.id
    GROUP BY d.name ORDER BY count DESC
  `);
  const byBranch = await pool.query(`
    SELECT b.name as branch_name, COUNT(e.id)::int as count
    FROM employees e LEFT JOIN branches b ON e.branch_id = b.id
    GROUP BY b.name ORDER BY count DESC
  `);
  const docStats = await pool.query(`
    SELECT doc_type, status, COUNT(*)::int as count
    FROM employee_documents GROUP BY doc_type, status ORDER BY doc_type, status
  `);

  return {
    total: total.rows[0]?.total || 0,
    byStatus: byStatus.rows,
    byEmploymentType: byEmploymentType.rows,
    byDepartment: byDepartment.rows,
    byBranch: byBranch.rows,
    docStats: docStats.rows,
  };
}
