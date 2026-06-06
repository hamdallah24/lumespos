import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetExpectedStock,
  useCreateShiftAudit,
  useRequestUploadUrl,
  useGetMe,
  getListShiftAuditsQueryKey,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import type { InventoryItem, ShiftAuditStockEntry } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, RefreshCw, Check, ClipboardList, FlaskConical, Package, Upload } from "lucide-react";

export default function ShiftPage() {
  const qc = useQueryClient();
  const { branchId, currentBranch } = useBranch();
  const { data: me } = useGetMe();
  const { data: expected = [], isLoading } = useGetExpectedStock({ branchId });
  const createAudit = useCreateShiftAudit();
  const requestUpload = useRequestUploadUrl();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keyOf = (it: InventoryItem) => `${it.itemType}:${it.itemId}`;

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast.error("Tidak bisa mengakses kamera. Gunakan tombol \"Unggah Foto\" untuk memilih dari galeri.");
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
    const res = await requestUpload.mutateAsync({
      data: { name: `shift-proof-${Date.now()}.${ext}`, size: photoBlob.size, contentType },
    });
    const putRes = await fetch(res.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: photoBlob,
    });
    if (!putRes.ok) throw new Error("Upload gagal");
    return res.objectPath;
  };

  const submit = async () => {
    if (!branchId) return;
    if (!photoBlob) { toast.error("Ambil foto bukti stok terlebih dahulu"); return; }
    const actualStock: ShiftAuditStockEntry[] = expected.map((it) => ({
      itemType: it.itemType,
      itemId: it.itemId,
      name: it.name,
      unit: it.unit,
      quantity: parseFloat(counts[keyOf(it)] ?? "") || 0,
    }));
    setUploading(true);
    try {
      const photoProofUrl = await uploadPhoto();
      await createAudit.mutateAsync({
        data: {
          branchId,
          cashierId: me?.id ?? null,
          actualStock,
          photoProofUrl,
          notes: notes || null,
        },
      });
      toast.success("Tutup shift berhasil dikirim untuk audit");
      setCounts({}); setNotes(""); setPhotoBlob(null);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
      qc.invalidateQueries({ queryKey: getListShiftAuditsQueryKey({ branchId }) });
      qc.invalidateQueries({ queryKey: getListInventoryQueryKey({ branchId }) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim tutup shift");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 border-b px-6 flex items-center bg-card shrink-0">
        <h1 className="font-bold text-xl tracking-tight">Tutup Shift</h1>
        {currentBranch && <Badge variant="outline" className="ml-3 text-xs">{currentBranch.name}</Badge>}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Hitung Stok Fisik</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Sistem sudah menghitung stok seharusnya (POS). Masukkan jumlah fisik hasil hitung manual Anda.
                </p>
                {isLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
                ) : expected.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Belum ada bahan/stok untuk dihitung.</p>
                ) : (
                  <div className="space-y-2">
                    {expected.map((it) => (
                      <div key={keyOf(it)} className="flex items-center gap-3 p-2 rounded-lg border">
                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {it.itemType === "semi_finished" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{it.name}</span>
                          <span className="text-[11px] text-muted-foreground">Seharusnya (POS): {it.currentStock} {it.unit}</span>
                        </div>
                        <Input
                          type="number"
                          className="w-28"
                          placeholder="Fisik"
                          value={counts[keyOf(it)] ?? ""}
                          onChange={(e) => setCounts((p) => ({ ...p, [keyOf(it)]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <label className="text-sm font-medium">Catatan</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional — cth. tumpah, rusak, dll" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Foto Bukti</h2>
                </div>
                <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden flex items-center justify-center mb-3">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Bukti stok" className="w-full h-full object-cover" />
                  ) : cameraOn ? (
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Ambil foto stok sebagai bukti audit</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFilePicked}
                />
                {photoUrl ? (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={retake}><RefreshCw className="w-4 h-4 mr-1.5" />Ambil Ulang</Button>
                    <Button variant="ghost" className="w-full" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1.5" />Ganti dari Galeri</Button>
                  </div>
                ) : cameraOn ? (
                  <div className="space-y-2">
                    <Button className="w-full" onClick={capture}><Camera className="w-4 h-4 mr-1.5" />Jepret</Button>
                    <Button variant="ghost" className="w-full" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1.5" />Unggah Foto</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={startCamera}><Camera className="w-4 h-4 mr-1.5" />Buka Kamera</Button>
                    <Button variant="ghost" className="w-full" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1.5" />Unggah Foto</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base font-bold"
              onClick={submit}
              disabled={uploading || createAudit.isPending || isLoading}
            >
              {uploading || createAudit.isPending ? "Mengirim..." : <><Check className="w-5 h-5 mr-1.5" />Kirim Tutup Shift</>}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
