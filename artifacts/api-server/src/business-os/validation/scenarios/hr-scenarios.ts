import type { BusinessScenario } from "../types";

export const hrScenarios: BusinessScenario[] = [
  {
    id: "hr-001", name: "Employee Resignation", domain: "hr",
    description: "Karyawan kunci mengundurkan diri",
    trigger: { type: "event", eventType: "hr.resignation", data: { employeeId: 501, name: "Siti Rahmawati", position: "Senior Sales Manager", department: "Sales", tenure: 5, noticePeriod: 30, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CHRO", expectedCapabilities: ["cap_hr"],
    expectedActions: ["SuccessionPlan", "RecruitmentRequest"], expectedEvents: ["hr.succession_planned", "hr.recruitment_requested"],
    priority: "high", tags: ["hr", "retention", "succession"],
  },
  {
    id: "hr-002", name: "Attendance Low Warning", domain: "hr",
    description: "Tingkat kehadiran karyawan di bawah standar",
    trigger: { type: "event", eventType: "hr.attendance_low", data: { department: "Produksi", attendanceRate: 72, targetRate: 95, period: "July 2026", affectedCount: 15, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CHRO", expectedCapabilities: ["cap_hr"],
    expectedActions: ["AttendanceReview", "WellnessProgram"], expectedEvents: ["hr.attendance_improvement_plan"],
    priority: "normal", tags: ["hr", "attendance", "productivity"],
  },
  {
    id: "hr-003", name: "Performance Review Due", domain: "hr",
    description: "Review kinerja tengah tahun sudah waktunya",
    trigger: { type: "event", eventType: "hr.performance_review", data: { period: "H1-2026", deadline: "2026-08-15", daysLeft: 20, employeeCount: 85, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CHRO", expectedCapabilities: ["cap_hr"],
    expectedActions: ["ScheduleReviews", "PrepareEvaluations"], expectedEvents: ["hr.review_scheduled"],
    priority: "normal", tags: ["hr", "performance", "evaluation"],
  },
  {
    id: "hr-004", name: "Training Need Identified", domain: "hr",
    description: "Kesenjangan skill terdeteksi di tim tertentu",
    trigger: { type: "event", eventType: "hr.training_need", data: { department: "IT", skillGap: "Cloud Infrastructure", affectedEmployees: 8, priority: "high", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CHRO", expectedCapabilities: ["cap_hr"],
    expectedActions: ["ArrangeTraining", "CertificationPlan"], expectedEvents: ["hr.training_arranged"],
    priority: "normal", tags: ["hr", "training", "skill-development"],
  },
  {
    id: "hr-005", name: "Overtime Exceeded", domain: "hr",
    description: "Jam lembur melebihi batas yang diizinkan",
    trigger: { type: "event", eventType: "hr.overtime_exceeded", data: { department: "Produksi", totalOvertime: 480, maxAllowed: 240, unit: "hours/month", affectedEmployees: 25, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CHRO", expectedCapabilities: ["cap_hr", "cap_production"],
    expectedActions: ["ReviewWorkload", "HireTemporary"], expectedEvents: ["hr.overtime_mitigated"],
    priority: "high", tags: ["hr", "overtime", "compliance", "production"],
  },
];
