import { Users } from "lucide-react";

export default function CRMPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
        <Users className="w-8 h-8 text-violet-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white/90">CRM</h2>
        <p className="text-sm text-white/40 mt-1 max-w-xs">
          Customer relationships, contacts, leads, communications.
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        {["Contacts", "Leads", "Pipeline"].map((label) => (
          <div
            key={label}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/30 border border-white/5"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
