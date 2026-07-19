import { useState, useEffect } from "react";
import { Signal, Wifi, BatteryMedium } from "lucide-react";

export default function StatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div
      className="flex items-center justify-between px-6 pt-3 pb-1"
      style={{ background: "#F6F8FC" }}
    >
      <span className="text-[15px] font-semibold text-[#111827] tabular-nums">
        {formatted}
      </span>
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4 text-[#111827]" />
        <Wifi className="w-4 h-4 text-[#111827]" />
        <BatteryMedium className="w-5 h-5 text-[#111827]" />
      </div>
    </div>
  );
}
