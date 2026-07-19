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

export type CashflowRange = "day" | "week" | "month" | "year";

export interface CashflowPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface MissionRunningItem {
  id: string;
  name: string;
  status: "running" | "planning" | "review";
  progress: number;
}

export interface ScheduleItem {
  id: string;
  time: string;
  icon: string;
  title: string;
  subtitle: string;
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

export async function fetchCashflowSeries(
  range: CashflowRange
): Promise<CashflowPoint[]> {
  const mockData: Record<CashflowRange, CashflowPoint[]> = {
    day: [
      { label: "08:00", income: 1200000, expense: 800000, net: 400000 },
      { label: "10:00", income: 2100000, expense: 1500000, net: 600000 },
      { label: "12:00", income: 3800000, expense: 2200000, net: 1600000 },
      { label: "14:00", income: 2900000, expense: 1800000, net: 1100000 },
      { label: "16:00", income: 4200000, expense: 3100000, net: 1100000 },
      { label: "18:00", income: 1500000, expense: 900000, net: 600000 },
    ],
    week: [
      { label: "Sen", income: 8500000, expense: 5200000, net: 3300000 },
      { label: "Sel", income: 7200000, expense: 4800000, net: 2400000 },
      { label: "Rab", income: 9100000, expense: 6100000, net: 3000000 },
      { label: "Kam", income: 6800000, expense: 4500000, net: 2300000 },
      { label: "Jum", income: 11200000, expense: 7800000, net: 3400000 },
      { label: "Sab", income: 12500000, expense: 8900000, net: 3600000 },
      { label: "Min", income: 5400000, expense: 3200000, net: 2200000 },
    ],
    month: [
      { label: "M1", income: 35000000, expense: 22000000, net: 13000000 },
      { label: "M2", income: 42000000, expense: 28000000, net: 14000000 },
      { label: "M3", income: 38000000, expense: 25000000, net: 13000000 },
      { label: "M4", income: 51000000, expense: 33000000, net: 18000000 },
    ],
    year: [
      { label: "Jan", income: 120000000, expense: 85000000, net: 35000000 },
      { label: "Feb", income: 98000000, expense: 72000000, net: 26000000 },
      { label: "Mar", income: 145000000, expense: 95000000, net: 50000000 },
      { label: "Apr", income: 132000000, expense: 88000000, net: 44000000 },
      { label: "Mei", income: 158000000, expense: 102000000, net: 56000000 },
      { label: "Jun", income: 175000000, expense: 115000000, net: 60000000 },
    ],
  };
  return mockData[range];
}

export async function fetchMissionsRunning(): Promise<MissionRunningItem[]> {
  return [
    { id: "1", name: "Optimasi Stok Bahan", status: "running", progress: 72 },
    { id: "2", name: "Ekspansi Cabang Baru", status: "planning", progress: 15 },
    { id: "3", name: "Implementasi Loyalitas", status: "running", progress: 45 },
    { id: "4", name: "Audit Keuangan Q2", status: "review", progress: 90 },
    { id: "5", name: "Training Karyawan Baru", status: "planning", progress: 8 },
  ];
}

export async function fetchUpcomingSchedule(): Promise<ScheduleItem[]> {
  return [
    { id: "1", time: "09:00", icon: "Calendar", title: "Rutin Harian", subtitle: "Cek stok & persiapan" },
    { id: "2", time: "11:30", icon: "Users", title: "Meeting Tim", subtitle: "Review performa mingguan" },
    { id: "3", time: "14:00", icon: "ClipboardCheck", title: "Audit Cashier", subtitle: "Verifikasi laporan shift" },
    { id: "4", time: "16:30", icon: "TrendingUp", title: "Review Keuangan", subtitle: "Closing harian" },
  ];
}

export interface POSDailyStats {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  productsSold: number;
  grossProfit: number;
}

export async function fetchPOSDailyStats(): Promise<POSDailyStats> {
  try {
    const res = await fetch("/api/dashboard/summary", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return {
      totalSales: data.todayRevenue ?? 0,
      totalOrders: data.todayOrders ?? 0,
      avgOrderValue: data.todayOrders ? Math.round((data.todayRevenue ?? 0) / data.todayOrders) : 0,
      productsSold: data.todayProductsSold ?? 0,
      grossProfit: data.grossProfit ?? 0,
    };
  } catch {
    return { totalSales: 0, totalOrders: 0, avgOrderValue: 0, productsSold: 0, grossProfit: 0 };
  }
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
