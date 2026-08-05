import React, { useState } from "react";
import { BarChart3, TrendingUp, Users, Package, Wallet, Sparkles } from "lucide-react";
import OSWorkspaceShell from "@/components/desktop/OSWorkspaceShell";

const Kpis = [
  { icon: Wallet, label: "Revenue", value: "Rp 84,2 Jt", trend: "+12,4%" },
  { icon: Package, label: "Produk Terjual", value: "1.284", trend: "+8,1%" },
  { icon: Users, label: "Pelanggan Baru", value: "97", trend: "+22,6%" },
  { icon: TrendingUp, label: "Margin", value: "31,5%", trend: "+2,3%" },
];

export default function BusinessIntelligencePage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <OSWorkspaceShell
      title="Business Intelligence"
      subtitle="Analytics, data & insight"
      color="#0891B2"
      logo="BI"
    >
      <div className="h-full overflow-y-auto px-4 md:px-6 py-5">
        {/* Filter periode */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-black/[0.05]">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  period === p ? "bg-[#0891B2] text-white" : "text-[#6B7280] hover:bg-[#0891B2]/5"
                }`}
              >
                {p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : "90 Hari"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {Kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-4 border border-black/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2]">
                  <k.icon className="w-4 h-4" />
                </span>
                <p className="text-[11px] font-semibold text-[#6B7280]">{k.label}</p>
              </div>
              <p className="text-[18px] font-bold text-[#111827] leading-tight">{k.value}</p>
              <p className="text-[11px] font-medium text-green-600 mt-1">{k.trend} vs prev</p>
            </div>
          ))}
        </div>

        {/* Insight panel */}
        <div className="rounded-2xl p-5 text-white border border-black/[0.04]" style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            <p className="text-[13px] font-bold">AI Insight</p>
          </div>
          <p className="text-[13px] text-white/85 leading-relaxed">
            Analisis otomatis menampilkan peningkatan penjualan terbesar pada kategori
            <b> makanan kemasan</b> (+18,2%) dalam 30 hari terakhir. Direkomendasikan untuk
            menambah stok bahan baku utama sebesar 20% menjelang puncak permintaan akhir pekan.
          </p>
        </div>

        {/* Upcoming modules */}
        <div className="mt-5">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-3">
            Modul Analisis Mendatang
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: BarChart3, t: "Analisis Tren", d: "Deteksi musiman & pola permintaan" },
              { icon: Users, t: "Segmentasi Pelanggan", d: "Klasterisasi & prediksi churn" },
              { icon: TrendingUp, t: "Forecast Pendapatan", d: "Proyeksi ARIMA & regresi" },
            ].map((m) => (
              <div key={m.t} className="rounded-2xl bg-white p-4 border border-black/[0.04] opacity-80">
                <span className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] mb-2">
                  <m.icon className="w-[18px] h-[18px]" />
                </span>
                <p className="text-[13px] font-bold text-[#111827]">{m.t}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{m.d}</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[9px] font-bold text-[#9CA3AF] uppercase">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OSWorkspaceShell>
  );
}