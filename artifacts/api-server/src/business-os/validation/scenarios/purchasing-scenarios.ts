import type { BusinessScenario } from "../types";

export const purchasingScenarios: BusinessScenario[] = [
  {
    id: "pur-001", name: "Supplier Price Hike", domain: "purchasing",
    description: "Supplier menaikkan harga bahan baku secara signifikan",
    trigger: { type: "event", eventType: "purchasing.price_hike", data: { supplierId: 502, supplierName: "PT Bahan Baku Utama", productId: 401, oldPrice: 12000, newPrice: 15600, increasePct: 30, effectiveDate: "2026-08-01", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_purchasing", "cap_finance"],
    expectedActions: ["NegotiatePrice", "FindAlternative"], expectedEvents: ["purchasing.negotiation_started"],
    priority: "high", tags: ["purchasing", "supplier", "cost"],
  },
  {
    id: "pur-002", name: "Purchase Order Approval", domain: "purchasing",
    description: "Purchase order besar menunggu approval",
    trigger: { type: "event", eventType: "purchasing.po_approval_needed", data: { poId: "PO-2026-07-1001", supplierId: 503, totalAmount: 85000000, items: [{ productId: 401, qty: 1000, unitPrice: 45000 }, { productId: 402, qty: 500, unitPrice: 80000 }], requestedBy: "Warehouse Manager", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_purchasing", "cap_finance"],
    expectedActions: ["ReviewAndApprove", "CheckBudget"], expectedEvents: ["purchasing.po_approved"],
    priority: "high", tags: ["purchasing", "approval", "finance"],
  },
  {
    id: "pur-003", name: "Supplier Quality Issue", domain: "purchasing",
    description: "Kualitas bahan dari supplier tidak sesuai spesifikasi",
    trigger: { type: "event", eventType: "purchasing.quality_issue", data: { supplierId: 504, supplierName: "PT Logistik Nusantara", productId: 403, defectRate: 8.5, acceptableRate: 2.0, batchId: "B2026-07-16", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_purchasing"],
    expectedActions: ["ReturnBatch", "SupplierReview"], expectedEvents: ["purchasing.batch_returned", "purchasing.supplier_evaluated"],
    priority: "high", tags: ["purchasing", "quality", "supplier"],
  },
  {
    id: "pur-004", name: "Contract Renewal", domain: "purchasing",
    description: "Kontrak dengan supplier utama akan berakhir",
    trigger: { type: "event", eventType: "purchasing.contract_expiring", data: { supplierId: 505, supplierName: "PT Distribusi Sejati", contractEnd: "2026-08-31", daysLeft: 35, annualValue: 500000000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_purchasing"],
    expectedActions: ["EvaluateContract", "RenegotiateTerms"], expectedEvents: ["purchasing.contract_reviewed"],
    priority: "normal", tags: ["purchasing", "contract", "supplier"],
  },
  {
    id: "pur-005", name: "Emergency Procurement", domain: "purchasing",
    description: "Kebutuhan mendesak yang tidak dapat ditunda",
    trigger: { type: "event", eventType: "purchasing.emergency", data: { itemId: 404, itemName: "Box Kemasan Premium", quantity: 5000, reason: "Big order dari klien utama", requiredBy: "2026-07-29", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_purchasing", "cap_sales"],
    expectedActions: ["EmergencyOrder", "SourceSupplier"], expectedEvents: ["purchasing.emergency_order_placed"],
    priority: "critical", tags: ["purchasing", "emergency", "sales"],
  },
];
