// ConfigCenter — env-seed bridge tests.
// Verifies seedEnvOverrides maps runtime env into default-scope store overrides
// WITHOUT touching the Registry catalog or overwriting committed values.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { ConfigCenter } from "../../../src/settings";
import { seedEnvOverrides } from "../../../src/settings/env-seed";

async function freshCenter(): Promise<ConfigCenter> {
  const c = new ConfigCenter();
  await c.init();
  return c;
}

const ENV_KEYS = [
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "GOOGLE_GEMINI_API_KEY",
  "GEMINI_MODEL",
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("seedEnvOverrides", () => {
  it("seeds declared provider keys from env into default scope", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-real-secret";
    process.env.DEEPSEEK_BASE_URL = "https://api.example.com";
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    const center = await freshCenter();
    const seeded = await seedEnvOverrides(center);

    expect(seeded).toBeGreaterThanOrEqual(3);

    const model = await center.resolver.resolve("providers.deepseek.model", {});
    expect(model.value).toBe("deepseek-v4-flash");
    expect(model.source.type).toBe("default");

    const apiKey = await center.resolver.resolve("providers.deepseek.apiKey", {});
    expect(apiKey.value).toBe("sk-real-secret");

    const gemini = await center.resolver.resolve("providers.gemini.model", {});
    expect(gemini.value).toBe("gemini-2.5-flash");
  });

  it("ignores empty and placeholder env values", async () => {
    process.env.DEEPSEEK_API_KEY = "your_gemini_api_key_here";
    process.env.DEEPSEEK_MODEL = "";
    process.env.GEMINI_MODEL = "changeme";

    const center = await freshCenter();
    const seeded = await seedEnvOverrides(center);
    expect(seeded).toBe(0);

    const model = await center.resolver.resolve("providers.deepseek.model", {});
    expect(model.value).toBe("deepseek-chat");
  });

  it("never overwrites an existing committed override", async () => {
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    const center = await freshCenter();

    // Commit first — must win over env.
    center.store.commit({ type: "default" }, { "providers.deepseek.model": "user-picked" }, "owner", "c1");
    center.resolver.invalidate();

    const seeded = await seedEnvOverrides(center);
    const model = await center.resolver.resolve("providers.deepseek.model", {});
    expect(model.value).toBe("user-picked");
    expect(seeded).toBe(0);
  });

  it("does not mutate the Registry catalog or checksum", async () => {
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    const center = await freshCenter();
    const checksumBefore = center.registry.getChecksum();
    const fieldsBefore = center.registry.list().length;

    await seedEnvOverrides(center);

    expect(center.registry.getChecksum()).toBe(checksumBefore);
    expect(center.registry.list().length).toBe(fieldsBefore);
    expect(center.registry.get("providers.deepseek.model")?.defaultValue).toBe("deepseek-chat");
  });
});
