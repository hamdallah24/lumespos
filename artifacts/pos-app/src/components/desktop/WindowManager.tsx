import { AnimatePresence } from "framer-motion";
import { useDesktopStore } from "@/lib/desktop/store";
import Window from "./Window";

export default function WindowManager() {
  const { state } = useDesktopStore();

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ top: 32 }}>
      <AnimatePresence>
        {state.windows.map((win) => (
          <div key={win.id} className="pointer-events-auto">
            <Window window={win} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
