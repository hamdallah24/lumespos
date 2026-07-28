import type { KPIValue, KPIAlert, DashboardSection } from "../types";

export class CKOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[]): DashboardSection[] {
    return [
      {
        id: "cko_knowledge_base_stats",
        title: "Knowledge Base Stats",
        type: "kpi_grid",
        data: {
          totalArticles: 342,
          publishedArticles: 298,
          draftArticles: 44,
          totalViews: 15600,
          avgRating: 4.2,
          topCategories: [
            { name: "Product Guide", articles: 85, views: 5200 },
            { name: "FAQ", articles: 62, views: 4100 },
            { name: "Troubleshooting", articles: 48, views: 3800 },
            { name: "Policies", articles: 35, views: 1500 },
          ],
        },
        order: 0,
      },
      {
        id: "cko_documentation_coverage",
        title: "Documentation Coverage",
        type: "kpi_grid",
        data: {
          overallCoverage: 73,
          byDepartment: [
            { department: "Sales", coverage: 82 },
            { department: "Operations", coverage: 78 },
            { department: "Technology", coverage: 71 },
            { department: "Finance", coverage: 65 },
            { department: "HR", coverage: 58 },
          ],
          gaps: [
            "Onboarding workflow not documented",
            "Disaster recovery plan outdated",
            "New API endpoints missing docs",
          ],
        },
        order: 1,
      },
      {
        id: "cko_learning_completion",
        title: "Learning Completion",
        type: "kpi_grid",
        data: {
          enrolledEmployees: 85,
          completedEmployees: 66,
          completionRate: 78,
          courses: [
            { name: "Safety Training", enrolled: 85, completed: 78, rate: 92 },
            { name: "Product Knowledge", enrolled: 72, completed: 58, rate: 81 },
            { name: "Leadership Program", enrolled: 20, completed: 13, rate: 65 },
            { name: "Technical Skills", enrolled: 35, completed: 26, rate: 74 },
            { name: "Compliance", enrolled: 80, completed: 70, rate: 88 },
          ],
        },
        order: 2,
      },
      {
        id: "cko_knowledge_gap_analysis",
        title: "Knowledge Gap Analysis",
        type: "narrative_block",
        data: {
          topGaps: [
            { area: "Cloud Infrastructure", urgency: "high", affectedTeams: ["Technology"] },
            { area: "Customer Onboarding", urgency: "medium", affectedTeams: ["Sales", "Support"] },
            { area: "Compliance Updates", urgency: "high", affectedTeams: ["All"] },
            { area: "Product Training", urgency: "medium", affectedTeams: ["Sales", "Marketing"] },
          ],
          recommendations: [
            "Create cloud infrastructure runbook",
            "Standardize onboarding SOP",
            "Schedule compliance refresher",
            "Monthly product training sessions",
          ],
        },
        order: 3,
      },
    ];
  }
}
