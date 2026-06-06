import React, { createContext, useContext, useEffect, useState } from "react";
import { useListBranches } from "@workspace/api-client-react";
import type { Branch } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface BranchContextValue {
  branchId: number;
  setBranchId: (id: number) => void;
  branches: Branch[];
  currentBranch?: Branch;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);
const STORAGE_KEY = "sayq.branchId";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { data: branches = [], isLoading } = useListBranches();
  const [branchId, setBranchIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    if (!branches.length) return;
    const valid = branchId != null && branches.some((b) => b.id === branchId);
    if (!valid) {
      setBranchIdState(branches[0].id);
      localStorage.setItem(STORAGE_KEY, String(branches[0].id));
    }
  }, [branches, branchId]);

  const setBranchId = (id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setBranchIdState(id);
  };

  const resolvedBranchId =
    branchId != null && branches.some((b) => b.id === branchId)
      ? branchId
      : branches.length
        ? branches[0].id
        : null;

  if (isLoading || resolvedBranchId == null) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const currentBranch = branches.find((b) => b.id === resolvedBranchId);

  return (
    <BranchContext.Provider value={{ branchId: resolvedBranchId, setBranchId, branches, currentBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within a BranchProvider");
  return ctx;
}
