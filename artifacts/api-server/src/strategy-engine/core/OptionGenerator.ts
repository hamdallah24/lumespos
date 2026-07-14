import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { StrategicOption, StrategicDirection } from "./types";

const domainDirections: Record<string, StrategicDirection[]> = {
  inventory: ["optimization", "cost_reduction", "risk_mitigation"],
  sales: ["growth", "optimization", "quality"],
  finance: ["cost_reduction", "optimization", "risk_mitigation"],
  shift: ["optimization", "risk_mitigation", "quality"],
  production: ["quality", "optimization", "cost_reduction"],
};

export function generateOptions(situation: OperationalSituation): StrategicOption[] {
  const directions = domainDirections[situation.domain] ?? ["optimization"];

  return directions.map((direction, i) => {
    const option = createOptionForDirection(direction, situation, i);
    return option;
  });
}

function createOptionForDirection(
  direction: StrategicDirection,
  situation: OperationalSituation,
  index: number,
): StrategicOption {
  const base: Record<StrategicDirection, { title: string; description: string; impact: string }> = {
    growth: {
      title: "Strategi Pertumbuhan",
      description: "Fokus pada peningkatan volume penjualan dan ekspansi pasar",
      impact: "Meningkatkan revenue jangka panjang dengan investasi pemasaran dan pengembangan produk",
    },
    optimization: {
      title: "Strategi Optimasi",
      description: "Tingkatkan efisiensi proses dan maksimalkan sumber daya yang ada",
      impact: "Mengurangi waste dan meningkatkan produktivitas tanpa tambahan biaya signifikan",
    },
    cost_reduction: {
      title: "Strategi Efisiensi Biaya",
      description: "Identifikasi dan eliminasi pengeluaran yang tidak perlu",
      impact: "Mengurangi biaya operasional dan meningkatkan margin keuntungan",
    },
    quality: {
      title: "Strategi Kualitas",
      description: "Tingkatkan standar kualitas produk dan layanan",
      impact: "Meningkatkan kepuasan pelanggan dan mengurangi komplain",
    },
    risk_mitigation: {
      title: "Strategi Mitigasi Risiko",
      description: "Antisipasi dan kurangi dampak risiko operasional",
      impact: "Melindungi bisnis dari kerugian akibat gangguan operasional",
    },
  };

  const info = base[direction];
  const confidence = Math.round(70 - index * 5 + Math.random() * 10);

  return {
    id: `option-${direction}-${Date.now()}-${index}`,
    direction,
    title: info.title,
    description: `${info.description}. Konteks: ${situation.title}`,
    expectedImpact: info.impact,
    confidence: Math.min(95, Math.max(40, confidence)),
    risks: generateRisks(direction),
  };
}

function generateRisks(direction: StrategicDirection): string[] {
  const riskMap: Record<StrategicDirection, string[]> = {
    growth: ["Membutuhkan investasi awal", "Risiko overcapacity", "Tekanan pada cash flow"],
    optimization: ["Perubahan proses bisa resistensi staf", "Hasil tidak instan"],
    cost_reduction: ["Bisa mengurangi kualitas", "Dampak pada moral karyawan"],
    quality: ["Biaya produksi naik", "Waktu implementasi lebih lama"],
    risk_mitigation: ["Biaya kepatuhan", "Mengurangi fleksibilitas operasional"],
  };
  return riskMap[direction];
}
