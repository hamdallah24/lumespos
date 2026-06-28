import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetExpectedStock,
  useGetMe,
  getListShiftAuditsQueryKey,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import type { InventoryItem, ShiftAuditStockEntry } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";
import { formatRp } from "@/lib/format";
import { ClipboardList, Camera, RefreshCw, Upload, Check, FlaskConical, Package, Search } from "lucide-react";
import { useLocation } from "wouter";

interface SalesData {
  cash: number;
  qris: number;
  card: number;
  total: number;
  totalOrders: number;
  totalCups: number;
}

export default function ShiftPage() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { branchId, currentBranch } = useBranch();
  const { data: me } = useGetMe();

  const { data: expected = [], isLoading: isLoadingStock } = useGetExpectedStock({ branchId: branchId ?? undefined });
  const filteredExpected = expected.filter((it) => it.itemType === "semi_finished" || it.itemType === "ingredient");

  const [shiftId, setShiftId] = useState<number | null>(null);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isLoadingShift, setIsLoadingShift] = useState(true);

  const [closingBalance, setClosingBalance] = useState("");
  const [cupCounts, setCupCounts] = useState({ s: "", m: "", l: "" });
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [shiftExpenses, setShiftExpenses] = useState<any[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [shiftStart, setShiftStart] = useState<string | null>(null);
  const [result, setResult] = useState<{ expectedBalance: number; difference: number } | null>(null);

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "ingredient" | "semi_finished">("all");

  const displayedStock = filteredExpected.filter((it) => {
    if (stockFilter !== "all" && it.itemType !== stockFilter) return false;
    if (stockSearch && !it.name.toLowerCase().includes(stockSearch.toLowerCase())) return false;
    return true;
  });
  
  // Photo states
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keyOf = (it: InventoryItem) => `${it.itemType}:${it.itemId}`;

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Cek shift aktif
  useEffect(() => {
    const checkActiveShift = async () => {
      if (!branchId) return;
      setIsLoadingShift(true);
      try {
        const res = await fetch(`/api/shift/active?branchId=${branchId}`, { credentials: "include" });
        const data = await res.json();
        if (data.hasActiveShift) {
          setShiftId(data.shift.id);
          setOpeningBalance(data.shift.openingBalance);
          setShiftStart(data.shift.shiftStart);
        } else {
          setShiftId(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingShift(false);
      }
    };
    checkActiveShift();
  }, [branchId]);

  // Ambil data penjualan shift
  useEffect(() => {
    if (shiftId) {
      const fetchSales = async () => {
        setIsLoadingSales(true);
        try {
          const res = await fetch(`/api/shift/sales?shiftId=${shiftId}`, { credentials: "include" });
          const data = await res.json();
          if (res.ok) {
            setSalesData({
              cash: data.cash ?? 0,
              qris: data.qris ?? 0,
              card: data.card ?? 0,
              total: (data.cash ?? 0) + (data.qris ?? 0) + (data.card ?? 0),
              totalOrders: data.totalOrders ?? 0,
              totalCups: data.totalCups ?? 0,
            });
          } else {
            setSalesData({ cash: 0, qris: 0, card: 0, total: 0, totalOrders: 0, totalCups: 0 });
          }
        } catch (error) {
          setSalesData({ cash: 0, qris: 0, card: 0, total: 0, totalOrders: 0, totalCups: 0 });
        } finally {
          setIsLoadingSales(false);
        }
      };
      fetchSales();
    }
  }, [shiftId]);

  // ======================
  // KAMERA DAN UPLOAD
  // ======================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error("Tidak bisa mengakses kamera. Gunakan tombol 'Unggah Foto' untuk memilih dari galeri.");
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    stopCamera();
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoBlob(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.85);
  };

  const retake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoBlob(null);
    setPhotoUrl(null);
    startCamera();
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoBlob) return null;
    const contentType = photoBlob.type || "image/jpeg";
    const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
    
    const uploadUrlReq = await apiFetch("/api/storage/uploads/request-url", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `shift-proof-${Date.now()}.${ext}`,
        contentType,
        size: photoBlob.size,
      }),
    });
    
    if (!uploadUrlReq.ok) throw new Error("Gagal mendapatkan URL upload");
    const { uploadURL, objectPath } = await uploadUrlReq.json();

    const putRes = await fetch(uploadURL, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": contentType },
      body: photoBlob,
    });
    if (!putRes.ok) throw new Error("Upload gagal");
    return objectPath;
  };

  // ======================
  // SUBMIT SHIFT
  // ======================
  const handleSubmit = async () => {
    const balance = parseFloat(closingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("Uang aktual harus diisi dengan benar");
      return;
    }

    if (filteredExpected.length > 0 && Object.keys(counts).length === 0) {
      toast.warning("Mohon isi hitungan stok fisik untuk audit.");
      return;
    }

    const actualStock: ShiftAuditStockEntry[] = expected.map((it) => ({
      itemType: it.itemType,
      itemId: it.itemId,
      name: it.name,
      unit: it.unit,
      quantity: parseFloat(counts[keyOf(it)] ?? "") || 0,
    }));

    setLoading(true);
    try {
      const finalPhotoUrl = photoBlob ? await uploadPhoto() : null;

      const res = await apiFetch("/api/shift/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          closingBalance: balance,
          cupCounts: { s: parseFloat(cupCounts.s) || 0, m: parseFloat(cupCounts.m) || 0, l: parseFloat(cupCounts.l) || 0 },
          actualStock,
          notes,
          photoProofUrl: finalPhotoUrl,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menutup shift");

      setResult({
        expectedBalance: data.shift.expectedBalance,
        difference: data.shift.difference,
      });

      if (data.shift.difference >= 0) {
        toast.success(`Shift ditutup. Kelebihan Kas: ${formatRp(data.shift.difference)}`);
      } else {
        toast.warning(`Shift ditutup. Kekurangan Kas: ${formatRp(Math.abs(data.shift.difference))}`);
      }
      
      qc.invalidateQueries({ queryKey: getListShiftAuditsQueryKey({ branchId: branchId ?? undefined }) });
      qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId: branchId ?? undefined }) });
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menutup shift"));
    } finally {
      setLoading(false);
    }
  };

  // Ambil pengeluaran shift (sejak shiftStart)
  useEffect(() => {
    if (!branchId || !shiftStart) return;
    const fetchExpenses = async () => {
      setIsLoadingExpenses(true);
      try {
        const params = new URLSearchParams();
        params.set("branchId", String(branchId));
        const res = await fetch(`/api/expenses?${params}`, { credentials: "include" });
        const allExpenses = await res.json();
        const filtered = (Array.isArray(allExpenses) ? allExpenses : []).filter(
          (e: any) => new Date(e.createdAt) >= new Date(shiftStart)
        );
        setShiftExpenses(filtered);
      } catch {
        setShiftExpenses([]);
      } finally {
        setIsLoadingExpenses(false);
      }
    };
    fetchExpenses();
  }, [branchId, shiftStart]);

  const totalExpenses = shiftExpenses.reduce((s: number, e: any) => s + parseFloat(e.amount), 0);
  const expectedCash = (salesData?.cash || 0) + openingBalance - totalExpenses;

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0 flex flex-col h-full bg-background">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mt-3">
        <h1 className="font-bold text-lg tracking-tight">Tutup Shift & Audit</h1>
        {currentBranch && <Badge variant="outline" className="ml-3 text-xs">{currentBranch.name}</Badge>}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 mx-auto space-y-6">
          {isLoadingShift ? (
            <div className="text-center py-20 text-muted-foreground">Memeriksa status shift...</div>
          ) : !shiftId ? (
             <Card className="max-w-xl mx-auto mt-10">
               <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                 <ClipboardList className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
                 <h2 className="text-lg font-semibold mb-2">Tidak Ada Shift Aktif</h2>
                 <p className="text-muted-foreground text-sm mb-6">Anda tidak memiliki shift yang sedang berjalan saat ini.</p>
                 <Button onClick={() => setLocation("/")}>Ke Kasir</Button>
               </CardContent>
             </Card>
          ) : !result ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Kolom Kiri: Penjualan dan Audit Fisik */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Ringkasan Penjualan & Kas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      {isLoadingSales ? (
                        <div className="flex justify-center py-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div></div>
                      ) : salesData ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Tunai (Kas):</span>
                            <span className="font-medium">{formatRp(salesData.cash)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Online:</span>
                            <span className="font-medium">{formatRp(salesData.card)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>QRIS:</span>
                            <span className="font-medium">{formatRp(salesData.qris)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t mt-1 font-semibold">
                            <span>Total Omzet:</span>
                            <span className="text-primary">{formatRp(salesData.total)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-sm text-muted-foreground">Gagal mengambil data</div>
                      )}
                    </div>

                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Modal Awal (Kas):</span>
                        <span>{formatRp(openingBalance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Penjualan Tunai:</span>
                        <span>{formatRp(salesData?.cash || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pengeluaran:</span>
                        <span className="text-destructive">{isLoadingExpenses ? "..." : formatRp(totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2 pt-2 border-t border-primary/20 font-semibold">
                        <span>Harapan Uang di Laci Kas:</span>
                        <span className="text-primary">{formatRp(expectedCash)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Label className="text-sm font-semibold">Uang Aktual di Laci Kas (Rp)</Label>
                      <Input
                        type="number"
                        value={closingBalance}
                        onChange={(e) => setClosingBalance(e.target.value)}
                        placeholder="Contoh: 1500000"
                        className="h-12 text-lg font-bold mt-1"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">Masukkan total seluruh uang fisik di kasir.</p>
                    </div>

                    <div className="pt-2 border-t">
                      <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-primary" />Stok Cup Akhir
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Kecil</Label>
                          <Input type="number" value={cupCounts.s} onChange={(e) => setCupCounts(p => ({ ...p, s: e.target.value }))} placeholder="0" className="h-10 text-base font-bold text-center" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Sedang</Label>
                          <Input type="number" value={cupCounts.m} onChange={(e) => setCupCounts(p => ({ ...p, m: e.target.value }))} placeholder="0" className="h-10 text-base font-bold text-center" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Besar</Label>
                          <Input type="number" value={cupCounts.l} onChange={(e) => setCupCounts(p => ({ ...p, l: e.target.value }))} placeholder="0" className="h-10 text-base font-bold text-center" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {salesData ? (
                          <>Terjual <span className="font-semibold text-primary">{salesData.totalCups} cup</span> di shift ini. Hitung sisa cup fisik sekarang.</>
                        ) : "Hitung sisa cup fisik di akhir shift."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">Hitung Fisik Bahan Baku</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">
                      Isi sisa bahan setengah jadi dan bahan baku di akhir shift ini.
                    </p>

                    {filteredExpected.length > 0 && (
                      <div className="space-y-3 mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Cari bahan..."
                            value={stockSearch}
                            onChange={(e) => setStockSearch(e.target.value)}
                            className="pl-9 h-9 text-sm"
                          />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          <Button 
                            variant={stockFilter === "all" ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 text-xs rounded-full shrink-0"
                            onClick={() => setStockFilter("all")}
                          >Semua</Button>
                          <Button 
                            variant={stockFilter === "semi_finished" ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 text-xs rounded-full shrink-0"
                            onClick={() => setStockFilter("semi_finished")}
                          >Setengah Jadi</Button>
                          <Button 
                            variant={stockFilter === "ingredient" ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 text-xs rounded-full shrink-0"
                            onClick={() => setStockFilter("ingredient")}
                          >Bahan Mentah</Button>
                        </div>
                      </div>
                    )}

                    {isLoadingStock ? (
                      <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
                    ) : displayedStock.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg bg-muted/30">
                        {stockSearch ? "Bahan tidak ditemukan." : "Belum ada bahan untuk dihitung."}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {displayedStock.map((it) => (
                          <div key={keyOf(it)} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                            <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {it.itemType === "semi_finished" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">{it.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{it.itemType === "semi_finished" ? "Setengah Jadi" : "Bahan Mentah"}</span>
                            </div>
                            <div className="w-24 shrink-0">
                              <Input
                                type="number"
                                className="h-9 font-semibold text-center"
                                placeholder={it.unit}
                                value={counts[keyOf(it)] ?? ""}
                                onChange={(e) => setCounts((p) => ({ ...p, [keyOf(it)]: e.target.value }))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Kolom Kanan: Kamera dan Submit */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">Foto Bukti (Opsional)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-[4/3] rounded-lg bg-muted border overflow-hidden flex items-center justify-center mb-4 relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Bukti stok" className="w-full h-full object-cover" />
                      ) : cameraOn ? (
                        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Ambil foto stok / uang sebagai bukti</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFilePicked}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      {photoUrl ? (
                        <>
                          <Button variant="outline" onClick={retake}><RefreshCw className="w-4 h-4 mr-2" />Ulang</Button>
                          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Galeri</Button>
                        </>
                      ) : cameraOn ? (
                        <>
                          <Button onClick={capture}><Camera className="w-4 h-4 mr-2" />Jepret</Button>
                          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Galeri</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={startCamera}><Camera className="w-4 h-4 mr-2" />Kamera</Button>
                          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Galeri</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Catatan Tambahan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="Misal: Uang receh kurang, ada bahan tumpah, dll." 
                    />
                  </CardContent>
                </Card>

                <Button
                  className="w-full h-12 text-base font-bold shadow-lg"
                  onClick={handleSubmit}
                  disabled={loading || !salesData}
                >
                  {loading ? "Menyimpan Data..." : <><Check className="w-5 h-5 mr-2" /> Tutup Shift Sekarang</>}
                </Button>
              </div>

            </div>
          ) : (
            <Card className="max-w-xl mx-auto mt-10">
              <CardContent className="py-12 space-y-6 text-center">
                <div className={`p-4 sm:p-6 rounded-xl inline-block ${result.difference >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                  <p className="text-lg text-muted-foreground font-medium mb-2">Shift Berhasil Ditutup</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${result.difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {result.difference >= 0 ? formatRp(result.difference) : `-${formatRp(Math.abs(result.difference))}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.difference >= 0 ? "Selisih Kas Lebih" : "Selisih Kas Kurang"}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Harapan Kas: <span className="font-medium text-foreground">{formatRp(result.expectedBalance)}</span></p>
                  <p>Aktual Kas: <span className="font-medium text-foreground">{formatRp(parseFloat(closingBalance))}</span></p>
                </div>
                <Button onClick={() => setLocation("/")} className="w-full sm:w-auto mt-4 px-8">
                  Kembali ke Kasir
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
