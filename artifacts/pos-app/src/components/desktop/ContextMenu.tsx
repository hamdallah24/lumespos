import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const openMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setMenu({ x, y, items });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const handler = () => closeMenu();
    window.addEventListener("click", handler);
    window.addEventListener("contextmenu", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("contextmenu", handler);
    };
  }, [menu, closeMenu]);

  return { menu, openMenu, closeMenu };
}

export default function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[10000] min-w-[180px] py-1 rounded-xl overflow-hidden"
        style={{
          left: menu.x,
          top: menu.y,
          background: "rgba(15, 25, 45, 0.95)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(142, 216, 255, 0.12)",
          boxShadow:
            "0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(142, 216, 255, 0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menu.items.map((item, i) =>
          item.separator ? (
            <div
              key={i}
              className="my-1 mx-2 h-px bg-white/5"
            />
          ) : (
            <button
              key={i}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              disabled={item.disabled}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {item.icon && (
                <span className="w-4 h-4 flex items-center justify-center text-white/40">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          )
        )}
      </motion.div>
    </AnimatePresence>
  );
}
