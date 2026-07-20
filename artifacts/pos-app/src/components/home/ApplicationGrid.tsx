import { motion } from "framer-motion";
import AppCard from "./AppCard";
import { appRegistry } from "@/lib/desktop/registry";

interface ApplicationGridProps {
  onAppClick: (appId: string) => void;
}

export default function ApplicationGrid({ onAppClick }: ApplicationGridProps) {
  return (
    <div className="px-6 py-0">
      <h2 className="text-[22px] font-bold text-[#111827] mb-4 tracking-tight">
        Applications
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {appRegistry.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: i * 0.04 }}
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
