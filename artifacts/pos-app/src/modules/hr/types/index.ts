export interface Department {
  id: number; name: string; parentId: number | null;
  headPositionId: number | null; branchId: number; isActive: boolean; createdAt: string;
}
export interface Position {
  id: number; title: string; departmentId: number | null;
  grade: string | null; baseSalary: string; createdAt: string;
}
export interface Employee {
  id: number; employeeCode: string; fullName: string; status: string;
  positionId: number | null; departmentId: number | null; branchId: number;
  hireDate: string; phone: string | null; baseSalary: string;
  positionTitle?: string | null; departmentName?: string | null;
}
