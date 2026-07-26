import type { KPIValue, KPIAlert, DashboardSection } from "../types";

export class CHROBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[]): DashboardSection[] {
    return [
      {
        id: "chro_headcount_overview",
        title: "Headcount Overview",
        type: "kpi_grid",
        data: {
          headcount: kpiValues.find(k => k.kpiId === "kpi_headcount"),
          productivity: kpiValues.find(k => k.kpiId === "kpi_productivity"),
          departmentBreakdown: [
            { name: "Operations", count: 45 },
            { name: "Sales & Marketing", count: 28 },
            { name: "Technology", count: 22 },
            { name: "Finance", count: 12 },
            { name: "HR & Admin", count: 8 },
          ],
        },
        order: 0,
      },
      {
        id: "chro_attendance_rate",
        title: "Attendance Rate",
        type: "kpi_grid",
        data: {
          attendance: kpiValues.find(k => k.kpiId === "kpi_attendance"),
          average: 96.5,
          departmentRates: [
            { name: "Operations", rate: 94.2 },
            { name: "Sales & Marketing", rate: 97.1 },
            { name: "Technology", rate: 98.3 },
            { name: "Finance", rate: 99.0 },
            { name: "HR & Admin", rate: 98.5 },
          ],
        },
        order: 1,
      },
      {
        id: "chro_turnover_rate",
        title: "Turnover Rate",
        type: "kpi_grid",
        data: {
          turnover: kpiValues.find(k => k.kpiId === "kpi_turnover"),
          voluntary: 8.2,
          involuntary: 3.1,
          industryBenchmark: 12.0,
        },
        order: 2,
      },
      {
        id: "chro_overtime_analysis",
        title: "Overtime Analysis",
        type: "kpi_grid",
        data: {
          overtimePct: kpiValues.find(k => k.kpiId === "kpi_overtime_pct"),
          totalOvertimeHours: 320,
          costImpact: 18750000,
          topDepartments: ["Operations", "Sales & Marketing"],
        },
        order: 3,
      },
      {
        id: "chro_productivity_index",
        title: "Productivity Index",
        type: "kpi_grid",
        data: {
          productivity: kpiValues.find(k => k.kpiId === "kpi_productivity"),
          trend: "up",
          changePct: 3.2,
          perDepartment: [
            { name: "Technology", value: 450000 },
            { name: "Sales & Marketing", value: 380000 },
            { name: "Operations", value: 290000 },
          ],
        },
        order: 4,
      },
      {
        id: "chro_hiring_pipeline",
        title: "Hiring Pipeline",
        type: "kpi_grid",
        data: {
          openPositions: 14,
          activeCandidates: 47,
          offersExtended: 5,
          offersAccepted: 3,
          avgTimeToHire: 22,
          pipeline: [
            { role: "Senior Developer", stage: "interview", candidates: 6 },
            { role: "Marketing Manager", stage: "review", candidates: 4 },
            { role: "Finance Analyst", stage: "offer", candidates: 2 },
          ],
        },
        order: 5,
      },
      {
        id: "chro_training_completion",
        title: "Training Completion",
        type: "kpi_grid",
        data: {
          completionRate: 78,
          enrolledEmployees: 85,
          completedEmployees: 66,
          programs: [
            { name: "Safety Training", completion: 92 },
            { name: "Product Knowledge", completion: 81 },
            { name: "Leadership Program", completion: 65 },
            { name: "Technical Skills", completion: 74 },
          ],
        },
        order: 6,
      },
    ];
  }
}
