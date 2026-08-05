import SettingsPlaceholder from "@/components/desktop/apps/SettingsPlaceholder";
import OSWorkspaceShell from "@/components/desktop/OSWorkspaceShell";

export default function SettingsPage() {
  return (
    <OSWorkspaceShell
      title="Settings"
      subtitle="Konfigurasi sistem"
      color="#64748B"
      logo="S"
    >
      {/* SettingsPlaceholder dirancang untuk background gelap */}
      <div className="h-full bg-[#0B1220]">
        <SettingsPlaceholder />
      </div>
    </OSWorkspaceShell>
  );
}