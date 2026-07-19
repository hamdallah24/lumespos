import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Pin,
  Archive,
  Trash2,
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Target,
} from "lucide-react";
import { useNotificationStore } from "@/lib/desktop/notification-store";
import type { Notification } from "@/lib/desktop/types";

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  info: { icon: Info, color: "#3B82F6" },
  success: { icon: CheckCircle, color: "#10B981" },
  warning: { icon: AlertTriangle, color: "#F59E0B" },
  error: { icon: AlertOctagon, color: "#EF4444" },
  mission: { icon: Target, color: "#8B5CF6" },
  ai: { icon: Sparkles, color: "#0EA5E9" },
};

function NotificationItem({
  notif,
  onRead,
  onPin,
  onArchive,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = typeConfig[notif.type] || typeConfig.info;
  const IconComp = cfg.icon;
  const timeAgo = getTimeAgo(notif.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border transition-colors ${
        notif.read
          ? "border-white/[0.03] bg-transparent"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${cfg.color}15` }}
        >
          <span style={{ color: cfg.color } as React.CSSProperties}>
            <IconComp className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${notif.read ? "text-white/50" : "text-white/80"}`}>
              {notif.title}
            </span>
            {notif.pinned && <Pin className="w-2.5 h-2.5 text-primary/50" />}
          </div>
          <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{notif.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-white/20">{timeAgo}</span>
            {notif.source && (
              <span className="text-[9px] text-white/15">· {notif.source}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 shrink-0">
          {!notif.read && (
            <button
              onClick={() => onRead(notif.id)}
              className="w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Mark read"
            >
              <Check className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onPin(notif.id)}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
              notif.pinned ? "text-primary/60" : "text-white/20 hover:text-white/40"
            }`}
            title={notif.pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(notif.id)}
            className="w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-red-400 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    state,
    markRead,
    markAllRead,
    pinNotification,
    archiveNotification,
    deleteNotification,
  } = useNotificationStore();

  const visible = state.notifications.filter((n) => !n.archived);
  const pinned = visible.filter((n) => n.pinned);
  const unpinned = visible.filter((n) => !n.pinned);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="fixed top-8 right-2 z-[9995] w-[340px] max-h-[70vh] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "rgba(10, 18, 35, 0.97)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(142, 216, 255, 0.1)",
            boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[12px] font-semibold text-white/80">Notifications</span>
              {state.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/20 text-primary">
                  {state.unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {state.unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="px-2 py-1 rounded-lg text-[10px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-auto p-3 space-y-1.5">
            {visible.length === 0 && (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[11px] text-white/25">No notifications</p>
              </div>
            )}

            {pinned.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 mb-1">
                  <Pin className="w-2.5 h-2.5 text-white/20" />
                  <span className="text-[9px] font-semibold text-white/20 uppercase tracking-wider">
                    Pinned
                  </span>
                </div>
                {pinned.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notif={n}
                    onRead={markRead}
                    onPin={pinNotification}
                    onArchive={archiveNotification}
                    onDelete={deleteNotification}
                  />
                ))}
              </>
            )}

            {unpinned.map((n) => (
              <NotificationItem
                key={n.id}
                notif={n}
                onRead={markRead}
                onPin={pinNotification}
                onArchive={archiveNotification}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
