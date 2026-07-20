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
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className="fixed bottom-28 right-6 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-[0.96] transition-transform"
      style={{
        background: "linear-gradient(135deg, #4F46E5, #6366F1)",
        boxShadow:
          "0 8px 32px rgba(79,70,229,0.35), 0 0 0 1px rgba(165,180,252,0.2)",
      }}
    >
      <Sparkles className="w-6 h-6 text-white" />
    </motion.button>
  );
}
