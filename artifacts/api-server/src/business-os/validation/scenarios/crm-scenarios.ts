import type { BusinessScenario } from "../types";

export const crmScenarios: BusinessScenario[] = [
  {
    id: "crm-001", name: "Customer Complaint Escalated", domain: "crm",
    description: "Keluhan pelanggan naik ke level eskalasi",
    trigger: { type: "event", eventType: "crm.complaint_escalated", data: { complaintId: "CMP-2026-07-301", customerId: 405, customerName: "PT Makmur Sejahtera", issue: "Produk cacat 3 kali berturut-turut", priority: "high", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_crm", "cap_sales"],
    expectedActions: ["HandleComplaint", "CustomerRecovery"], expectedEvents: ["crm.complaint_resolved"],
    priority: "high", tags: ["crm", "customer-service", "quality"],
  },
  {
    id: "crm-002", name: "Customer Feedback Negative", domain: "crm",
    description: "Umpan balik pelanggan negatif di media sosial",
    trigger: { type: "event", eventType: "crm.negative_feedback", data: { customerId: 406, source: "Twitter", sentiment: "negative", content: "Produk cepat rusak, tidak sesuai iklan", reach: 15000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_crm", "cap_marketing"],
    expectedActions: ["RespondPublicly", "QualityCheck"], expectedEvents: ["crm.feedback_responded"],
    priority: "normal", tags: ["crm", "social-media", "brand"],
  },
  {
    id: "crm-003", name: "Loyalty Program Trigger", domain: "crm",
    description: "Pelanggan mencapai tier loyalty baru",
    trigger: { type: "event", eventType: "crm.loyalty_milestone", data: { customerId: 407, customerName: "Ahmad Fauzi", newTier: "Platinum", totalSpend: 150000000, rewardPoints: 75000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_crm", "cap_sales"],
    expectedActions: ["SendReward", "ExclusiveOffer"], expectedEvents: ["crm.reward_sent"],
    priority: "low", tags: ["crm", "loyalty", "retention"],
  },
  {
    id: "crm-004", name: "VIP Customer Visit", domain: "crm",
    description: "Pelanggan VIP akan mengunjungi cabang",
    trigger: { type: "event", eventType: "crm.vip_visit", data: { customerId: 408, customerName: "PT Konglomerat Group", visitDate: "2026-07-28", purpose: "Site inspection & partnership", estimatedValue: 500000000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_crm"],
    expectedActions: ["PrepareVisit", "ExecutiveHost"], expectedEvents: ["crm.visit_prepared"],
    priority: "high", tags: ["crm", "vip", "sales"],
  },
];
