// SettingsWorkspace — tabbed entry point for the Configuration Center UI.
// Tabs: Fields (SettingsShell), Snapshots, Packages, Health, Audit.

import { useState } from "react";
import { Settings2, History, Package, HeartPulse, ScrollText, Activity } from "lucide-react";
import SettingsShell from "./SettingsShell";
import SnapshotManager from "./components/SnapshotManager";
import PackagesPanel from "./components/PackagesPanel";
import HealthPanel from "./components/HealthPanel";
import AuditCenter from "./components/AuditCenter";
import MaintenanceDashboard from "./components/MaintenanceDashboard";

const TABS = [
  { id: "fields", label: "Configuration", icon: Settings2, component: SettingsShell },
  { id: "snapshots", label: "Snapshots", icon: History, component: SnapshotManager },
  { id: "packages", label: "Packages", icon: Package, component: PackagesPanel },
  { id: "health", label: "Health", icon: HeartPulse, component: HealthPanel },
  { id: "audit", label: "Audit", icon: ScrollText, component: AuditCenter },
  { id: "maintenance", label: "Maintenance", icon: Activity, component: MaintenanceDashboard },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsWorkspace() {
  const [tab, setTab] = useState<TabId>("fields");
  const Active = TABS.find((t) => t.id === tab)!.component;

  return (
    <div className="flex h-full flex-col bg-[#0B1220]">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/5 px-3 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition cursor-pointer ${
              tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Active />
      </div>
    </div>
  );
}