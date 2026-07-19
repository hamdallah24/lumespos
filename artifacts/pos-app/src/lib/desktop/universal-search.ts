/**
 * Lumé OS Universal Search Engine
 * T13X Phase 4
 *
 * Ctrl+K searches EVERYTHING, not just commands.
 * Results come from: ERP, Knowledge, AI Memory, Missions, Workspace, Apps.
 */

import type { CommandItem } from "./types";
import { getAllManifests, searchManifests } from "./app-manifest";
import { searchCommands, getCommands } from "./command-registry";

/* ─── Search Result Types ─── */

export type SearchDomain =
  | "application"
  | "workspace"
  | "command"
  | "customer"
  | "product"
  | "invoice"
  | "employee"
  | "mission"
  | "knowledge"
  | "executive"
  | "tool"
  | "ai-memory"
  | "documentation"
  | "file"
  | "action";

export interface SearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle: string;
  icon: string;
  color?: string;
  action: () => void;
  keywords: string[];
  score: number;           // relevance score 0-1
  metadata?: Record<string, unknown>;
}

export interface SearchProvider {
  id: string;
  domain: SearchDomain;
  name: string;
  enabled: boolean;
  search: (query: string, limit: number) => SearchResult[];
}

/* ─── Provider Registry ─── */

const providers: SearchProvider[] = [];

export function registerSearchProvider(provider: SearchProvider): void {
  const existing = providers.findIndex((p) => p.id === provider.id);
  if (existing >= 0) {
    providers[existing] = provider;
  } else {
    providers.push(provider);
  }
}

export function unregisterSearchProvider(id: string): void {
  const idx = providers.findIndex((p) => p.id === id);
  if (idx >= 0) providers.splice(idx, 1);
}

export function getSearchProviders(): SearchProvider[] {
  return [...providers];
}

/* ─── Built-in Search Providers ─── */

// Application Provider
registerSearchProvider({
  id: "applications",
  domain: "application",
  name: "Applications",
  enabled: true,
  search: (query, limit) => {
    const manifests = searchManifests(query);
    return manifests.slice(0, limit).map((m) => ({
      id: `app-${m.id}`,
      domain: "application" as SearchDomain,
      title: m.displayName,
      subtitle: m.description,
      icon: m.icon,
      color: m.color,
      action: () => {},  // caller will wire this up
      keywords: [m.name, m.displayName, m.category, m.id],
      score: 0.9,
      metadata: { appId: m.id },
    }));
  },
});

// Command Provider (wraps existing command-registry)
registerSearchProvider({
  id: "commands",
  domain: "command",
  name: "Commands",
  enabled: true,
  search: (query, limit) => {
    const cmds = query.trim() ? searchCommands(query) : getCommands();
    return cmds.slice(0, limit).map((cmd) => ({
      id: `cmd-${cmd.id}`,
      domain: "command" as SearchDomain,
      title: cmd.label,
      subtitle: cmd.description || "",
      icon: cmd.icon || "Terminal",
      action: cmd.action,
      keywords: cmd.keywords,
      score: 0.8,
      metadata: { category: cmd.category, shortcut: cmd.shortcut },
    }));
  },
});

// Workspace Provider
registerSearchProvider({
  id: "workspaces",
  domain: "workspace",
  name: "Workspaces",
  enabled: true,
  search: (query, limit) => {
    // Dynamic — reads from workspace store at search time
    return [];  // wired up by the hook
  },
});

// Action Provider (system actions)
const systemActions: SearchResult[] = [
  {
    id: "action-close-all",
    domain: "action",
    title: "Close All Windows",
    subtitle: "Close every open window",
    icon: "Trash2",
    action: () => {},
    keywords: ["close", "all", "windows", "clear"],
    score: 0.7,
  },
  {
    id: "action-new-workspace",
    domain: "action",
    title: "Create New Workspace",
    subtitle: "Add a new workspace",
    icon: "Layers",
    action: () => {},
    keywords: ["create", "new", "workspace"],
    score: 0.7,
  },
  {
    id: "action-settings",
    domain: "action",
    title: "Open Settings",
    subtitle: "System settings and preferences",
    icon: "Settings",
    action: () => {},
    keywords: ["settings", "preferences", "config"],
    score: 0.7,
  },
  {
    id: "action-executive-center",
    domain: "action",
    title: "Open Executive Center",
    subtitle: "View AI executives and missions",
    icon: "Brain",
    action: () => {},
    keywords: ["executive", "ai", "center", "brain"],
    score: 0.7,
  },
  {
    id: "action-sign-out",
    domain: "action",
    title: "Sign Out",
    subtitle: "Sign out of Lumé OS",
    icon: "LogOut",
    action: () => {},
    keywords: ["sign", "out", "logout", "exit"],
    score: 0.5,
  },
];

registerSearchProvider({
  id: "system-actions",
  domain: "action",
  name: "Actions",
  enabled: true,
  search: (query, limit) => {
    if (!query.trim()) return systemActions.slice(0, limit);
    const lower = query.toLowerCase();
    return systemActions
      .filter((a) => {
        const searchable = [a.title, a.subtitle, ...a.keywords].join(" ").toLowerCase();
        return searchable.includes(lower);
      })
      .slice(0, limit);
  },
});

/* ─── Scoring ─── */

function calculateScore(result: SearchResult, query: string): number {
  const lower = query.toLowerCase();
  let score = result.score;
  
  // Boost exact title match
  if (result.title.toLowerCase() === lower) score += 0.3;
  // Boost title starts with query
  else if (result.title.toLowerCase().startsWith(lower)) score += 0.2;
  // Boost title contains query
  else if (result.title.toLowerCase().includes(lower)) score += 0.1;
  
  // Boost keyword match
  const keywordMatch = result.keywords.some((k) => k.toLowerCase().startsWith(lower));
  if (keywordMatch) score += 0.15;
  
  // Boost domain preference
  if (result.domain === "application") score += 0.05;
  if (result.domain === "command") score += 0.03;
  if (result.domain === "action") score += 0.02;
  
  return Math.min(score, 1);
}

/* ─── Main Search Function ─── */

export interface SearchOptions {
  query: string;
  limit?: number;
  domains?: SearchDomain[];
  enabledOnly?: boolean;
}

export function universalSearch(options: SearchOptions): SearchResult[] {
  const { query, limit = 20, domains, enabledOnly = true } = options;
  
  if (!query.trim()) {
    // Return popular/default results
    return getPopularResults(limit);
  }
  
  const activeProviders = providers.filter((p) => {
    if (enabledOnly && !p.enabled) return false;
    if (domains && !domains.includes(p.domain)) return false;
    return true;
  });
  
  const allResults: SearchResult[] = [];
  
  for (const provider of activeProviders) {
    try {
      const results = provider.search(query, limit);
      allResults.push(...results);
    } catch (err) {
      console.error(`[Search] Provider ${provider.id} error:`, err);
    }
  }
  
  // Score and sort
  const scored = allResults.map((r) => ({
    ...r,
    score: calculateScore(r, query),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  // Deduplicate by id
  const seen = new Set<string>();
  return scored.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, limit);
}

function getPopularResults(limit: number): SearchResult[] {
  // Return recent apps and common actions when no query
  const apps = getAllManifests()
    .slice(0, 5)
    .map((m) => ({
      id: `app-${m.id}`,
      domain: "application" as SearchDomain,
      title: m.displayName,
      subtitle: m.description,
      icon: m.icon,
      color: m.color,
      action: () => {},
      keywords: [m.name, m.id],
      score: 0.8,
      metadata: { appId: m.id },
    }));
  
  const actions = systemActions.slice(0, 3);
  
  return [...apps, ...actions].slice(0, limit);
}

/* ─── Domain Labels ─── */

export const domainLabels: Record<SearchDomain, string> = {
  application: "Applications",
  workspace: "Workspaces",
  command: "Commands",
  customer: "Customers",
  product: "Products",
  invoice: "Invoices",
  employee: "Employees",
  mission: "Missions",
  knowledge: "Knowledge",
  executive: "Executives",
  tool: "Tools",
  "ai-memory": "AI Memory",
  documentation: "Documentation",
  file: "Files",
  action: "Actions",
};

export const domainIcons: Record<SearchDomain, string> = {
  application: "AppWindow",
  workspace: "Layers",
  command: "Terminal",
  customer: "Users",
  product: "Package",
  invoice: "FileText",
  employee: "UserCog",
  mission: "Target",
  knowledge: "BookOpen",
  executive: "Crown",
  tool: "Wrench",
  "ai-memory": "Brain",
  documentation: "FileText",
  file: "Folder",
  action: "Zap",
};

/* ─── React Hook ─── */

import { useState, useCallback, useEffect } from "react";

export function useUniversalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(getPopularResults(10));
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      const searchResults = universalSearch({ query, limit: 20 });
      setResults(searchResults);
      setIsSearching(false);
    }, 50); // tiny debounce
    
    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    query,
    results,
    isSearching,
    search,
    clear,
    setQuery,
  };
}
