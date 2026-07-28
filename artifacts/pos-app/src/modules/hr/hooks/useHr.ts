import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type {
  Employee, Department, Position, HrDashboard, HrValidation,
  OrgNode, HrEvent, AttendanceRecord, AttendanceSummary, LeaveRequest, ManagerChainNode,
  DepartmentTreeNode, PositionTreeNode, PositionStats, PositionSuggestion,
  OrgChartData, OrgAnalytics, OrgSuggestion,
} from "../types";

export function useEmployees(branchId?: number) {
  return useQuery<Employee[]>({
    queryKey: ["hr", "employees", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/employees${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data karyawan");
      return res.json();
    },
  });
}

export function useEmployeeDetail(id: number | null) {
  return useQuery<Employee>({
    queryKey: ["hr", "employee", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil detail karyawan");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useDepartments(branchId?: number) {
  return useQuery<Department[]>({
    queryKey: ["hr", "departments", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/departments${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data departemen");
      return res.json();
    },
  });
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["hr", "positions"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/positions");
      if (!res.ok) throw new Error("Gagal mengambil data posisi");
      return res.json();
    },
  });
}

export function useHrDashboard(branchId?: number) {
  return useQuery<HrDashboard>({
    queryKey: ["hr", "dashboard", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/dashboard${params}`);
      if (!res.ok) throw new Error("Gagal mengambil dashboard HR");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useHrValidation(branchId?: number) {
  return useQuery<HrValidation>({
    queryKey: ["hr", "validation", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/validation${params}`);
      if (!res.ok) throw new Error("Gagal mengambil validasi HR");
      return res.json();
    },
  });
}

export function useOrgTree(branchId?: number) {
  return useQuery<OrgNode[]>({
    queryKey: ["hr", "org-tree", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/org-tree${params}`);
      if (!res.ok) throw new Error("Gagal mengambil struktur organisasi");
      return res.json();
    },
  });
}

export function useHrEvents() {
  return useQuery<HrEvent[]>({
    queryKey: ["hr", "events"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/events");
      if (!res.ok) throw new Error("Gagal mengambil event HR");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useAttendanceSummary() {
  return useQuery<AttendanceSummary>({
    queryKey: ["hr", "attendance", "summary"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/attendance/summary");
      if (!res.ok) throw new Error("Gagal mengambil ringkasan absensi");
      return res.json();
    },
    refetchInterval: 15000,
  });
}

export function useAttendanceToday() {
  return useQuery<AttendanceRecord[]>({
    queryKey: ["hr", "attendance", "today"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/attendance/today");
      if (!res.ok) throw new Error("Gagal mengambil absensi hari ini");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useAttendanceMissingCheckout() {
  return useQuery<any[]>({
    queryKey: ["hr", "attendance", "missing-checkout"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/attendance/missing-checkout");
      if (!res.ok) throw new Error("Gagal mengambil data missing checkout");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useAttendanceOvertimeActive() {
  return useQuery<any[]>({
    queryKey: ["hr", "attendance", "overtime-active"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/attendance/overtime-active");
      if (!res.ok) throw new Error("Gagal mengambil data lembur aktif");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useAttendanceHistory(opts?: {
  employeeId?: number; from?: string; to?: string;
  branchId?: number; status?: string; page?: number; limit?: number;
}) {
  return useQuery<any>({
    queryKey: ["hr", "attendance", "history", opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.employeeId) params.set("employeeId", String(opts.employeeId));
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);
      if (opts?.branchId) params.set("branchId", String(opts.branchId));
      if (opts?.status) params.set("status", opts.status);
      if (opts?.page) params.set("page", String(opts.page));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      const res = await apiFetch(`/api/hr/attendance/history${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil riwayat absensi");
      return res.json();
    },
  });
}

export function useAttendanceAnalytics(opts?: { from?: string; to?: string; branchId?: number }) {
  return useQuery<any>({
    queryKey: ["hr", "attendance", "analytics", opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);
      if (opts?.branchId) params.set("branchId", String(opts.branchId));
      const qs = params.toString();
      const res = await apiFetch(`/api/hr/attendance/analytics${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil analytics absensi");
      return res.json();
    },
  });
}

export function useAttendanceCorrect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiFetch(`/api/hr/attendance/${id}/correct`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Gagal koreksi absensi");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "attendance"] });
    },
  });
}

export function useLeaves(status?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ["hr", "leaves", status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await apiFetch(`/api/hr/leaves${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data cuti");
      return res.json();
    },
  });
}

export function useLeaveCalendar(month?: string) {
  return useQuery<any[]>({
    queryKey: ["hr", "leaves", "calendar", month],
    queryFn: async () => {
      const m = month || new Date().toISOString().slice(0, 7);
      const res = await apiFetch(`/api/hr/leaves/calendar?month=${m}`);
      if (!res.ok) throw new Error("Gagal mengambil kalender cuti");
      return res.json();
    },
  });
}

export function useLeaveBalance(employeeId: number | null) {
  return useQuery<any>({
    queryKey: ["hr", "leaves", "balance", employeeId],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/leaves/balance/${employeeId}`);
      if (!res.ok) throw new Error("Gagal mengambil saldo cuti");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

export function useTeamLeave(departmentId?: number, month?: string) {
  return useQuery<any[]>({
    queryKey: ["hr", "leaves", "team", departmentId, month],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentId) params.set("departmentId", String(departmentId));
      if (month) params.set("month", month);
      const qs = params.toString();
      const res = await apiFetch(`/api/hr/leaves/team${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data tim");
      return res.json();
    },
  });
}

export function useLeaveAnalytics(year?: string) {
  return useQuery<any>({
    queryKey: ["hr", "leaves", "analytics", year],
    queryFn: async () => {
      const params = year ? `?year=${year}` : "";
      const res = await apiFetch(`/api/hr/leaves/analytics${params}`);
      if (!res.ok) throw new Error("Gagal mengambil analytics cuti");
      return res.json();
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: number; leaveType: string; startDate: string; endDate: string; reason?: string }) => {
      const res = await apiFetch("/api/hr/leaves", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat cuti");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leaves"] }),
  });
}

export function useTransitionLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiFetch(`/api/hr/leaves/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Gagal update status cuti");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leaves"] }),
  });
}

export function useEmployeeTimeline(employeeId: number | null) {
  return useQuery<HrEvent[]>({
    queryKey: ["hr", "employee-timeline", employeeId],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${employeeId}/timeline`);
      if (!res.ok) throw new Error("Gagal mengambil timeline karyawan");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

export function useManagerChain(employeeId: number | null) {
  return useQuery<ManagerChainNode[]>({
    queryKey: ["hr", "manager-chain", employeeId],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${employeeId}/manager-chain`);
      if (!res.ok) throw new Error("Gagal mengambil rantai manajemen");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/hr/employees", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat karyawan");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await apiFetch(`/api/hr/leaves/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Gagal menyetujui cuti");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leaves"] }),
  });
}

export function useDepartmentTree(branchId?: number) {
  return useQuery<DepartmentTreeNode[]>({
    queryKey: ["hr", "department-tree", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/departments/tree${params}`);
      if (!res.ok) throw new Error("Gagal mengambil struktur departemen");
      return res.json();
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/hr/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat departemen");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiFetch(`/api/hr/departments/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengubah departemen");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/hr/departments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus departemen");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useMoveDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: number; parentId: number | null }) => {
      const res = await apiFetch(`/api/hr/departments/${id}/move`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memindahkan departemen");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function usePositionTree() {
  return useQuery<PositionTreeNode[]>({
    queryKey: ["hr", "position-tree"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/positions/tree");
      if (!res.ok) throw new Error("Gagal mengambil struktur posisi");
      return res.json();
    },
  });
}

export function usePositionStats() {
  return useQuery<PositionStats[]>({
    queryKey: ["hr", "position-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/positions/stats");
      if (!res.ok) throw new Error("Gagal mengambil statistik posisi");
      return res.json();
    },
  });
}

export function usePositionSuggestions() {
  return useQuery<PositionSuggestion[]>({
    queryKey: ["hr", "position-suggestions"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/positions/suggestions");
      if (!res.ok) throw new Error("Gagal mengambil saran posisi");
      return res.json();
    },
  });
}

export function usePositionDependencies(id: number | null) {
  return useQuery<{ employees: number; childPositions: number; deptHeads: number }>({
    queryKey: ["hr", "position-deps", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/positions/${id}/dependencies`);
      if (!res.ok) throw new Error("Gagal mengambil dependensi");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/hr/positions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat posisi");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiFetch(`/api/hr/positions/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengubah posisi");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/hr/positions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus posisi");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}

export function useOrgChart() {
  return useQuery<OrgChartData[]>({
    queryKey: ["hr", "org-chart"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/org/chart");
      if (!res.ok) throw new Error("Gagal mengambil diagram organisasi");
      return res.json();
    },
  });
}

export function useOrgAnalytics() {
  return useQuery<OrgAnalytics>({
    queryKey: ["hr", "org-analytics"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/org/analytics");
      if (!res.ok) throw new Error("Gagal mengambil analitik organisasi");
      return res.json();
    },
  });
}

export function useOrgSuggestions() {
  return useQuery<OrgSuggestion[]>({
    queryKey: ["hr", "org-suggestions"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/org/suggestions");
      if (!res.ok) throw new Error("Gagal mengambil saran organisasi");
      return res.json();
    },
  });
}

export function useOrgManagerChain(employeeId: number | null) {
  return useQuery<any[]>({
    queryKey: ["hr", "org-manager-chain", employeeId],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/org/manager-chain/${employeeId}`);
      if (!res.ok) throw new Error("Gagal mengambil rantai manajemen");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

// ── Employee Engine Hooks ──
import type {
  EmployeeExplorerResult, EmployeeExplorerStats, EmployeeProfile,
  EmployeeDocument, EmployeeAssignment, EmployeeAISuggestion,
} from "../types";

export function useEmployeeExplorer(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") params.set(k, String(v)); });
  const qs = params.toString();
  return useQuery<EmployeeExplorerResult>({
    queryKey: ["hr", "employee-explorer", filters],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil data karyawan");
      return res.json();
    },
  });
}

export function useEmployeeExplorerStats() {
  return useQuery<EmployeeExplorerStats>({
    queryKey: ["hr", "employee-explorer-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/employees/stats");
      if (!res.ok) throw new Error("Gagal mengambil statistik");
      return res.json();
    },
  });
}

export function useEmployeeProfile(id: number | null) {
  return useQuery<EmployeeProfile>({
    queryKey: ["hr", "employee-profile", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil profil karyawan");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useEmployeeDocuments(id: number | null) {
  return useQuery<EmployeeDocument[]>({
    queryKey: ["hr", "employee-documents", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${id}/documents`);
      if (!res.ok) throw new Error("Gagal mengambil dokumen");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useEmployeeAssignments(id: number | null) {
  return useQuery<EmployeeAssignment[]>({
    queryKey: ["hr", "employee-assignments", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/hr/employees/${id}/assignments`);
      if (!res.ok) throw new Error("Gagal mengambil penugasan");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useEmployeeAISuggestions(employeeId?: number) {
  return useQuery<EmployeeAISuggestion[]>({
    queryKey: ["hr", "employee-ai-suggestions", employeeId],
    queryFn: async () => {
      const params = employeeId ? `?employeeId=${employeeId}` : "";
      const res = await apiFetch(`/api/hr/employees/ai-suggestions${params}`);
      if (!res.ok) throw new Error("Gagal mengambil saran AI");
      return res.json();
    },
  });
}

export function useUpsertEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: number; data: any }) => {
      const res = await apiFetch(`/api/hr/employees/${employeeId}/documents`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal menyimpan dokumen");
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-profile", vars.id] });
      qc.invalidateQueries({ queryKey: ["hr", "employee-explorer"] });
    },
  });
}

/* ── Recruitment Hooks (HR-05) ── */

export function useJobPostings(branchId?: number, status?: string) {
  return useQuery<any[]>({
    queryKey: ["hr", "recruitment", "jobs", branchId, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await apiFetch(`/api/hr/recruitment/jobs${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil lowongan");
      return res.json();
    },
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; positionId?: number; departmentId?: number; branchId?: number; employmentType?: string; description?: string; requirements?: string; salaryRange?: string; openings?: number }) => {
      const res = await apiFetch("/api/hr/recruitment/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat lowongan");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useTransitionJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiFetch(`/api/hr/recruitment/jobs/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Gagal update status lowongan");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useCandidates(opts?: { jobPostingId?: number; status?: string; source?: string; page?: number; limit?: number }) {
  return useQuery<any>({
    queryKey: ["hr", "recruitment", "candidates", opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.jobPostingId) params.set("jobPostingId", String(opts.jobPostingId));
      if (opts?.status) params.set("status", opts.status);
      if (opts?.source) params.set("source", opts.source);
      if (opts?.page) params.set("page", String(opts.page));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      const res = await apiFetch(`/api/hr/recruitment/candidates${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Gagal mengambil kandidat");
      return res.json();
    },
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { jobPostingId?: number; fullName: string; email?: string; phone?: string; resumeUrl?: string; source?: string; notes?: string }) => {
      const res = await apiFetch("/api/hr/recruitment/candidates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat kandidat");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useTransitionCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiFetch(`/api/hr/recruitment/candidates/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Gagal update status kandidat");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useRateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number }) => {
      const res = await apiFetch(`/api/hr/recruitment/candidates/${id}/rate`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Gagal rating kandidat");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useInterviews(candidateId?: number) {
  return useQuery<any[]>({
    queryKey: ["hr", "recruitment", "interviews", candidateId],
    queryFn: async () => {
      const params = candidateId ? `?candidateId=${candidateId}` : "";
      const res = await apiFetch(`/api/hr/recruitment/interviews${params}`);
      if (!res.ok) throw new Error("Gagal mengambil wawancara");
      return res.json();
    },
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { candidateId: number; interviewerId?: number; scheduledAt: string; duration?: number; interviewType?: string }) => {
      const res = await apiFetch("/api/hr/recruitment/interviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat jadwal wawancara");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useCompleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feedback, recommendation, score }: { id: number; feedback?: string; recommendation?: string; score?: number }) => {
      const res = await apiFetch(`/api/hr/recruitment/interviews/${id}/complete`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, recommendation, score }),
      });
      if (!res.ok) throw new Error("Gagal menyelesaikan wawancara");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "recruitment"] }),
  });
}

export function useRecruitmentAnalytics() {
  return useQuery<any>({
    queryKey: ["hr", "recruitment", "analytics"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/recruitment/analytics");
      if (!res.ok) throw new Error("Gagal mengambil analytics rekrutmen");
      return res.json();
    },
  });
}

export function useUpsertEmployeeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: number; data: any }) => {
      const res = await apiFetch(`/api/hr/employees/${employeeId}/assignments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal menyimpan penugasan");
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-profile", vars.id] });
      qc.invalidateQueries({ queryKey: ["hr", "employee-explorer"] });
    },
  });
}

/* ── Workforce Analytics (HR-06) ── */

export function useWorkforceSummary() {
  return useQuery<any>({
    queryKey: ["hr", "workforce", "summary"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/workforce/summary");
      if (!res.ok) throw new Error("Gagal mengambil ringkasan workforce");
      return res.json();
    },
  });
}

export function useHeadcountTrend(months?: number) {
  return useQuery<any[]>({
    queryKey: ["hr", "workforce", "headcount-trend", months],
    queryFn: async () => {
      const params = months ? `?months=${months}` : "";
      const res = await apiFetch(`/api/hr/workforce/headcount-trend${params}`);
      if (!res.ok) throw new Error("Gagal mengambil headcount trend");
      return res.json();
    },
  });
}

export function useTurnoverStats(year?: string) {
  return useQuery<any>({
    queryKey: ["hr", "workforce", "turnover", year],
    queryFn: async () => {
      const params = year ? `?year=${year}` : "";
      const res = await apiFetch(`/api/hr/workforce/turnover${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data turnover");
      return res.json();
    },
  });
}

export function useTenureDistribution() {
  return useQuery<any[]>({
    queryKey: ["hr", "workforce", "tenure"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/workforce/tenure");
      if (!res.ok) throw new Error("Gagal mengambil distribusi masa kerja");
      return res.json();
    },
  });
}

export function useProbationStatus() {
  return useQuery<any>({
    queryKey: ["hr", "workforce", "probation"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/workforce/probation");
      if (!res.ok) throw new Error("Gagal mengambil data probation");
      return res.json();
    },
  });
}

export function useCostPerDepartment() {
  return useQuery<any[]>({
    queryKey: ["hr", "workforce", "cost-per-dept"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/workforce/cost-per-dept");
      if (!res.ok) throw new Error("Gagal mengambil data biaya per departemen");
      return res.json();
    },
  });
}

export function useDeleteEmployeeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiFetch(`/api/hr/employees/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus penugasan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-assignments"] });
      qc.invalidateQueries({ queryKey: ["hr", "employee-profile"] });
    },
  });
}

export function useUpdateEmployeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiFetch(`/api/hr/employees/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal mengupdate profil");
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-profile", vars.id] });
      qc.invalidateQueries({ queryKey: ["hr", "employee-explorer"] });
    },
  });
}

export function useChangeEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      const res = await apiFetch(`/api/hr/employees/${id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Gagal mengubah status"); }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-profile", vars.id] });
      qc.invalidateQueries({ queryKey: ["hr", "employee-explorer"] });
    },
  });
}
