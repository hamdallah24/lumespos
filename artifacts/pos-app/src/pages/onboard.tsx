import { useState, useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useListBranches } from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";
import { Store, ArrowRight, Clock, Loader2 } from "lucide-react";

export default function CashierOnboardPage() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data: branchesData } = useListBranches();
  const { setBranchId } = useBranch();

  const [step, setStep] = useState<"loading" | "no-access" | "pick-branch" | "redirecting">("loading");
  const [selectedBranch, setSelectedBranch] = useState<{ id: number; name: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [starting, setStarting] = useState(false);

  const role = me?.role ?? "cashier";
  const allowedBranches: number[] = (me as any)?.allowedBranches ?? [];
  const allBranches = Array.isArray(branchesData) ? branchesData : [];
  const accessibleBranches = allBranches.filter((b) => allowedBranches.includes(b.id));

  useEffect(() => {
    if (meLoading) return;
    if (role !== "cashier") {
      window.location.href = "/";
      return;
    }
    if (!allowedBranches || allowedBranches.length === 0) {
      setStep("no-access");
      return;
    }
    if (accessibleBranches.length === 0) {
      setStep("no-access");
      return;
    }
    setStep("pick-branch");
  }, [meLoading, role, allowedBranches, accessibleBranches]);

  const handlePickBranch = (branch: { id: number; name: string }) => {
    setSelectedBranch(branch);
    setDialogOpen(true);
  };

  const handleStartShift = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("Uang modal awal harus diisi dengan benar");
      return;
    }
    if (!selectedBranch) return;
    setStarting(true);
    try {
      const res = await apiFetch("/api/shift/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranch.id,
          cashierId: me?.id,
          cashierName: me?.name || "Kasir",
          openingBalance: balance,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai shift");

      toast.success(`Shift dimulai di ${selectedBranch.name}. Modal awal: Rp ${balance.toLocaleString("id-ID")}`);
      setStep("redirecting");
      setDialogOpen(false);
      setBranchId(selectedBranch.id);
      localStorage.setItem("sayq.lockedBranch", String(selectedBranch.id));
      setTimeout(() => { window.location.href = "/"; }, 800);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memulai shift"));
    } finally {
      setStarting(false);
    }
  };

  if (step === "loading" || meLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "redirecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Clock className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-lg font-semibold">Mengalihkan ke halaman kasir...</p>
      </div>
    );
  }

  if (step === "no-access") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
            <Store className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Belum Ada Akses Cabang</h1>
          <p className="text-muted-foreground leading-relaxed">
            Kamu belum memiliki akses ke cabang mana pun. Silakan hubungi <strong>owner</strong> atau <strong>manager</strong> untuk memberikan akses cabang terlebih dahulu.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 text-left text-sm space-y-2">
            <p className="font-medium">Setelah mendapat akses:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Refresh halaman ini</li>
              <li>Pilih cabang tempat kamu bertugas</li>
              <li>Isi modal awal untuk memulai shift</li>
            </ol>
          </div>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => window.location.reload()}>
            Refresh Halaman
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Pilih Cabang</h1>
            <p className="text-muted-foreground">Pilih cabang tempat kamu akan bertugas hari ini</p>
          </div>
          <div className="grid gap-3">
            {accessibleBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => handlePickBranch({ id: b.id, name: b.name })}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.name}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mulai Shift</DialogTitle>
            <DialogDescription>
              Cabang: <strong>{selectedBranch?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Uang Modal Awal (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="cth. 500000"
                autoFocus
                className="h-12 text-lg rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Isi uang modal awal yang ada di laci kas sebelum memulai transaksi.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setDialogOpen(false)}>
                Kembali
              </Button>
              <Button className="flex-[2] rounded-xl h-11" onClick={handleStartShift} disabled={starting}>
                {starting ? "Memulai..." : "Mulai Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
