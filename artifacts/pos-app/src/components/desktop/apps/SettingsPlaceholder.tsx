import { Settings, Moon, Globe, Bell, Shield, User } from "lucide-react";

const sections = [
  { icon: User, label: "Profile", desc: "Account settings" },
  { icon: Bell, label: "Notifications", desc: "Alert preferences" },
  { icon: Moon, label: "Appearance", desc: "Theme & display" },
  { icon: Globe, label: "Language", desc: "Bahasa Indonesia" },
  { icon: Shield, label: "Security", desc: "Password & 2FA" },
];

export default function SettingsPlaceholder() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/5 p-3 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
          <Settings className="w-4 h-4 text-white/40" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Settings
          </span>
        </div>
        {sections.map((s, i) => (
          <button
            key={s.label}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
              i === 0
                ? "bg-white/5 text-white/80"
                : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <h3 className="text-sm font-semibold text-white/80 mb-4">Profile</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold text-white/30">
              U
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">User</p>
              <p className="text-[11px] text-white/30">user@lumeos.com</p>
            </div>
          </div>
          <div className="h-px bg-white/5" />
          <p className="text-[11px] text-white/30">
            Profile settings will be connected to the user management system.
          </p>
        </div>
      </div>
    </div>
  );
}
