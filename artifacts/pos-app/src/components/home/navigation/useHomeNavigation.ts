import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  navigationSections,
  flattenNavigationItems,
  getNavigationGroups,
} from "./NavigationConfig";
import type {
  NavigationItemDefinition,
  NavigationSectionDefinition,
} from "./types";

const FAVORITES_KEY = "sayq.nav.favorites";
const RECENTS_KEY = "sayq.nav.recents";
const COLLAPSED_KEY = "sayq.nav.collapsed";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — abaikan */
  }
}

export function useHomeNavigation() {
  const [currentRoute] = useLocation();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>(
    () => readJSON<Record<string, boolean>>(COLLAPSED_KEY, {})
  );
  const [favorites, setFavorites] = useState<Record<string, boolean>>(
    () => readJSON<Record<string, boolean>>(FAVORITES_KEY, {})
  );
  const [recents, setRecents] = useState<string[]>(
    () => readJSON<string[]>(RECENTS_KEY, [])
  );

  // Tutup drawer otomatis saat route berubah (navigasi workspace OS).
  useEffect(() => {
    setOpen(false);
  }, [currentRoute]);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((v) => !v), []);

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroupIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeJSON(COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeJSON(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const recordNavigation = useCallback((id: string) => {
    setRecents((prev) => {
      const next = [id, ...prev.filter((r) => r !== id)].slice(0, 10);
      writeJSON(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const isSearching = query.trim().length > 0;

  const filteredSections: NavigationSectionDefinition[] = useMemo(() => {
    if (!isSearching) return navigationSections;
    const q = query.trim().toLowerCase();
    const sections = navigationSections
      .map((section) => ({
        ...section,
        groups: section.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
              const haystack = [
                item.label,
                item.description ?? "",
                item.id,
                ...(item.keywords ?? []),
              ]
                .join(" ")
                .toLowerCase();
              return haystack.includes(q);
            }),
          }))
          .filter((group) => group.items.length > 0),
      }))
      .filter((section) => section.groups.length > 0);

    return sections;
  }, [query, isSearching]);

  // Saat mulai mencari, ekspansi semua grup agar hasil terlihat.
  useEffect(() => {
    if (!isSearching) return;
    setCollapsedGroupIds((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const section of navigationSections) {
        for (const group of section.groups) {
          if (next[group.id]) {
            next[group.id] = false;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [isSearching]);

  const isActive = useCallback(
    (item: NavigationItemDefinition): boolean => {
      const t = item.target;
      if (t.kind === "route") {
        return (
          currentRoute === t.href ||
          (t.href !== "/" && currentRoute.startsWith(t.href))
        );
      }
      return false;
    },
    [currentRoute]
  );

  const hasActiveChild = useCallback(
    (groupItems: NavigationItemDefinition[]): boolean =>
      groupItems.some((item) => isActive(item)),
    [isActive]
  );

  const isFavorited = useCallback(
    (id: string) => !!favorites[id],
    [favorites]
  );

  const favoriteItems = useMemo(
    () => flattenNavigationItems().filter((item) => favorites[item.id]),
    [favorites]
  );

  const recentItems = useMemo(
    () =>
      recents
        .map((id) => flattenNavigationItems().find((item) => item.id === id))
        .filter((item): item is NavigationItemDefinition => !!item),
    [recents]
  );

  const allGroups = useMemo(() => getNavigationGroups(), []);

  return {
    open,
    setOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    query,
    setQuery,
    isSearching,
    filteredSections,
    collapsedGroupIds,
    toggleGroup,
    toggleFavorite,
    favorites,
    recordNavigation,
    currentRoute,
    isActive,
    hasActiveChild,
    isFavorited,
    favoriteItems,
    recentItems,
    allGroups,
  };
}

export type HomeNavigation = ReturnType<typeof useHomeNavigation>;