import InventoryPage from "@/pages/inventory";
import { BranchProvider } from "@/lib/branch";

export default function InventoryPlaceholder() {
  return (
    <BranchProvider>
      <InventoryPage />
    </BranchProvider>
  );
}
