import SettingsWorkspace from "@/modules/settings/SettingsWorkspace";
import OSWorkspaceShell from "@/components/desktop/OSWorkspaceShell";

export default function SettingsPage() {
  return (
    <OSWorkspaceShell
      title="Settings"
      subtitle="Configuration Center"
      color="#1565FF"
      logo="S"
    >
      <SettingsWorkspace />
    </OSWorkspaceShell>
  );
}