import { Rocket, Target, Lightbulb, Compass, ChevronRight } from "lucide-react";
import OSWorkspaceShell from "@/components/desktop/OSWorkspaceShell";
import { useLocation } from "wouter";

const Pillars = [
  {
    icon: Target,
    t: "Visi & Misi",
    d: "Arah pertumbuhan perusahaan, tujuan jangka panjang, dan prinsip inti yang memandu setiap keputusan.",
  },
  {
    icon: Compass,
    t: "Strategi",
    d: "Prioritas kuartalan, roadmap ekspansi, dan alokasi sumber daya utama.",
  },
  {
    icon: Lightbulb,
    t: "Inovasi",
    d: "Ruang ide, uji eksperimen, dan daftar inisiatif yang sedang dipertimbangkan founder.",
  },
  {
    icon: Rocket,
    t: "Ekspansi",
    d: "Pemantauan pertumbuhan cabang, entry pasar baru, dan peluang kemitraan.",
  },
];

export default function FounderPage() {
  const [, setLocation] = useLocation();

  return (
    <OSWorkspaceShell
      title="Founder"
      subtitle="Founder operating room"
      color="#4F46E5"
      logo="F"
    >
      <div className="h-full overflow-y-auto px-4 md:px-6 py-5">
        <div className="rounded-2xl p-6 text-white border border-black/[0.04]" style={{ background: "linear-gradient(135deg,#4F46E5,#6366F1)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4" />
            <p className="text-[14px] font-bold">Founder Workspace</p>
          </div>
          <p className="text-[13px] text-white/80 leading-relaxed max-w-xl">
            Pusat operasional pendiri untuk mengarahkan visi, menyusun strategi, dan memantau
            pertumbuhan bisnis LUMÉ. Semua data bisnis terhubung di satu tempat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {Pillars.map((p) => (
            <button
              key={p.t}
              onClick={() => setLocation("/business-intelligence")}
              className="group rounded-2xl bg-white p-5 border border-black/[0.04] text-left transition-all hover:shadow-md active:scale-[0.99]"
            >
              <span className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3">
                <p.icon className="w-5 h-5" />
              </span>
              <p className="text-[14px] font-bold text-[#111827] flex items-center gap-1">
                {p.t}
                <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </p>
              <p className="text-[12px] text-[#6B7280] mt-1 leading-relaxed">{p.d}</p>
            </button>
          ))}
        </div>
      </div>
    </OSWorkspaceShell>
  );
}