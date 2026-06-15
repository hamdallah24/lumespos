import React, { createContext, useContext, useEffect, useState } from "react";
import { useListBranches, useGetMe } from "@workspace/api-client-react";
import type { Branch } from "@workspace/api-client-react";

interface BranchContextValue {
  branchId: number | null;
  setBranchId: (id: number) => void;
  branches: Branch[];
  currentBranch?: Branch;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);
const STORAGE_KEY = "sayq.branchId";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { data: branchesData, isLoading } = useListBranches();
  const { data: me } = useGetMe();

  const allBranches = Array.isArray(branchesData) ? branchesData : [];

  // Filter cabang berdasarkan allowedBranches user
  // Owner & manager → akses semua cabang
  // Cashier → hanya cabang yang diizinkan
  const allowedBranches = (me as any)?.allowedBranches as number[] | undefined;
  const isOwnerOrManager = me?.role === "owner" || me?.role === "manager";

  const branches = isOwnerOrManager
    ? allBranches
    : allowedBranches && allowedBranches.length > 0
      ? allBranches.filter((b) => allowedBranches.includes(b.id))
      : allBranches; // fallback semua cabang kalau belum diset

  const [branchId, setBranchIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    if (isLoading || !branches.length) return;
    const valid = branchId != null && branches.some((b) => b.id === branchId);
    if (!valid) {
      setBranchIdState(branches[0].id);
      localStorage.setItem(STORAGE_KEY, String(branches[0].id));
    }
  }, [branches, branchId, isLoading]);

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

  const currentBranch = branches.find((b) => b.id === resolvedBranchId);

  return (
    <BranchContext.Provider
      value={{ branchId: resolvedBranchId, setBranchId, branches, currentBranch }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within a BranchProvider");
  return ctx;
}