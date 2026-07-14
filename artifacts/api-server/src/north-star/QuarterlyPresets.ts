import type { NorthStarConfig } from "./NorthStarConfiguration";

export const QUARTERLY_PRESETS: Record<string, Partial<NorthStarConfig>> = {
  "Q1": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 20, target: 15, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 25, target: 65, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 15, target: 7, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 15, target: 95, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 10, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 10, target: 40, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 5, target: 4.5, unit: "/5", direction: "up" },
    ],
  },
  "Q2": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 30, target: 20, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 20, target: 60, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 10, target: 5, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 10, target: 95, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 10, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 10, target: 35, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 10, target: 4.8, unit: "/5", direction: "up" },
    ],
  },
  "Q3": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 25, target: 18, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 15, target: 70, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 20, target: 7, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 15, target: 97, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 10, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 10, target: 38, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 5, target: 4.5, unit: "/5", direction: "up" },
    ],
  },
  "Q4": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 15, target: 12, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 20, target: 65, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 10, target: 7, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 10, target: 95, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 20, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 15, target: 35, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 10, target: 4.8, unit: "/5", direction: "up" },
    ],
  },
  "growth": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 40, target: 25, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 15, target: 55, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 10, target: 5, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 10, target: 90, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 10, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 10, target: 45, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 5, target: 4.2, unit: "/5", direction: "up" },
    ],
  },
  "profitability": {
    objectives: [
      { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 10, target: 10, unit: "%", direction: "up" },
      { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 35, target: 75, unit: "%", direction: "up" },
      { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 10, target: 7, unit: "days", direction: "up" },
      { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 15, target: 98, unit: "%", direction: "up" },
      { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 15, target: 0, unit: "Rp", direction: "down" },
      { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 15, target: 30, unit: "%", direction: "down" },
      { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 0, target: 4.0, unit: "/5", direction: "up" },
    ],
  },
};

export function getCurrentQuarterKey(): string {
  const month = new Date().getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}
