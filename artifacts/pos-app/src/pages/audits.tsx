import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListShiftAudits,
  useGetShiftAudit,
  useVerifyShiftAudit,
  getListShiftAuditsQueryKey,
  getGetShiftAuditQueryKey,
} from "@workspace/api-client-react";
import type { ShiftAudit } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Eye } from "lucide-react";

function statusBadge(status: string) {
  if (status === "verified") return <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Terverifikasi</Badge>;
  if (status === "discrepancy") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Selisih</Badge>;
  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
}

export default function AuditsPage() {
  const { branchId, currentBranch } = useBranch();
  const { data: audits = [], isLoading } = useListShiftAudits({ branchId: branchId ?? 1 });
  const [selected, setSelected] = useState<ShiftAudit | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mx-3 mt-3">
        <h1 className="font-bold text-lg tracking-tight">Audit Shift</h1>
        {currentBranch && <Badge variant="outline" className="ml-3 text-xs">{currentBranch.name}</Badge>}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
          ) : audits.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada tutup shift untuk diaudit</p>
            </div>
          ) : (
            audits.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => setSelected(a)}>
                <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.cashierName ?? "Kasir"}</span>
                      {statusBadge(a.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.shiftEnd ? formatDate(a.shiftEnd) : "—"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Paksa branchId menjadi angka (number) */}
{selected && typeof branchId === 'number' && (
  <AuditDetailDialog 
    auditId={selected.id} 
    branchId={branchId} 
    onClose={() => setSelected(null)} 
  />
)}
    </div>
  );
}

function AuditDetailDialog({ auditId, branchId, onClose }: { auditId: number; branchId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: detail, isLoading } = useGetShiftAudit(auditId);
  const verify = useVerifyShiftAudit();

  const recon = (detail?.reconciliation ?? []).filter(
  (r) => r.itemType === "semi_finished"
);
  const hasWarning = recon.some((r) => r.isWarning);

  const onVerify = () => {
    verify.mutate(
      { id: auditId },
      {
        onSuccess: () => {
          toast.success("Audit terverifikasi");
          qc.invalidateQueries({ queryKey: getListShiftAuditsQueryKey({ branchId }) });
          qc.invalidateQueries({ queryKey: getGetShiftAuditQueryKey(auditId) });
        },
        onError: () => toast.error("Gagal memverifikasi audit"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detail Audit — {detail?.cashierName ?? "Kasir"}
            {detail && statusBadge(detail.status)}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !detail ? (
          <div className="h-64 bg-muted rounded animate-pulse" />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {hasWarning && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">WARNING: Selisih melebihi 5%</p>
                  <p className="text-xs">Terdapat item dengan selisih signifikan antara stok POS dan stok fisik. Periksa sebelum memverifikasi.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Rekonsiliasi Stok</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted text-[11px] font-medium text-muted-foreground">
                    <span className="col-span-5">Item</span>
                    <span className="col-span-2 text-right">POS</span>
                    <span className="col-span-2 text-right">Fisik</span>
                    <span className="col-span-3 text-right">Selisih</span>
                  </div>
                  {recon.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">Tidak ada data stok.</p>
                  ) : (
                    recon.map((r) => (
                      <div key={`${r.itemType}-${r.itemId}`} className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs border-t items-center ${r.isWarning ? "bg-destructive/5" : ""}`}>
                        <span className="col-span-5 truncate font-medium">{r.name}</span>
                        <span className="col-span-2 text-right">{r.expected}</span>
                        <span className="col-span-2 text-right">{r.actual}</span>
                        <span className={`col-span-3 text-right font-semibold ${r.isWarning ? "text-destructive" : r.diff === 0 ? "text-muted-foreground" : ""}`}>
                          {r.diff > 0 ? "+" : ""}{r.diff} ({r.diffPct.toFixed(1)}%)
                          {r.isWarning && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {detail.notes && <p className="text-xs text-muted-foreground mt-2">Catatan: {detail.notes}</p>}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Foto Bukti</h3>
                {detail.photoProofUrl ? (
                  <a href={`/api/storage${detail.photoProofUrl}`} target="_blank" rel="noreferrer">
                    <img src={`/api/storage${detail.photoProofUrl}`} alt="Bukti stok" className="w-full rounded-lg border object-cover max-h-72" />
                  </a>
                ) : (
                  <div className="h-40 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    Tidak ada foto bukti
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              {detail.status !== "verified" && (
                <Button onClick={onVerify} disabled={verify.isPending} className={hasWarning ? "bg-destructive hover:bg-destructive/90" : ""}>
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  {verify.isPending ? "Memverifikasi..." : hasWarning ? "Verifikasi (ada warning)" : "Verifikasi"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
