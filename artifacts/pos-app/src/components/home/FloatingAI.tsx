import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface FloatingAIProps {
  onClick: () => void;
}

export default function FloatingAI({ onClick }: FloatingAIProps) {
  return (
    <>
      <motion.button
        onClick={onClick}
        className="fixed bottom-28 right-6 w-[68px] h-[68px] rounded-full flex items-center justify-center z-40 active:scale-[0.96] transition-transform"
        style={{
          background: "linear-gradient(135deg, #4F46E5, #6366F1)",
          boxShadow: "0 20px 45px rgba(79,70,229,0.35), 0 0 0 1px rgba(165,180,252,0.15)",
        }}
      >
        <Sparkles className="w-[26px] h-[26px] text-white" />
      </motion.button>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fabPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.03); }
            }
          `,
        }}
      />
    </>
  );
}
