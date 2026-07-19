import CashierPage from "@/pages/cashier";
import { BranchProvider } from "@/lib/branch";

export default function POSPlaceholder() {
  return (
    <BranchProvider>
      <CashierPage />
    </BranchProvider>
  );
}
