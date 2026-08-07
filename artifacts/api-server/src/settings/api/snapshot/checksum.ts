// ConfigCenter — Snapshot checksum utilities (Milestone 3, persistence).
// Deterministic content hash over the effective payload. Restore only succeeds
// when the recomputed checksum equals the stored one (integrity). Uses the same
// stable algorithm as the Registry fingerprint (FNV-1a) so tooling is uniform.

export function fnv1a(str: string): string {
  let h0 = 0x2325;
  let h1 = 0x84222325;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h0 ^= c;
    h0 = Math.imul(h0, 0x01000193);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
  }
  const pad = (n: number) => n.toString(16).padStart(8, "0");
  return `${pad(h1)}${pad(h0)}`;
}

// Canonical serialization — recursively sorts object keys so the hash is stable
// regardless of insertion order (mirrors how Registry checksums stay stable).
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]): [string, string] => [String(k), canonicalize(v)])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${v}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Content hash of a payload object (effective configuration).
export function payloadChecksum(payload: Record<string, unknown>): string {
  return fnv1a(canonicalize(payload));
}