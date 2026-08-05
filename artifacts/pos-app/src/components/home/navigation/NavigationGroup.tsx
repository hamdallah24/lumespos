import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { iconMap } from "./icons";
import NavigationItem from "./NavigationItem";
import type {
  NavigationGroupDefinition,
  NavigationItemDefinition,
} from "./types";

interface NavigationGroupProps {
  group: NavigationGroupDefinition;
  collapsed: boolean;
  hasActiveChild: boolean;
  onToggle: (id: string) => void;
  favorites: Record<string, boolean>;
  onFavoriteToggle: (id: string) => void;
  onNavigate: (item: NavigationItemDefinition) => void;
  isActive: (item: NavigationItemDefinition) => boolean;
  /** search mode — tampilkan semua item apa adanya */
  forceExpanded?: boolean;
}

export default function NavigationGroup({
  group,
  collapsed,
  hasActiveChild,
  onToggle,
  favorites,
  onFavoriteToggle,
  onNavigate,
  isActive,
  forceExpanded,
}: NavigationGroupProps) {
  const isExpanded = forceExpanded || !collapsed;
  const Icon = group.icon ? iconMap[group.icon] : null;

  return (
    <div className="flex flex-col">
      <button
        onClick={() => onToggle(group.id)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[#2563EB]/[0.04] outline-none active:scale-[0.99]"
      >
        {Icon && (
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${group.color ?? "#2563EB"}10`, color: group.color ?? "#2563EB" }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        <span
          className={`flex-1 text-[12px] font-bold uppercase tracking-wide ${
            hasActiveChild ? "text-[#2563EB]" : "text-[#6B7280]"
          }`}
        >
          {group.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 pl-1">
              {group.items.map((item) => (
                <NavigationItem
                  key={item.id}
                  item={item}
                  active={isActive(item)}
                  isFavorite={!!favorites[item.id]}
                  onFavoriteToggle={onFavoriteToggle}
                  onNavigate={onNavigate}
                  showBadge
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}