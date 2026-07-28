export interface Department {
  id: number; code: string | null; name: string; description: string | null;
  parentId: number | null; headPositionId: number | null; managerEmployeeId: number | null;
  branchId: number; sortOrder: number; isActive: boolean; createdAt: string;
}
export interface Position {
  id: number; positionCode: string | null; title: string; departmentId: number | null;
  grade: string | null; level: string | null; reportsToPositionId: number | null;
  successorPositionId: number | null; baseSalary: string; responsibilities: string | null;
  requiredSkills: string | null; competencyTags: string | null; minExperience: number | null;
  employmentType: string; status: string; sortOrder: number;
  isActive: boolean; createdAt: string;
  departmentName?: string | null;
}
export interface PositionTreeNode extends Position {
  children: PositionTreeNode[];
  employeeCount?: number;
  departmentName?: string | null;
}
export interface PositionStats {
  positionId: number; title: string; employeeCount: number;
  departmentCount: number; vacantCount: number; avgTenureMonths: number;
}
export interface PositionSuggestion {
  type: "create_position" | "missing_manager" | "level_gap" | "overloaded";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  departmentId?: number;
  departmentName?: string;
  suggestedLevel?: string;
}
export interface Employee {
  id: number; employeeCode: string; fullName: string; status: string; photoUrl: string | null;
  positionId: number | null; departmentId: number | null; branchId: number; warehouseId: number | null;
  hireDate: string; phone: string | null; baseSalary: string; managerId: number | null;
  employmentType: string; userId: number | null; costCenter: string | null; shiftGroup: string | null;
  probationEndDate: string | null;
  positionTitle?: string | null; positionLevel?: string | null; positionGrade?: string | null;
  departmentName?: string | null; branchName?: string | null;
}
export interface EmployeeProfile extends Employee {
  resignationDate: string | null;
  nationalIdType: string | null; idNumber: string | null;
  address: string | null;
  emergencyContactName: string | null; emergencyContactPhone: string | null;
  bankName: string | null; bankAccount: string | null; taxId: string | null;
  managerName: string | null;
  posUser: { id: number; name: string; email: string; role: string } | null;
  warehouse: { id: number; name: string } | null;
  timeline: EmployeeTimelineEvent[];
  documents: EmployeeDocument[];
  assignments: EmployeeAssignment[];
  createdAt: string; updatedAt: string;
}
export interface EmployeeTimelineEvent {
  id: number; eventType: string; data: any; metadata: any; createdAt: string;
}
export interface EmployeeDocument {
  id: number; employeeId: number; docType: string; docName: string;
  fileUrl: string | null; status: string; uploadedAt: string | null;
  expiresAt: string | null; notes: string | null; createdAt: string;
}
export interface EmployeeAssignment {
  id: number; employeeId: number; assignmentType: string;
  targetId: number | null; targetName: string | null;
  isPrimary: boolean; startDate: string; endDate: string | null; createdAt: string;
}
export interface EmployeeExplorerResult {
  data: Employee[]; total: number; page: number; limit: number; totalPages: number;
}
export interface EmployeeExplorerStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byEmploymentType: { employment_type: string; count: number }[];
  byDepartment: { department_name: string; count: number }[];
  byBranch: { branch_name: string; count: number }[];
  docStats: { doc_type: string; status: string; count: number }[];
}
export interface EmployeeAISuggestion {
  type: string; severity: "info" | "warning" | "critical";
  title: string; detail: string; employeeId?: number; employeeName?: string;
}
export interface HrDashboard {
  totalEmployees: number;
  byBranch: Record<string, number>;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  validationScore: number;
  validationLabel: string;
  recentEvents: number;
  attendance: { present: number; late: number; onLeave: number; overtimeToday: number; totalToday: number };
  pendingLeaves: number;
}
export interface HrValidationCheck {
  name: string; status: "passed" | "info" | "warning" | "failed"; detail: string; count?: number;
}
export interface HrValidation {
  checks: HrValidationCheck[]; totalChecks: number; passedChecks: number;
  failedChecks: number; overallScore: number; overallLabel: string;
}
export interface OrgNode {
  id: number; name: string; type: "department" | "employee";
  title?: string; children?: OrgNode[]; managerId?: number;
}
export interface HrEvent {
  id: number; eventType: string; aggregateType: string;
  aggregateId: number; data: any; createdAt: string;
}
export interface AttendanceRecord {
  id: number; employeeId: number; checkIn: string | null; checkOut: string | null;
  status: string; lateMinutes: number; overtimeMinutes: number; employeeName?: string;
  employeeCode?: string; branchId?: number; departmentId?: number; positionId?: number;
  overtimeStart?: string | null; overtimeEnd?: string | null;
  breakStart?: string | null; breakEnd?: string | null;
  earlyLeaveMinutes?: number;
}
export interface AttendanceSummary {
  present: number; late: number; onLeave: number; overtimeToday: number; totalToday: number;
}
export interface AttendanceMissingCheckout {
  id: number; employeeId: number; employeeName: string | null;
  employeeCode: string | null; branchId: number; checkIn: string | null; status: string;
}
export interface AttendanceOvertimeActive {
  id: number; employeeId: number; employeeName: string | null;
  employeeCode: string | null; branchId: number; overtimeStart: string | null; status: string;
}
export interface AttendanceHistoryRow {
  id: number; employeeId: number; employeeName: string | null; employeeCode: string | null;
  date: string; checkIn: string | null; checkOut: string | null;
  status: string; lateMinutes: number | null; earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null; breakStart: string | null; breakEnd: string | null;
  notes: string | null;
}
export interface AttendanceHistoryResult {
  data: AttendanceHistoryRow[]; total: number; page: number; limit: number; pages: number;
}
export interface AttendanceAnalytics {
  statusBreakdown: { present: number; late: number; absent: number; leave: number; halfDay: number; total: number };
  overtimeStats: { totalOvertimeMinutes: number; employeesWithOvertime: number };
  punctuality: { avgLateMinutes: number; maxLateMinutes: number };
  daily: { date: string; present: number; late: number; absent: number; leave: number }[];
}
export interface LeaveRequest {
  id: number; employeeId: number; employeeName?: string; employeeCode?: string;
  departmentId?: number; leaveType: string; startDate: string;
  endDate: string; totalDays: number; reason: string | null; status: string;
  approvedBy: number | null; approvedAt: string | null; createdAt: string;
}
export interface LeaveCalendarEntry {
  id: number; employeeId: number; employeeName: string | null;
  leaveType: string; startDate: string; endDate: string;
  totalDays: number; status: string;
}
export interface LeaveBalance {
  quota: { annual: number; sick: number; permission: number };
  used: { annual: number; sick: number; permission: number; maternity: number; paternity: number; unpaid: number; totalDays: number };
  pending: { annual: number; sick: number; permission: number };
  remaining: { annual: number; sick: number; permission: number };
}
export interface LeaveAnalytics {
  byType: { annual: number; sick: number; permission: number; maternity: number; paternity: number; unpaid: number; total: number; totalDays: number };
  byStatus: { submitted: number; approved: number; rejected: number; cancelled: number; completed: number };
  monthly: { month: string; count: number; totalDays: number }[];
}
export interface ManagerChainNode {
  id: number; fullName: string; managerId: number | null; title: string;
}
export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  managerName?: string | null;
  positionCount?: number;
  employeeCount?: number;
}
export interface OrgChartData {
  id: number; name: string; title: string; level: string | null;
  departmentName: string | null; employeeCount: number;
  spanOfControl: number; vacantPositions: number;
  avgTenureMonths: number; status: string;
  reportsTo: number | null; children: OrgChartData[];
  competencyTags: string | null; grade: string | null;
}
export interface OrgAnalytics {
  totalDepartments: number; totalPositions: number; totalEmployees: number;
  vacantPositions: number; avgSpanOfControl: number; hierarchyDepth: number;
  departments: { name: string; employeeCount: number; positionCount: number; vacantCount: number }[];
  levelDistribution: { level: string; count: number }[];
}
export interface OrgSuggestion {
  type: string; severity: "info" | "warning" | "critical";
  title: string; detail: string;
}

/* ── Recruitment (HR-05) ── */
export interface JobPosting {
  id: number; title: string; positionId: number | null; positionTitle?: string | null;
  departmentId: number | null; branchId: number | null;
  employmentType: string; status: string; openings: number;
  postedAt: string | null; createdAt: string; candidateCount?: number;
}
export interface Candidate {
  id: number; fullName: string; email: string | null; phone: string | null;
  jobPostingId: number | null; jobTitle?: string | null;
  source: string | null; status: string; rating: number | null;
  notes: string | null; rejectReason: string | null;
  hiredEmployeeId: number | null; appliedAt: string | null;
  hiredAt: string | null; createdAt: string;
}
export interface CandidateResult {
  data: Candidate[]; total: number; page: number; limit: number; pages: number;
}
export interface Interview {
  id: number; candidateId: number; candidateName?: string | null;
  interviewerId: number | null; interviewerName?: string | null;
  scheduledAt: string; duration: number | null;
  interviewType: string; status: string;
  feedback: string | null; recommendation: string | null;
  score: number | null; createdAt: string;
}
export interface RecruitmentAnalytics {
  pipeline: { total: number; applied: number; screening: number; interviewScheduled: number; interviewed: number; offerPending: number; hired: number; rejected: number };
  bySource: { referral: number; jobBoard: number; website: number; social: number; walkIn: number };
  avgRating: number;
  jobStats: { total: number; open: number; draft: number; closed: number };
}
