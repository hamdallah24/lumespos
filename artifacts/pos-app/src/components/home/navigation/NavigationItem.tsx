import { memo } from "react";
import { Star, ChevronRight } from "lucide-react";
import { iconMap } from "./icons";
import type { NavigationItemDefinition } from "./types";

interface NavigationItemProps {
  item: NavigationItemDefinition;
  active?: boolean;
  favorited?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onNavigate: (item: NavigationItemDefinition) => void;
  showBadge?: boolean;
  /** mode pilihan cepat (favorite/recent) — tanpa deskripsi & star */
  compact?: boolean;
}

function NavigationItemBase({
  item,
  active,
  isFavorite,
  onFavoriteToggle,
  onNavigate,
  showBadge,
  compact,
}: NavigationItemProps) {
  const Icon = iconMap[item.icon];
  const isSoon = item.status === "soon";

  return (
    <button
      onClick={() => !isSoon && onNavigate(item)}
      disabled={isSoon}
      className={`group w-full flex items-center gap-3 rounded-xl text-left transition-all outline-none active:scale-[0.98] ${
        compact ? "px-2.5 py-2" : "px-3 py-2.5"
      } ${
        active
          ? "bg-[#2563EB]/[0.08] text-[#2563EB]"
          : isSoon
            ? "text-[#9CA3AF] cursor-not-allowed opacity-70"
            : "text-[#374151] hover:bg-[#2563EB]/[0.05] hover:text-[#2563EB]"
      }`}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: active ? `${item.color}14` : `${item.color}0D`,
          color: active ? item.color : "#6B7280",
        }}
      >
        {Icon ? <Icon className="w-[17px] h-[17px]" /> : null}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold leading-tight">
          {item.label}
          {isSoon && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-[#F3F4F6] text-[#9CA3AF]">
              soon
            </span>
          )}
        </span>
        {!compact && item.description && (
          <span className="block text-[11px] text-[#9CA3AF] leading-tight mt-0.5 truncate">
            {item.description}
          </span>
        )}
      </span>

      {showBadge && (item.badge ?? 0) > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] flex items-center justify-center text-[9px] font-bold text-white">
          {item.badge! > 9 ? "9+" : item.badge}
        </span>
      )}

      {!isSoon && (
        <>
          {onFavoriteToggle && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(item.id);
              }}
              className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                isFavorite
                  ? "text-amber-400"
                  : "text-[#D1D5DB] opacity-0 group-hover:opacity-100 hover:text-amber-400"
              }`}
            >
              <Star className="w-[14px] h-[14px]" fill={isFavorite ? "currentColor" : "none"} />
            </span>
          )}
          {!onFavoriteToggle && (
            <ChevronRight
              className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                active ? "text-[#2563EB]" : "text-[#D1D5DB]"
              }`}
            />
          )}
        </>
      )}
    </button>
  );
}

const NavigationItem = memo(NavigationItemBase);
export default NavigationItem;