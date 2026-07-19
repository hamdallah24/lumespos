import { motion } from "framer-motion";
import AppCard from "./AppCard";
import { appRegistry } from "@/lib/desktop/registry";

interface ApplicationGridProps {
  onAppClick: (appId: string) => void;
}

export default function ApplicationGrid({ onAppClick }: ApplicationGridProps) {
  return (
    <div className="px-5 py-2" style={{ background: "#F6F8FC" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold text-[#111827]">Aplikasi</h2>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {appRegistry.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            <AppCard
              id={app.id}
              title={app.title}
              icon={app.icon}
              color={app.color}
              onClick={() => onAppClick(app.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
