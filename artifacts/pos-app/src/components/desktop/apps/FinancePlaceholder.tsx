import DashboardPage from "@/pages/dashboard";
import { BranchProvider } from "@/lib/branch";

export default function FinancePlaceholder() {
  return (
    <BranchProvider>
      <DashboardPage />
    </BranchProvider>
  );
}
