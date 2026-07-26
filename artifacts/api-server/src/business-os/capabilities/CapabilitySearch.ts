import type { BusinessCapability, CapabilitySearchResult, CapabilityDomain } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityManager from "./CapabilityManager";

export function searchCapabilities(query: string): CapabilitySearchResult[] {
  const lower = query.toLowerCase();
  const results: CapabilitySearchResult[] = [];

  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    const matches: { type: CapabilitySearchResult["matchType"]; reason: string; actions: string[] }[] = [];

    if (cap.id.toLowerCase() === lower || cap.name.toLowerCase().includes(lower)) {
      matches.push({ type: "exact", reason: `Capability name matches '${query}'`, actions: cap.supportedActions.map(a => a.name) });
    }

    if (cap.domain.toLowerCase().includes(lower)) {
      matches.push({ type: "domain", reason: `Domain '${cap.domain}' matches '${query}'`, actions: cap.supportedActions.map(a => a.name) });
    }

    const matchedActions = cap.supportedActions.filter(a =>
      a.name.toLowerCase().includes(lower) || a.purpose.toLowerCase().includes(lower)
    );
    if (matchedActions.length > 0) {
      matches.push({ type: "action", reason: `${matchedActions.length} action(s) match '${query}'`, actions: matchedActions.map(a => a.name) });
    }

    const keywordMatch = cap.description.toLowerCase().includes(lower) || cap.tags.some(t => t.toLowerCase().includes(lower));
    if (keywordMatch) {
      matches.push({ type: "keyword", reason: `Description or tags match '${query}'`, actions: cap.supportedActions.map(a => a.name) });
    }

    if (matches.length > 0) {
      const bestMatch = matches[0];
      results.push({ capability: cap, matchType: bestMatch.type, matchReason: bestMatch.reason, relevantActions: bestMatch.actions });
    }
  }

  const priority = { exact: 0, domain: 1, action: 2, keyword: 3 };
  results.sort((a, b) => (priority[a.matchType] || 99) - (priority[b.matchType] || 99));

  return results;
}

export function searchByDomain(domain: CapabilityDomain): CapabilitySearchResult[] {
  return CapabilityRegistry.getCapabilitiesByDomain(domain).map(cap => ({
    capability: cap,
    matchType: "domain" as const,
    matchReason: `Domain: ${domain}`,
    relevantActions: cap.supportedActions.map(a => a.name),
  }));
}

export function searchByExecutive(executive: string): CapabilitySearchResult[] {
  return CapabilityRegistry.getCapabilitiesByExecutive(executive).map(cap => ({
    capability: cap,
    matchType: "domain" as const,
    matchReason: `Owned by: ${executive}`,
    relevantActions: cap.supportedActions.map(a => a.name),
  }));
}

export function searchByAction(actionName: string): CapabilitySearchResult[] {
  const results = CapabilityRegistry.getAllActionsByActionName(actionName);
  return results.map(r => ({
    capability: r.capability,
    matchType: "action" as const,
    matchReason: `Action '${actionName}' tersedia`,
    relevantActions: [r.action.name],
  }));
}

export function searchByKeyword(keyword: string): CapabilitySearchResult[] {
  const lower = keyword.toLowerCase();
  return CapabilityRegistry.getAllCapabilities()
    .filter(cap =>
      cap.description.toLowerCase().includes(lower) ||
      cap.tags.some(t => t.toLowerCase().includes(lower)) ||
      cap.name.toLowerCase().includes(lower)
    )
    .map(cap => ({
      capability: cap,
      matchType: "keyword" as const,
      matchReason: `Keyword '${keyword}' ditemukan`,
      relevantActions: cap.supportedActions.map(a => a.name),
    }));
}

export function quickSearch(query: string): string[] {
  const results = searchCapabilities(query);
  return results.map(r => `[${r.matchType}] ${r.capability.name} (${r.capability.id}) — ${r.matchReason}`);
}
