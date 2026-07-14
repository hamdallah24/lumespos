export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  build?: string;
}

export type ComponentType =
  | "stage" | "observer" | "trigger" | "profile"
  | "plugin" | "policy" | "event" | "executive";

export interface ComponentId {
  namespace: string;
  type: ComponentType;
  name: string;
  version: SemVer;
}

export function parseComponentId(str: string): ComponentId {
  const parts = str.split(":");
  if (parts.length !== 3) throw new Error(`Invalid ComponentId format: "${str}". Expected "namespace:type:name@version"`);

  const nameVersion = parts[2].split("@");
  if (nameVersion.length !== 2) throw new Error(`Invalid ComponentId format: "${str}". Missing version`);

  const versionParts = nameVersion[1].split(".");
  const version: SemVer = {
    major: parseInt(versionParts[0]) || 0,
    minor: parseInt(versionParts[1]) || 0,
    patch: parseInt(versionParts[2]) || 0,
  };

  if (versionParts[3]) version.preRelease = versionParts[3];
  if (versionParts[4]) version.build = versionParts[4];

  return {
    namespace: parts[0],
    type: parts[1] as ComponentType,
    name: nameVersion[0],
    version,
  };
}

export function formatComponentId(id: ComponentId): string {
  let base = `${id.namespace}:${id.type}:${id.name}@${id.version.major}.${id.version.minor}.${id.version.patch}`;
  if (id.version.preRelease) base += `.${id.version.preRelease}`;
  if (id.version.build) base += `.${id.version.build}`;
  return base;
}

export function componentIdEquals(a: ComponentId, b: ComponentId): boolean {
  return a.namespace === b.namespace
    && a.type === b.type
    && a.name === b.name
    && a.version.major === b.version.major
    && a.version.minor === b.version.minor
    && a.version.patch === b.version.patch;
}

function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function parseConstraint(constraint: string): { operator: string; major: number; minor: number; patch: number } {
  const cleaned = constraint.trim();
  let operator = "=";
  let versionStr = cleaned;

  if (cleaned.startsWith(">=")) { operator = ">="; versionStr = cleaned.slice(2); }
  else if (cleaned.startsWith("^")) { operator = "^"; versionStr = cleaned.slice(1); }
  else if (cleaned.startsWith(">")) { operator = ">"; versionStr = cleaned.slice(1); }
  else if (cleaned.startsWith("<")) { operator = "<"; versionStr = cleaned.slice(1); }
  else if (cleaned.startsWith("~")) { operator = "~"; versionStr = cleaned.slice(1); }

  const parts = versionStr.split(".");
  return {
    operator,
    major: parseInt(parts[0]) || 0,
    minor: parseInt(parts[1]) || 0,
    patch: parseInt(parts[2]) || 0,
  };
}

export function satisfies(constraint: string, version: SemVer): boolean {
  const c = parseConstraint(constraint);
  const cmp = compareVersions(version, { major: c.major, minor: c.minor, patch: c.patch });

  switch (c.operator) {
    case "=": return cmp === 0;
    case ">=": return cmp >= 0;
    case ">": return cmp > 0;
    case "<": return cmp < 0;
    case "~": return version.major === c.major && version.minor === c.minor && version.patch >= c.patch;
    case "^": return version.major === c.major && (version.major !== 0 || version.minor >= c.minor);
    default: return cmp === 0;
  }
}

export function parseStageId(str: string): ComponentId {
  const id = parseComponentId(str);
  if (id.type !== "stage") throw new Error(`Expected stage type, got "${id.type}"`);
  return id;
}
