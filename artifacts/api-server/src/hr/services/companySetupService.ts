import { db, pool, branchesTable, usersTable, userBranchesTable, departmentsTable, positionsTable, employeesTable, warehousesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface WizardState {
  id: number; currentStep: number; status: string;
  companyName: string | null; companyAddress: string | null;
  companyTimezone: string; companyCurrency: string; fiscalYearStart: number;
  logoUrl: string | null;
  step1Done: boolean;
  step2Data: any[]; step3Data: any[]; step4Data: any[];
  step5Data: any[]; step6Data: any[]; step7Data: any[];
  step8Data: any[];
}

export interface WizardStepData {
  branches: { id: number; name: string; warehouseId: number | null; warehouseName: string | null; active: boolean }[];
  posUsers: { id: number; name: string; email: string; role: string; branches: number[] }[];
  departments: { id: number; name: string; code: string | null; parentId: number | null }[];
  positions: { id: number; title: string; level: string | null; departmentId: number | null }[];
  warehouses: { id: number; name: string; branchId: number | null }[];
}

export async function getOrCreateWizard(): Promise<WizardState> {
  const [existing] = await db.select().from(sql`company_setup`.mapTable ? sql`company_setup` : sql`company_setup`)
    .where(eq(sql`status`, "in_progress")).limit(1) as any[];
  if (existing) return existing as WizardState;

  const result = await db.execute(sql`
    INSERT INTO company_setup (current_step, status) VALUES (1, 'in_progress') RETURNING *
  `);
  return (result as any).rows[0] as WizardState;
}

export async function getWizardState(): Promise<any> {
  const result = await pool.query(`SELECT * FROM company_setup WHERE status = 'in_progress' ORDER BY id DESC LIMIT 1`);
  if (result.rows.length === 0) {
    const created = await pool.query(
      `INSERT INTO company_setup (current_step, status) VALUES (1, 'in_progress') RETURNING *`
    );
    return created.rows[0];
  }
  return result.rows[0];
}

export async function getWizardData(): Promise<WizardStepData> {
  const branchRows = await db.select({
    id: branchesTable.id, name: branchesTable.name,
  }).from(branchesTable);

  const warehouses = await db.select().from(warehousesTable);
  const warehouseMap = new Map<number, { id: number; name: string; branchId: number | null }>();
  for (const w of warehouses) warehouseMap.set(w.branchId ?? 0, { id: w.id, name: w.name, branchId: w.branchId });

  const branches = branchRows.map(b => ({
    id: b.id, name: b.name,
    warehouseId: warehouseMap.get(b.id)?.id ?? null,
    warehouseName: warehouseMap.get(b.id)?.name ?? null,
    active: true,
  }));

  const userRows = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
  }).from(usersTable);

  const userBranchRows = await db.select().from(userBranchesTable);
  const userBranchMap = new Map<number, number[]>();
  for (const ub of userBranchRows) {
    const arr = userBranchMap.get(ub.userId) || [];
    arr.push(ub.branchId);
    userBranchMap.set(ub.userId, arr);
  }

  const posUsers = userRows.map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    branches: userBranchMap.get(u.id) || [],
  }));

  const deptRows = await db.select({
    id: departmentsTable.id, name: departmentsTable.name,
    code: departmentsTable.code, parentId: departmentsTable.parentId,
  }).from(departmentsTable);

  const posRows = await db.select({
    id: positionsTable.id, title: positionsTable.title,
    level: positionsTable.level, departmentId: positionsTable.departmentId,
  }).from(positionsTable);

  return {
    branches, posUsers,
    departments: deptRows, positions: posRows,
    warehouses: warehouses.map(w => ({ id: w.id, name: w.name, branchId: w.branchId })),
  };
}

export async function saveStep(step: number, data: any): Promise<void> {
  if (step === 1) {
    await pool.query(`
      UPDATE company_setup SET
        company_name = $1,
        company_address = $2,
        company_timezone = $3,
        company_currency = $4,
        fiscal_year_start = $5,
        logo_url = $6,
        step1_done = true,
        current_step = GREATEST(current_step, 2),
        updated_at = NOW()
      WHERE status = 'in_progress'
    `, [data.companyName || null, data.companyAddress || null, data.companyTimezone || 'Asia/Jakarta', data.companyCurrency || 'IDR', data.fiscalYearStart || 1, data.logoUrl || null]);
  } else {
    const jsonStr = JSON.stringify(data);
    const col = `step${step}_data`;
    await pool.query(`
      UPDATE company_setup SET
        ${col} = $1::jsonb,
        current_step = GREATEST(current_step, $2),
        updated_at = NOW()
      WHERE status = 'in_progress'
    `, [jsonStr, step + 1]);
  }
}

export async function finalizeWizard(): Promise<{ success: boolean; summary: any }> {
  const state = await getWizardState();

  const depts = (state as any).step3_data || [];
  const positions = (state as any).step4_data || [];
  const orgChart = (state as any).step5_data || [];
  const userMapping = (state as any).step6_data || [];

  let deptsCreated = 0;
  for (const d of depts) {
    const exists = await db.select({ id: departmentsTable.id }).from(departmentsTable)
      .where(eq(departmentsTable.name, d.name)).limit(1);
    if (exists.length === 0) {
      await db.insert(departmentsTable).values({
        name: d.name, code: d.code || null,
        branchId: d.branchId || 1,
        parentId: d.parentId || null,
        isActive: true, sortOrder: d.sortOrder || 0,
      });
      deptsCreated++;
    }
  }

  let positionsCreated = 0;
  const deptRows = await db.select().from(departmentsTable);
  const deptMap = new Map<string, number>();
  for (const d of deptRows) deptMap.set(d.name, d.id);

  for (const p of positions) {
    const exists = await db.select({ id: positionsTable.id }).from(positionsTable)
      .where(eq(positionsTable.title, p.title)).limit(1);
    if (exists.length === 0) {
      const deptId = p.departmentName ? deptMap.get(p.departmentName) || null : null;
      await db.insert(positionsTable).values({
        title: p.title, level: p.level || null,
        departmentId: deptId, grade: p.grade || null,
        reportsToPositionId: p.reportsToPositionId || null,
        status: "active", sortOrder: p.sortOrder || 0,
        employmentType: "full_time",
      });
      positionsCreated++;
    }
  }

  let employeesCreated = 0;
  const posRows2 = await db.select().from(positionsTable);
  const posMap = new Map<string, number>();
  for (const p of posRows2) posMap.set(p.title, p.id);

  for (const m of userMapping) {
    if (m.skip) continue;
    const exists = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(eq(employeesTable.userId, m.userId)).limit(1);
    if (exists.length === 0) {
      const empCode = `EMP-${String(m.userId).padStart(4, "0")}`;
      await db.insert(employeesTable).values({
        userId: m.userId, employeeCode: empCode,
        fullName: m.name || `User ${m.userId}`,
        positionId: m.positionTitle ? posMap.get(m.positionTitle) || null : null,
        departmentId: m.departmentName ? deptMap.get(m.departmentName) || null : null,
        branchId: m.branchId || 1,
        hireDate: new Date().toISOString().split("T")[0],
        status: "active", baseSalary: "0",
      });
      employeesCreated++;
    }
  }

  await pool.query(
    `UPDATE company_setup SET status = 'completed', updated_at = NOW() WHERE status = 'in_progress'`
  );

  return {
    success: true,
    summary: { deptsCreated, positionsCreated, employeesCreated },
  };
}

export async function getWizardStatus(): Promise<{ completed: boolean; step: number; companyName: string | null }> {
  const result = await pool.query(`SELECT status, current_step, company_name FROM company_setup ORDER BY id DESC LIMIT 1`);
  const rows = result.rows;
  if (rows.length === 0) return { completed: false, step: 1, companyName: null };
  return {
    completed: rows[0].status === "completed",
    step: rows[0].current_step,
    companyName: rows[0].company_name,
  };
}
