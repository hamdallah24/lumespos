import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Star, Clock, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotificationStore } from "@/lib/desktop/notification-store";
import NavigationSection from "./NavigationSection";
import NavigationItem from "./NavigationItem";
import { findNavigationItem } from "./NavigationConfig";
import type { HomeNavigation } from "./useHomeNavigation";
import type { NavigationItemDefinition } from "./types";

export interface HomeNavigationDrawerProps {
  nav: HomeNavigation;
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
  /** Buka aplikasi di dalam HomeScreen (target kind === "app") */
  onOpenApp: (appId: string) => void;
  /** Navigasi workspace OS (target kind === "route" / "tab") */
  onNavigateRoute: (href: string) => void;
  onSelectTab: (tab: "home" | "apps" | "mission" | "profile") => void;
}

export default function HomeNavigationDrawer({
  nav,
  user,
  onSignOut,
  onOpenApp,
  onNavigateRoute,
  onSelectTab,
}: HomeNavigationDrawerProps) {
  const isMobile = useIsMobile();
  const { state: notifState } = useNotificationStore();

  const drawerWidth = isMobile ? 340 : 420;
  const panelStyle = { width: drawerWidth };

  const handleNavigate = (item: NavigationItemDefinition) => {
    nav.recordNavigation(item.id);
    const t = item.target;
    if (t.kind === "app") {
      nav.closeDrawer();
      onOpenApp(t.appId);
    } else if (t.kind === "route") {
      nav.closeDrawer();
      onNavigateRoute(t.href);
    } else if (t.kind === "tab") {
      nav.closeDrawer();
      onSelectTab(t.tab);
    }
  };

  const favoriteItems = useMemo(() => nav.favoriteItems, [nav.favoriteItems]);
  const recentItems = useMemo(() => nav.recentItems, [nav.recentItems]);

  return (
    <AnimatePresence>
      {nav.open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            onClick={nav.closeDrawer}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: -drawerWidth - 8 }}
            animate={{ x: 0 }}
            exit={{ x: -drawerWidth - 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-[70] flex flex-col bg-[#FFFFFF] shadow-2xl"
            style={{
              ...panelStyle,
              boxShadow: "0 0 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 px-5 pt-5 pb-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(37,99,235,0.05), rgba(255,255,255,0))",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[15px] font-bold"
                    style={{
                      background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                    }}
                  >
                    L
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#111827] leading-tight">
                      LUMÉ'S OS
                    </p>
                    <p className="text-[10px] text-[#6B7280] tracking-wide">
                      Cloud Operating System
                    </p>
                  </div>
                </div>
                <button
                  onClick={nav.closeDrawer}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/80 hover:bg-white text-[#111827] transition-colors border border-black/[0.04]"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  value={nav.query}
                  onChange={(e) => nav.setQuery(e.target.value)}
                  placeholder="Cari aplikasi, halaman, menu..."
                  className="w-full h-11 pl-10 pr-9 rounded-xl text-[13px] text-[#111827] placeholder:text-[#9CA3AF] bg-white border border-black/[0.06] outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
                {nav.query && (
                  <button
                    onClick={() => nav.setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 sidebar-scrollbar">
              {nav.isSearching ? (
                /* ── Mode pencarian ── */
                <div className="flex flex-col gap-0.5 pt-2">
                  {nav.filteredSections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-16 text-center">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: "#EEF2FF" }}
                      >
                        <Search className="w-6 h-6 text-[#6366F1]" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#111827]">
                        Tidak ada hasil
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-1">
                        Coba kata kunci lain
                      </p>
                    </div>
                  ) : (
                    nav.filteredSections.map((section) => (
                      <NavigationSection
                        key={section.id}
                        section={section}
                        collapsedGroupIds={nav.collapsedGroupIds}
                        hasActiveChild={nav.hasActiveChild}
                        onToggleGroup={nav.toggleGroup}
                        favorites={nav.favorites}
                        onFavoriteToggle={nav.toggleFavorite}
                        onNavigate={handleNavigate}
                        isActive={nav.isActive}
                        forceExpanded
                      />
                    ))
                  )}
                </div>
              ) : (
                /* ── Mode normal ── */
                <>
                  {/* Favorites */}
                  {favoriteItems.length > 0 && (
                    <div className="flex flex-col gap-0.5 pt-2">
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] flex items-center gap-1.5">
                        <Star className="w-3 h-3" fill="currentColor" /> Favorites
                      </p>
                      {favoriteItems.map((item) => (
                        <NavigationItem
                          key={item.id}
                          item={item}
                          active={nav.isActive(item)}
                          isFavorite
                          onNavigate={handleNavigate}
                          compact
                        />
                      ))}
                    </div>
                  )}

                  {/* Recents */}
                  {recentItems.length > 0 && (
                    <div className="flex flex-col gap-0.5 pt-1">
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Recent
                      </p>
                      {recentItems.slice(0, 4).map((item) => (
                        <NavigationItem
                          key={item.id}
                          item={item}
                          active={nav.isActive(item)}
                          onNavigate={handleNavigate}
                          compact
                        />
                      ))}
                    </div>
                  )}

                  {/* Main menu sections */}
                  {nav.filteredSections.map((section) => (
                    <NavigationSection
                      key={section.id}
                      section={section}
                      collapsedGroupIds={nav.collapsedGroupIds}
                      hasActiveChild={nav.hasActiveChild}
                      onToggleGroup={nav.toggleGroup}
                      favorites={nav.favorites}
                      onFavoriteToggle={nav.toggleFavorite}
                      onNavigate={handleNavigate}
                      isActive={nav.isActive}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Footer: user + sign out */}
            <div className="shrink-0 border-t border-black/[0.05] px-4 py-3 flex items-center gap-3 bg-white">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                style={{ background: "#2563EB" }}
              >
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#111827] truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-[#6B7280] truncate capitalize">
                  {user?.role || "Owner"}
                </p>
              </div>
              {notifState.unreadCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-[#EEF2FF] text-[10px] font-semibold text-[#4F46E5]">
                  {notifState.unreadCount} unread
                </span>
              )}
              <button
                onClick={onSignOut}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                title="Keluar"
              >
                <LogOut className="w-[17px] h-[17px]" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Helper untuk drawer lain jika perlu akses item via id. */
export function getNavItemById(id: string): NavigationItemDefinition | undefined {
  return findNavigationItem(id);
}