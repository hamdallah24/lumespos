import { useCallback, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Minus,
  Maximize2,
  Copy,
  Pin,
  PinOff,
  Layers,
} from "lucide-react";
import { useDesktopStore } from "@/lib/desktop/store";
import { getAppById } from "@/lib/desktop/registry";
import type { WindowState } from "@/lib/desktop/types";

const MENU_BAR_HEIGHT = 32;

interface WindowProps {
  window: WindowState;
}

export default function Window({ window: win }: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    pinWindow,
    unpinWindow,
    setAlwaysOnTop,
  } = useDesktopStore();

  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, dir: "" });

  const appDef = getAppById(win.appId);
  const AppComponent = appDef?.component;

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (win.isMaximized) return;
      e.preventDefault();
      focusWindow(win.id);
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, winX: win.x, winY: win.y };
    },
    [win.id, win.x, win.y, win.isMaximized, focusWindow]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      moveWindow(
        win.id,
        dragStart.current.winX + dx,
        Math.max(MENU_BAR_HEIGHT, dragStart.current.winY + dy)
      );
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, win.id, moveWindow]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, dir: string) => {
      if (win.isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(win.id);
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: win.width,
        h: win.height,
        dir,
      };
    },
    [win.id, win.width, win.height, win.isMaximized, focusWindow]
  );

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const dir = resizeStart.current.dir;
      let newW = resizeStart.current.w;
      let newH = resizeStart.current.h;
      if (dir.includes("e")) newW = resizeStart.current.w + dx;
      if (dir.includes("s")) newH = resizeStart.current.h + dy;
      if (dir.includes("w")) newW = resizeStart.current.w - dx;
      if (dir.includes("n")) newH = resizeStart.current.h - dy;
      resizeWindow(win.id, Math.max(win.minWidth, newW), Math.max(win.minHeight, newH));
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing, win.id, win.minWidth, win.minHeight, resizeWindow]);

  if (win.isMinimized) return null;

  const style: React.CSSProperties = win.isMaximized
    ? {
        position: "fixed",
        top: MENU_BAR_HEIGHT,
        left: 0,
        width: "100vw",
        height: `calc(100vh - ${MENU_BAR_HEIGHT}px)`,
        zIndex: win.isAlwaysOnTop ? 90000 : win.zIndex,
        borderRadius: 0,
      }
    : {
        position: "fixed",
        top: win.y,
        left: win.x,
        width: win.width,
        height: win.height,
        zIndex: win.isAlwaysOnTop ? 90000 : win.zIndex,
        borderRadius: 12,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(142, 216, 255, 0.08)",
      };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.2 }}
      style={style}
      className="flex flex-col overflow-hidden"
      onMouseDown={(e) => { e.stopPropagation(); focusWindow(win.id); }}
    >
      {/* Title bar */}
      <div
        ref={dragRef}
        onMouseDown={handleDragStart}
        onDoubleClick={() =>
          win.isMaximized ? restoreWindow(win.id) : maximizeWindow(win.id)
        }
        className="h-9 flex items-center justify-between px-3 select-none shrink-0"
        style={{
          background: win.isPinned
            ? "rgba(21, 101, 255, 0.12)"
            : "rgba(10, 20, 40, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(142, 216, 255, 0.06)",
          cursor: win.isMaximized ? "default" : "grab",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded flex items-center justify-center"
            style={{ background: `${win.color}30` }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: win.color }}
            />
          </div>
          <span className="text-[11px] font-medium text-white/60 truncate">
            {win.title}
          </span>
          {win.isPinned && (
            <Pin className="w-2.5 h-2.5 text-primary/50" />
          )}
          {win.isAlwaysOnTop && (
            <Layers className="w-2.5 h-2.5 text-amber-400/50" />
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Pin button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              win.isPinned ? unpinWindow(win.id) : pinWindow(win.id);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
              win.isPinned ? "text-primary/60 hover:text-primary/80" : "text-white/30 hover:text-white/60"
            } hover:bg-white/5`}
            title={win.isPinned ? "Unpin" : "Pin to top"}
          >
            {win.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>

          {/* Always on top */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAlwaysOnTop(win.id, !win.isAlwaysOnTop);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
              win.isAlwaysOnTop ? "text-amber-400/60 hover:text-amber-400/80" : "text-white/30 hover:text-white/60"
            } hover:bg-white/5`}
            title={win.isAlwaysOnTop ? "Disable always on top" : "Always on top"}
          >
            <Layers className="w-3 h-3" />
          </button>

          <div className="w-px h-3 bg-white/10 mx-0.5" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              win.isMaximized ? restoreWindow(win.id) : maximizeWindow(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
          >
            {win.isMaximized ? (
              <Copy className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto"
        style={{
          background: "rgba(10, 18, 35, 0.98)",
        }}
      >
        {AppComponent && <AppComponent />}
      </div>

      {/* Resize handles */}
      {!win.isMaximized && (
        <>
          <div onMouseDown={(e) => handleResizeStart(e, "e")} className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-primary/20 transition-colors" />
          <div onMouseDown={(e) => handleResizeStart(e, "s")} className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-primary/20 transition-colors" />
          <div onMouseDown={(e) => handleResizeStart(e, "se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
          <div onMouseDown={(e) => handleResizeStart(e, "w")} className="absolute top-0 left-0 w-1 h-full cursor-w-resize hover:bg-primary/20 transition-colors" />
          <div onMouseDown={(e) => handleResizeStart(e, "n")} className="absolute top-0 left-0 w-full h-1 cursor-n-resize hover:bg-primary/20 transition-colors" />
        </>
      )}
    </motion.div>
  );
}
