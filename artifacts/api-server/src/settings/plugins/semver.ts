// ConfigCenter — Milestone 6 Phase 1: Semver parsing + range matching.
// Minimal, self-contained semver implementation (no external dependency).
// Supports exact, caret (^), tilde (~), and comparison (>=, <=, >, <) ranges.
// Used by Version Compatibility and Dependency Validation.

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[] | null;
}

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/;

/** Parse "1.2.3" / "1.2.3-beta.1". Returns null for malformed input. */
export function parseVersion(input: string): SemVer | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = SEMVER_RE.exec(trimmed);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) return null;
  return {
    major,
    minor,
    patch,
    prerelease: match[4] != null && match[4].length > 0 ? match[4].split(".") : null,
  };
}

export function isSemver(input: string): boolean {
  return parseVersion(input) != null;
}

/** Compare two parsed versions. -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: SemVer, b: SemVer): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  // pre-release rules: no pre-release > with pre-release; compare segment-wise.
  const aPre = a.prerelease;
  const bPre = b.prerelease;
  if (aPre == null && bPre == null) return 0;
  if (aPre == null) return 1;
  if (bPre == null) return -1;
  const len = Math.max(aPre.length, bPre.length);
  for (let i = 0; i < len; i += 1) {
    const ai = aPre[i];
    const bi = bPre[i];
    if (ai == null) return -1;
    if (bi == null) return 1;
    if (ai === bi) continue;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) return Number(ai) < Number(bi) ? -1 : 1;
    if (aNum) return -1;
    if (bNum) return 1;
    return ai < bi ? -1 : 1;
  }
  return 0;
}

export function satisfiesVersion(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;
  return satisfiesParsed(v, range);
}

type ComparatorOp = "=" | ">=" | ">" | "<=" | "<" | "^" | "~";

interface Comparator {
  op: ComparatorOp;
  version: SemVer | null;
}

/** Split a range string on spaces/commas into AND-comparators. */
function parseRange(range: string): Comparator[] {
  const parts = range.trim().split(/[\s,]+/).filter((p) => p.length > 0);
  const out: Comparator[] = [];
  for (const part of parts) {
    if (part === "*" || part === "x" || part === "X") {
      out.push({ op: "=", version: null });
      continue;
    }
    let op: ComparatorOp = "=";
    let body = part;
    const prefix = part.slice(0, 2);
    if (prefix === ">=" || prefix === "<=" || prefix === "^~") {
      op = prefix as ComparatorOp;
      body = part.slice(2);
    } else if (part[0] === "^") {
      op = "^";
      body = part.slice(1);
    } else if (part[0] === "~") {
      op = "~";
      body = part.slice(1);
    } else if (part[0] === ">") {
      op = ">";
      body = part.slice(1);
    } else if (part[0] === "<") {
      op = "<";
      body = part.slice(1);
    }
    if (body.includes("x") || body.includes("X") || body.includes("*")) {
      // partial: 1.x / 1.2.x — treat as range bound.
      const segments = body.split(".");
      const hasMajor = segments[0] != null && !/^[xX*]$/.test(segments[0]);
      const hasMinor = segments[1] != null && !/^[xX*]$/.test(segments[1]);
      const major = hasMajor ? Number(segments[0]) : 0;
      const minor = hasMinor ? Number(segments[1]) : 0;
      if (!hasMinor) out.push({ op: ">=", version: { major, minor: 0, patch: 0, prerelease: null } });
      else out.push({ op: ">=", version: { major, minor, patch: 0, prerelease: null } });
      out.push({ op: "<", version: { major: hasMajor ? major + 1 : Infinity, minor: 0, patch: 0, prerelease: null } });
      continue;
    }
    const parsed = parseVersion(body);
    out.push({ op, version: parsed });
  }
  return out;
}

function satisfiesParsed(v: SemVer, range: string): boolean {
  // OR ranges split on ||
  const ors = range.split("||");
  for (const or of ors) {
    if (satisfiesAnd(v, or)) return true;
  }
  return false;
}

function satisfiesAnd(v: SemVer, range: string): boolean {
  for (const comp of parseRange(range)) {
    if (!satisfiesComparator(v, comp)) return false;
  }
  return true;
}

function satisfiesComparator(v: SemVer, comp: Comparator): boolean {
  if (comp.version == null) return true; // wildcard
  if (!Number.isFinite(comp.version.major)) return false; // Infinity bound marker handled below
  const target = comp.version;
  switch (comp.op) {
    case "=":
      return compareVersions(v, target) === 0;
    case ">=":
      return compareVersions(v, target) >= 0;
    case ">":
      return compareVersions(v, target) > 0;
    case "<=":
      return compareVersions(v, target) <= 0;
    case "<":
      return compareVersions(v, target) < 0;
    case "^": {
      // same major, >= target, and < (major+1).0.0 (0.x special: < 0.(minor+1).0)
      if (v.major !== target.major) return false;
      const floor = target;
      const ceiling =
        v.major === 0
          ? { major: 0, minor: target.minor + 1, patch: 0, prerelease: null }
          : { major: target.major + 1, minor: 0, patch: 0, prerelease: null };
      return compareVersions(v, floor) >= 0 && compareVersions(v, ceiling) < 0;
    }
    case "~": {
      // >= target, < (minor+1).0.0 — tilde locks major.minor
      if (v.major !== target.major) return false;
      if (v.minor !== target.minor) return false;
      return compareVersions(v, target) >= 0;
    }
    default:
      return false;
  }
}
