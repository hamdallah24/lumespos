export interface CashTodayData {
  amount: number;
  change: number;
}

export interface CashflowData {
  amount: number;
  change: number;
}

export interface ProfitData {
  amount: number;
  change: number;
}

export interface MissionData {
  active: number;
  total: number;
}

export interface InsightItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
}

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return IDR.format(value);
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export async function fetchCashToday(): Promise<CashTodayData> {
  return { amount: 2450000, change: 8.4 };
}

export async function fetchCashflow(): Promise<CashflowData> {
  return { amount: 12500000, change: 2.1 };
}

export async function fetchProfit(): Promise<ProfitData> {
  return { amount: 3200000, change: -1.3 };
}

export async function fetchMissions(): Promise<MissionData> {
  return { active: 3, total: 7 };
}

export async function fetchInsights(): Promise<InsightItem[]> {
  return [
    {
      id: "1",
      icon: "TrendingUp",
      title: "Penjualan meningkat",
      description: "Omset hari ini naik 8.4% dari kemarin",
      time: "2 jam lalu",
    },
    {
      id: "2",
      icon: "AlertTriangle",
      title: "Stok rendah",
      description: "3 bahan di bawah batas minimum",
      time: "4 jam lalu",
    },
    {
      id: "3",
      icon: "CheckCircle2",
      title: "Shift selesai",
      description: "Shift pagi ditutup selisih Rp 0",
      time: "6 jam lalu",
    },
  ];
}
