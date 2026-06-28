import { useState, useEffect } from "react";
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
import { formatDate, formatRp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Eye, Package, Search, TrendingDown } from "lucide-react";

function statusBadge(status: string) {
  if (status === "verified") return <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Terverifikasi</Badge>;
  if (status === "discrepancy") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Selisih</Badge>;
  if (status === "corrected") return <Badge className="bg-orange-600 hover:bg-orange-600"><AlertTriangle className="w-3 h-3 mr-1" />Terkoreksi</Badge>;
  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
}

export default function AuditsPage() {
  const { branchId, currentBranch } = useBranch();
  const { data: audits = [], isLoading } = useListShiftAudits({ branchId: branchId ?? 1 });
  const [selected, setSelected] = useState<ShiftAudit | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mt-3">
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
            audits.map((a) => {
              const diff = a.difference ?? 0;
              return (
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
                      {a.closingBalance != null && (
                        <p className={`text-xs font-semibold mt-0.5 ${Math.abs(diff) < 100 ? "text-green-600" : "text-destructive"}`}>
                          Kas: {formatRp(a.closingBalance)} | Harapan: {formatRp(a.expectedBalance ?? 0)} | Selisih: {diff > 0 ? "+" : ""}{formatRp(diff)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

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
  const [fraud, setFraud] = useState<any>(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  const allRecon = detail?.reconciliation ?? [];
  const hasWarning = allRecon.some((r) => r.isWarning);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setFraudLoading(true);
      try {
        const resp = await fetch(`/api/shift-audits/${auditId}/analysis`, { credentials: "include" });
        if (resp.ok) setFraud(await resp.json());
      } catch { setFraud(null); }
      setFraudLoading(false);
    };
    fetchAnalysis();
  }, [auditId]);

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
                  <p className="text-xs">Terdapat item dengan selisih signifikan antara stok POS dan stok fisik.</p>
                </div>
              </div>
            )}

            {/* ── 💰 KEUANGAN ── */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">💰 Laporan Keuangan</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {detail.openingBalance != null && (
                  <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Modal Awal</span><span className="font-semibold">{formatRp(detail.openingBalance)}</span></div>
                )}
                {detail.totalCash != null && (
                  <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Penjualan Tunai</span><span className="font-semibold">{formatRp(detail.totalCash)}</span></div>
                )}
                {detail.expectedBalance != null && (
                  <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Harapan Kas</span><span className="font-semibold">{formatRp(detail.expectedBalance)}</span></div>
                )}
                {detail.closingBalance != null && (
                  <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Kas Akhir</span><span className="font-semibold text-primary">{formatRp(detail.closingBalance)}</span></div>
                )}
              </div>
              {detail.difference != null && (
                <div className={`mt-2 p-2 rounded text-center text-sm font-bold ${Math.abs(detail.difference) < 100 ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                  Selisih Kas: {detail.difference > 0 ? "+" : ""}{formatRp(detail.difference)}
                </div>
              )}
            </div>

            {/* ── 📦 REKONSILIASI STOK ── */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">📦 Rekonsiliasi Stok</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted text-[11px] font-medium text-muted-foreground">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2 text-right">POS</span>
                  <span className="col-span-2 text-right">Fisik</span>
                  <span className="col-span-4 text-right">Selisih</span>
                </div>
                {allRecon.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">Tidak ada data stok.</p>
                ) : (
                  allRecon.map((r) => (
                    <div key={`${r.itemType}-${r.itemId}`} className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs border-t items-center ${r.isWarning ? "bg-destructive/5" : ""}`}>
                      <span className="col-span-4 truncate font-medium">{r.name}</span>
                      <span className="col-span-2 text-right">{r.expected}</span>
                      <span className="col-span-2 text-right">{r.actual}</span>
                      <span className={`col-span-4 text-right font-semibold ${r.isWarning ? "text-destructive" : r.diff === 0 ? "text-muted-foreground" : ""}`}>
                        {r.diff > 0 ? "+" : ""}{r.diff} ({r.diffPct.toFixed(1)}%)
                        {r.isWarning && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── 🔍 ANALISIS FRAUD ── */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">🔍 Analisis Fraud</h3>
              {fraudLoading ? (
                <div className="h-20 bg-muted rounded animate-pulse" />
              ) : fraud ? (
                <div className="space-y-3">
                  {/* Cup Analysis — 3 ukuran */}
                  {fraud.cupAnalysis && (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Cup Awal</span>
                          <div className="font-semibold mt-0.5 space-x-2">
                            {fraud.cupAnalysis.start?.s !== undefined ? <>
                              <span>K: {fraud.cupAnalysis.start.s}</span>
                              <span>S: {fraud.cupAnalysis.start.m}</span>
                              <span>B: {fraud.cupAnalysis.start.l}</span>
                            </> : null}
                            <span className="text-primary">({fraud.cupAnalysis.start?.total ?? "—"})</span>
                          </div>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Cup Akhir</span>
                          <div className="font-semibold mt-0.5 space-x-2">
                            {fraud.cupAnalysis.end?.s !== undefined ? <>
                              <span>K: {fraud.cupAnalysis.end.s}</span>
                              <span>S: {fraud.cupAnalysis.end.m}</span>
                              <span>B: {fraud.cupAnalysis.end.l}</span>
                            </> : null}
                            <span className="text-primary">({fraud.cupAnalysis.end?.total ?? "—"})</span>
                          </div>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Terjual</span><span className="font-semibold">{fraud.totalCups}</span></div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded"><span>Terpakai</span><span className="font-semibold">{fraud.cupAnalysis.used ?? "—"}</span></div>
                      </div>
                    </div>
                  )}
                  {fraud.cupAnalysis?.discrepancy != null && Math.abs(fraud.cupAnalysis.discrepancy) > 0.5 && (
                    <div className={`p-2 rounded text-xs font-semibold text-center ${fraud.cupAnalysis.status === "OK — cup sesuai" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {fraud.cupAnalysis.status}: {fraud.cupAnalysis.discrepancy > 0 ? "+" : ""}{fraud.cupAnalysis.discrepancy} cup
                    </div>
                  )}
                  {fraud.cupAnalysis?.cupVsIngredient && (
                    <div className={`p-2 rounded text-xs font-semibold ${fraud.cupAnalysis.cupVsIngredient.includes("MENcurigakan") ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" : "bg-muted/50 text-muted-foreground"}`}>
                      {fraud.cupAnalysis.cupVsIngredient} (Bahan loss ≈ {fraud.cupAnalysis.ingredientCups} cup)
                    </div>
                  )}

                  {/* Anomalies */}
                  {fraud.anomalies && fraud.anomalies.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Anomali Bahan Baku:</p>
                      {fraud.anomalies.map((a: any, i: number) => (
                        <div key={i} className={`p-2 rounded border text-xs ${a.flag === "HIGH" ? "border-red-400 bg-red-50 dark:bg-red-950" : a.flag === "MEDIUM" ? "border-orange-300 bg-orange-50 dark:bg-orange-950" : "border-muted bg-muted/30"}`}>
                          <div className="flex justify-between font-semibold">
                            <span>{a.ingredient}</span>
                            <span className={a.flag === "HIGH" ? "text-red-600" : a.flag === "MEDIUM" ? "text-orange-600" : "text-muted-foreground"}>{a.flag}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 mt-1 text-muted-foreground">
                            <span>Ekspektasi: {a.totalExpected}</span>
                            <span>Loss: {a.totalActualLoss}</span>
                            <span>Excess: {a.excessQty} ({a.excessPct}%)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 mt-0.5 font-semibold">
                            <span>Rugi bahan: {formatRp(a.materialLoss)}</span>
                            <span>Potensi {a.potentialCups} cup ({formatRp(a.potentialRevenue)})</span>
                          </div>
                          {a.variantAnalysis && a.variantAnalysis.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-border/50">
                              <p className="text-[10px] text-muted-foreground mb-1">Per varian:</p>
                              {a.variantAnalysis.filter((v: any) => parseFloat(v.ilegalRatio) > 20).map((v: any, j: number) => (
                                <div key={j} className="flex justify-between text-[10px]">
                                  <span>{v.variant} (terjual {v.sold})</span>
                                  <span className={parseFloat(v.ilegalRatio) > 50 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                                    ±{v.potentialIlegalCups} cup ilegal ({v.ilegalRatio}%) {v.flag2}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {fraud.summary && (
                        <div className="p-2 rounded bg-muted/50 text-xs">
                          <span className="font-semibold">Total: </span>
                          {fraud.anomalies.length} anomali | Rugi bahan {formatRp(fraud.summary.totalMaterialLoss)} | Potensi omzet {formatRp(fraud.summary.totalPotentialRevenue)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : detail ? (
                <p className="text-xs text-muted-foreground">Tidak ada data analisis.</p>
              ) : null}
            </div>

            {/* ── Foto + Verify ── */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Foto Bukti</h3>
              {detail.photoProofUrl ? (
                <a href={`/api/storage${detail.photoProofUrl}`} target="_blank" rel="noreferrer">
                  <img src={`/api/storage${detail.photoProofUrl}`} alt="Bukti stok" className="w-full rounded-lg border object-cover max-h-64" />
                </a>
              ) : (
                <div className="h-32 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Tidak ada foto bukti</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              {detail.status !== "verified" && (
                <Button onClick={onVerify} disabled={verify.isPending} className={hasWarning ? "bg-destructive hover:bg-destructive/90" : ""}>
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  {verify.isPending ? "Memverifikasi..." : hasWarning ? "Verifikasi (Warning)" : "Verifikasi"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
