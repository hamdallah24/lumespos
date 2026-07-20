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

export interface RecentActivityItem {
  id: string;
  transaction: string;
  location: string;
  time: string;
  amount: number;
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
  try {
    const res = await fetch("/api/finance/dashboard", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return {
      amount: data.cashBalance ?? 0,
      change: data.insight?.income?.change ?? 0,
    };
  } catch {
    return { amount: 0, change: 0 };
  }
}

export async function fetchCashflow(): Promise<CashflowData> {
  try {
    const res = await fetch("/api/finance/dashboard", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return {
      amount: data.todayIncome ?? 0,
      change: data.insight?.income?.change ?? 0,
    };
  } catch {
    return { amount: 0, change: 0 };
  }
}

export async function fetchProfit(): Promise<ProfitData> {
  try {
    const res = await fetch("/api/finance/dashboard", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return {
      amount: data.profitToday ?? 0,
      change: data.insight?.expense?.change ?? 0,
    };
  } catch {
    return { amount: 0, change: 0 };
  }
}

export async function fetchMissions(): Promise<MissionData> {
  return { active: 3, total: 7 };
}

export async function fetchCashflowSeries(
  range: CashflowRange
): Promise<CashflowPoint[]> {
  try {
    const end = new Date();
    const start = new Date();
    const labels: string[] = [];

    switch (range) {
      case "day":
        start.setHours(0, 0, 0, 0);
        for (let h = 8; h <= 18; h += 2) {
          labels.push(`${h.toString().padStart(2, "0")}:00`);
        }
        break;
      case "week":
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          labels.push(dayNames[d.getDay()]);
        }
        break;
      case "month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const weeksInMonth = Math.ceil(end.getDate() / 7);
        for (let w = 0; w < weeksInMonth; w++) {
          labels.push(`M${w + 1}`);
        }
        break;
      case "year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        for (let m = 0; m < 12; m++) {
          labels.push(shortMonths[m]);
        }
        break;
    }

    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const res = await fetch(
      `/api/finance/timeline?startDate=${startDate}&endDate=${endDate}&limit=500`,
      { credentials: "include" }
    );

    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    const items = data.items || [];

    const buckets: { income: number; expense: number }[] = labels.map(() => ({ income: 0, expense: 0 }));

    for (const item of items) {
      const date = new Date(item.createdAt);
      let bucketIndex = 0;

      switch (range) {
        case "day": {
          const hour = date.getHours();
          bucketIndex = Math.min(Math.floor((hour - 8) / 2), labels.length - 1);
          if (hour < 8) bucketIndex = 0;
          break;
        }
        case "week": {
          const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          bucketIndex = Math.min(Math.max(diffDays, 0), labels.length - 1);
          break;
        }
        case "month": {
          const weekOfMonth = Math.floor((date.getDate() - 1) / 7);
          bucketIndex = Math.min(weekOfMonth, labels.length - 1);
          break;
        }
        case "year": {
          bucketIndex = date.getMonth();
          break;
        }
      }

      if (bucketIndex >= 0 && bucketIndex < labels.length) {
        if (item.type === "income") {
          buckets[bucketIndex].income += item.amount;
        } else {
          buckets[bucketIndex].expense += item.amount;
        }
      }
    }

    return labels.map((label, i) => ({
      label,
      income: buckets[i].income,
      expense: buckets[i].expense,
      net: buckets[i].income - buckets[i].expense,
    }));
  } catch {
    const { labels } = getDateRangeForRange(range);
    return labels.map((label) => ({ label, income: 0, expense: 0, net: 0 }));
  }
}

function getDateRangeForRange(range: CashflowRange): { labels: string[] } {
  const labels: string[] = [];
  switch (range) {
    case "day":
      for (let h = 8; h <= 18; h += 2) labels.push(`${h.toString().padStart(2, "0")}:00`);
      break;
    case "week":
      labels.push("Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab");
      break;
    case "month":
      for (let w = 0; w < 5; w++) labels.push(`M${w + 1}`);
      break;
    case "year":
      labels.push("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des");
      break;
  }
  return { labels };
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

// ── Branch cache (module-level, populated once) ──
let _branchesPromise: Promise<Map<number, string>> | null = null;

async function getBranchMap(): Promise<Map<number, string>> {
  if (_branchesPromise) return _branchesPromise;
  _branchesPromise = fetch("/api/branches", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r)))
    .then((data: { branches?: Array<{ id: number; name: string }> } | Array<{ id: number; name: string }>) => {
      const list = Array.isArray(data) ? data : data.branches || [];
      const map = new Map<number, string>();
      for (const b of list) map.set(b.id, b.name);
      return map;
    })
    .catch(() => {
      _branchesPromise = null;
      return new Map<number, string>();
    });
  return _branchesPromise;
}

export async function fetchRecentActivity(): Promise<RecentActivityItem[]> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [branchMap, ordersRes] = await Promise.all([
      getBranchMap(),
      fetch(`/api/orders?date=${today}&limit=20`, { credentials: "include" }),
    ]);
    if (!ordersRes.ok) throw new Error("Failed to fetch orders");
    const { orders = [] } = await ordersRes.json();
    if (!Array.isArray(orders) || orders.length === 0) return [];

    interface OrderItemRaw { id: number; productName: string; quantity: number; priceAtSale: number; subtotal: number }
    interface OrderDetailRaw { id: number; branchId: number; createdAt: string; items: OrderItemRaw[] }

    // Fetch all order details in parallel to get product names
    const details: OrderDetailRaw[] = await Promise.all(
      orders.map((o: { id: number }) =>
        fetch(`/api/orders/${o.id}`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    // Flatten: one activity row per sold item
    const rows: RecentActivityItem[] = [];
    for (const detail of details) {
      if (!detail?.items) continue;
      const branchName = branchMap.get(detail.branchId) || `Branch #${detail.branchId}`;
      const time = new Date(detail.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      for (const item of detail.items) {
        rows.push({
          id: `order-${detail.id}-item-${item.id}`,
          transaction: `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
          location: branchName,
          time,
          amount: item.priceAtSale * item.quantity,
        });
      }
    }

    // Sort newest first by preserving order detail order (already desc by createdAt)
    return rows;
  } catch {
    return [];
  }
}
