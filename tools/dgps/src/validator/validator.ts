import type { DocumentSource, ValidationIssue, ValidationReport } from "../types/index.js";

export function validateDocuments(sources: DocumentSource[]): ValidationReport {
  const issues: ValidationIssue[] = [];
  const idMap = new Map<string, DocumentSource[]>();
  const titleMap = new Map<string, DocumentSource[]>();
  let totalFiles = 0;
  let validFiles = 0;
  let skippedFiles = 0;

  for (const src of sources) {
    totalFiles++;
    const fileIssues: ValidationIssue[] = [];

    // Mandatory fields
    if (!src.id) {
      fileIssues.push({ severity: "ERROR", message: "Missing id", file: src.path, rule: "mandatory-id" });
    }
    if (!src.title) {
      fileIssues.push({ severity: "ERROR", message: "Missing title", file: src.path, rule: "mandatory-title" });
    }
    if (!src.owner || src.owner === "unknown") {
      fileIssues.push({ severity: "WARNING", message: `Owner is "${src.owner}"`, file: src.path, rule: "owner" });
    }
    if (!src.consumer || src.consumer.length === 0) {
      fileIssues.push({ severity: "WARNING", message: "No consumer defined", file: src.path, rule: "consumer" });
    }
    if (!src.version) {
      fileIssues.push({ severity: "ERROR", message: "Missing version", file: src.path, rule: "mandatory-version" });
    } else if (!/^\d+\.\d+\.\d+$/.test(src.version)) {
      fileIssues.push({ severity: "ERROR", message: `Version "${src.version}" is not semver`, file: src.path, rule: "version-semver" });
    }
    if (!src.status) {
      fileIssues.push({ severity: "ERROR", message: "Missing status", file: src.path, rule: "mandatory-status" });
    }
    if (!src.checksum) {
      fileIssues.push({ severity: "ERROR", message: "Missing checksum", file: src.path, rule: "mandatory-checksum" });
    }

    // Track for duplicate detection
    if (src.id) {
      if (!idMap.has(src.id)) idMap.set(src.id, []);
      idMap.get(src.id)!.push(src);
    }
    if (src.title) {
      if (!titleMap.has(src.title)) titleMap.set(src.title, []);
      titleMap.get(src.title)!.push(src);
    }

    if (fileIssues.length === 0) validFiles++;
    else skippedFiles++;
    issues.push(...fileIssues);
  }

  // Duplicate ID check
  for (const [id, dupes] of idMap) {
    if (dupes.length > 1) {
      const files = dupes.map(d => d.path).join(", ");
      issues.push({ severity: "ERROR", message: `Duplicate id "${id}" in: ${files}`, rule: "duplicate-id" });
    }
  }

  // Duplicate title check
  for (const [title, dupes] of titleMap) {
    if (dupes.length > 1) {
      const files = dupes.map(d => d.path).join(", ");
      issues.push({ severity: "WARNING", message: `Duplicate title "${title}" in: ${files}`, rule: "duplicate-title" });
    }
  }

  // Broken links check — internal [[id]] or (link) references
  for (const src of sources) {
    const linkRefs = extractLinks(src.content);
    for (const ref of linkRefs) {
      if (ref.startsWith("http://") || ref.startsWith("https://")) continue;
      if (ref.startsWith("#")) continue;
      if (!idMap.has(ref) && !ref.endsWith(".md")) {
        issues.push({
          severity: "WARNING",
          message: `Broken reference "${ref}" in "${src.id}"`,
          file: src.path,
          rule: "broken-link",
        });
      }
    }
  }

  // Circular inheritance check
  const circular = detectCircularInheritance(sources);
  for (const cycle of circular) {
    issues.push({
      severity: "ERROR",
      message: `Circular inheritance: ${cycle.join(" → ")}`,
      rule: "circular-inheritance",
    });
  }

  // Orphan dependency check
  const allIds = new Set(sources.map(s => s.id));
  for (const src of sources) {
    for (const dep of src.dependencies) {
      if (!allIds.has(dep) && !dep.startsWith("http")) {
        issues.push({
          severity: "WARNING",
          message: `Orphan dependency "${dep}" in "${src.id}"`,
          file: src.path,
          rule: "orphan-dependency",
        });
      }
    }
  }

  // Shadowed documents (canonical: false with canonical:true existing)
  const canonicals = new Set(sources.filter(s => s.metadata?.canonical === true).map(s => s.id));
  for (const src of sources) {
    if (src.metadata?.canonical === false && canonicals.has(src.id)) {
      issues.push({
        severity: "WARNING",
        message: `Shadowed document "${src.id}" (canonical: false)`,
        file: src.path,
        rule: "shadowed",
      });
    }
  }

  return {
    passed: issues.filter(i => i.severity === "ERROR").length === 0,
    issues,
    total_files: totalFiles,
    valid_files: validFiles,
    skipped_files: skippedFiles,
  };
}

function extractLinks(content: string): string[] {
  const refs: string[] = [];
  // [[id]] links
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = wikiRegex.exec(content)) !== null) refs.push(m[1].trim());
  // [text](path) links
  const mdRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((m = mdRegex.exec(content)) !== null) refs.push(m[2].trim());
  return refs;
}

function detectCircularInheritance(sources: DocumentSource[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const src of sources) {
    graph.set(src.id, src.inherits.filter(i => sources.some(s => s.id === i)));
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) cycles.push(path.slice(cycleStart).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    path.push(node);
    for (const dep of graph.get(node) || []) dfs(dep);
    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}
