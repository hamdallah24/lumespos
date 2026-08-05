import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation, Redirect } from "wouter";
import { BranchProvider } from "@/lib/branch";

interface OSWorkspaceShellProps {
  /** Judul workspace (muncul di header) */
  title: string;
  /** Sub-judul ringkas */
  subtitle?: string;
  /** Warna aksen workspace */
  color?: string;
  /** Inisial/ikon logo, default 'L' */
  logo?: string;
  children: ReactNode;
}

/**
 * OSCWorkpaceShell — wrapper penuh untuk workspace Operating System
 * (Executive, EngOS, BI, Founder, Audit, Branches, Users, Settings).
 * Workspace ini BUKAN bagian dari aplikasi POS, sehingga ditampilkan sebagai
 * halaman tersendiri di luar HomeScreen dengan tombol kembali ke Home.
 */
export default function OSWorkspaceShell({
  title,
  subtitle,
  color = "#2563EB",
  logo = "L",
  children,
}: OSWorkspaceShellProps) {
  const { data: me, isLoading } = useGetMe({
    query: { queryKey: ["/api/users/me"], retry: 1, retryDelay: 500 },
  });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F6F8FC]">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!me) return <Redirect to="/sign-in" />;

  return (
    <BranchProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[#F6F8FC]">
        {/* Header OS */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 md:px-6"
          style={{ height: 64, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 active:scale-[0.98] transition-transform shadow-sm border border-black/[0.05]"
            aria-label="Kembali ke Home"
          >
            <ArrowLeft className="w-5 h-5 text-[#111827]" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold"
            style={{ background: color }}
          >
            {logo}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#111827] leading-tight truncate">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-[#6B7280] leading-tight truncate">{subtitle}</p>
            )}
          </div>
        </header>
        {/* Konten workspace — menyesuaikan tinggi */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">{children}</div>
      </div>
    </BranchProvider>
  );
}