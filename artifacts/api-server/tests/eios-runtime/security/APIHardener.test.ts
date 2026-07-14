import { APIHardener } from "../../../src/eios-runtime/internal/runtime-security/APIHardener";

describe("APIHardener", () => {
  beforeEach(() => APIHardener.clearRateLimits());

  test("sanitize strips script tags", () => {
    expect(APIHardener.sanitize("<script>alert('xss')</script>hello")).toBe("hello");
  });

  test("sanitize strips event handlers", () => {
    expect(APIHardener.sanitize("<div onclick='evil()'>text</div>")).toBe("<div>text</div>");
  });

  test("sanitize removes prototype pollution keys", () => {
    const polluted = { "__proto__": { "admin": true }, "normal": "ok" };
    const result = APIHardener.sanitize(polluted) as Record<string, unknown>;
    expect(result["normal"]).toBe("ok");
  });

  test("rateLimit allows up to limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(APIHardener.rateLimit("test-key", 3, 60000)).toBe(true);
    }
  });

  test("rateLimit blocks after limit", () => {
    for (let i = 0; i < 3; i++) APIHardener.rateLimit("block-key", 3, 60000);
    expect(APIHardener.rateLimit("block-key", 3, 60000)).toBe(false);
  });

  test("validateInput rejects unexpected keys", () => {
    const result = APIHardener.validateInput({ name: "test", extra: "bad" }, ["name"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("extra");
  });

  test("validateInput accepts allowed keys", () => {
    const result = APIHardener.validateInput({ name: "test" }, ["name"]);
    expect(result.valid).toBe(true);
  });
});
