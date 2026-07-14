import { ManifestVerifier } from "../../../src/eios-runtime/internal/runtime-security/ManifestVerifier";
import type { ComponentManifest } from "../../../src/eios-runtime/contracts/Manifest";

const validManifest: ComponentManifest = {
  id: { type: "stage", namespace: "eios.core", name: "test", version: { major: 1, minor: 0, patch: 0 } },
  name: "test",
  description: "test",
  dependencies: [],
  capabilities: [],
  tags: [],
  checksum: "",
  schemaVersion: { major: 1, minor: 0, patch: 0 },
  deprecated: false,
  replacement: null,
  metadata: {},
};

describe("ManifestVerifier", () => {
  test("verify returns valid for well-formed manifest", () => {
    const m = { ...validManifest, checksum: ManifestVerifier.computeChecksum(validManifest) };
    const result = ManifestVerifier.verify(m);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("verify catches checksum mismatch", () => {
    const m = { ...validManifest, checksum: "bad-checksum" };
    const result = ManifestVerifier.verify(m);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  test("verify warns on deprecated without replacement", () => {
    const m = { ...validManifest, deprecated: true, replacement: null, checksum: ManifestVerifier.computeChecksum(validManifest) };
    const result = ManifestVerifier.verify(m);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  test("verify rejects missing id", () => {
    const result = ManifestVerifier.verify({ ...validManifest, id: undefined as any, name: "" });
    expect(result.valid).toBe(false);
  });
});
