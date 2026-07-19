import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface FloatingAIProps {
  onClick: () => void;
}

export default function FloatingAI({ onClick }: FloatingAIProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      onClick={onClick}
      className="fixed bottom-24 right-5 w-16 h-16 rounded-full flex items-center justify-center z-50 active:scale-90 transition-transform"
      style={{
        background: "linear-gradient(135deg, #2563EB, #3B82F6)",
        boxShadow:
          "0 8px 24px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(142, 216, 255, 0.15)",
      }}
    >
      <Sparkles className="w-6 h-6 text-white" />
    </motion.button>
  );
}
