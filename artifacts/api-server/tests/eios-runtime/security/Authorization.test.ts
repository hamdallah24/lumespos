import { Authorization } from "../../../src/eios-runtime/internal/runtime-security/Authorization";

describe("Authorization", () => {
  beforeEach(() => Authorization.clear());

  test("defineRole and check by role", () => {
    Authorization.defineRole("ADMIN", ["delete_all", "read_all"]);
    expect(Authorization.check("user1", "ADMIN", "delete_all")).toBe(true);
    expect(Authorization.check("user1", "ADMIN", "unknown")).toBe(false);
  });

  test("grant direct permission", () => {
    Authorization.grant("user2", "execute_pipeline");
    expect(Authorization.check("user2", null, "execute_pipeline")).toBe(true);
  });

  test("assert throws on missing permission", () => {
    expect(() => Authorization.assert("user3", null, "sudo")).toThrow("Permission denied");
  });

  test("assert passes with valid permission", () => {
    Authorization.grant("user4", "read_context");
    expect(() => Authorization.assert("user4", null, "read_context")).not.toThrow();
  });

  test("revoke removes permission", () => {
    Authorization.grant("user5", "emit_event");
    Authorization.revoke("user5", "emit_event");
    expect(Authorization.check("user5", null, "emit_event")).toBe(false);
  });
});
