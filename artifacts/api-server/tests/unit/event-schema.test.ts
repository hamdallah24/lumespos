import { describe, it, expect } from "vitest";

describe("EventSchemaRegistry", () => {
  it("should register and validate an event schema", async () => {
    const { registerSchema, validateEventData } = await import("../../src/event-schema/EventSchemaRegistry");
    registerSchema("test.event", 1, (d: any) => typeof d.value === "number");
    const valid = validateEventData("test.event", 1, { value: 42 });
    expect(valid.valid).toBe(true);
    const invalid = validateEventData("test.event", 1, { value: "not-a-number" });
    expect(invalid.valid).toBe(false);
  });

  it("should return valid if no schema registered", async () => {
    const { validateEventData } = await import("../../src/event-schema/EventSchemaRegistry");
    const result = validateEventData("unknown.event", 1, { anything: true });
    expect(result.valid).toBe(true);
  });

  it("should track multiple schema versions", async () => {
    const { registerSchema, getSchemaVersions } = await import("../../src/event-schema/EventSchemaRegistry");
    registerSchema("versioned.event", 1, () => true);
    registerSchema("versioned.event", 2, () => true);
    const versions = getSchemaVersions("versioned.event");
    expect(versions).toEqual([2, 1]);
  });

  it("should deprecate and sunset schemas", async () => {
    const { registerSchema, deprecateSchema, sunsetSchema, validateEventData } = await import("../../src/event-schema/EventSchemaRegistry");
    registerSchema("lifecycle.event", 1, () => true);
    deprecateSchema("lifecycle.event", 1);
    sunsetSchema("lifecycle.event", 1);
    const result = validateEventData("lifecycle.event", 1, {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain("sunset");
  });

  it("should provide schema stats", async () => {
    const { registerSchema, getSchemaStats } = await import("../../src/event-schema/EventSchemaRegistry");
    registerSchema("stats.event", 1, () => true);
    const stats = getSchemaStats();
    expect(stats["stats.event"]).toBeDefined();
    expect(stats["stats.event"].versions).toBeGreaterThanOrEqual(1);
  });
});

describe("SchemaValidator", () => {
  it("should validate a BaseEvent through SchemaValidator", async () => {
    const { registerSchema } = await import("../../src/event-schema/EventSchemaRegistry");
    const { validateEvent } = await import("../../src/event-schema/SchemaValidator");
    registerSchema("validation.event", 1, (d: any) => typeof d.x === "number");
    const ok = validateEvent({ type: "validation.event", version: 1, data: { x: 10 } } as any);
    expect(ok).toBe(true);
    const fail = validateEvent({ type: "validation.event", version: 1, data: { x: "bad" } } as any);
    expect(fail).toBe(false);
  });
});

describe("VersionMigrator", () => {
  it("should register and apply migrations", async () => {
    const { registerMigration, migrate } = await import("../../src/event-schema/VersionMigrator");
    registerMigration("migratable.event", 1, 2, (data) => ({
      ...data,
      fullName: `${data.firstName}-${data.lastName}`,
    }));
    const result = migrate("migratable.event", { firstName: "John", lastName: "Doe" } as any, 1, 2);
    expect(result.fullName).toBe("John-Doe");
  });

  it("should migrate step by step to latest", async () => {
    const { registerMigration, migrateToLatest } = await import("../../src/event-schema/VersionMigrator");
    const { registerSchema } = await import("../../src/event-schema/EventSchemaRegistry");
    registerSchema("multi-migrate.event", 3, () => true);
    registerMigration("multi-migrate.event", 1, 2, (d) => ({ ...d, v2: true }));
    registerMigration("multi-migrate.event", 2, 3, (d) => ({ ...d, v3: true }));
    const result = migrateToLatest("multi-migrate.event", { v1: true } as any, 1);
    expect(result.version).toBe(3);
    expect(result.data.v1).toBe(true);
    expect(result.data.v2).toBe(true);
    expect(result.data.v3).toBe(true);
  });
});

describe("EventCompatibility", () => {
  it("should detect breaking field type changes", async () => {
    const { checkFieldCompatibility } = await import("../../src/event-schema/EventCompatibility");
    const result = checkFieldCompatibility(
      { name: "string", age: "number" },
      { name: "number", age: "number" },
    );
    expect(result.compatible).toBe(false);
    expect(result.breakingChanges.length).toBeGreaterThan(0);
  });

  it("should warn on field removal", async () => {
    const { checkFieldCompatibility } = await import("../../src/event-schema/EventCompatibility");
    const result = checkFieldCompatibility(
      { name: "string", oldField: "string" },
      { name: "string" },
    );
    expect(result.compatible).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("EventSchema Bootstrap", () => {
  it("should register all 14 domain event schemas", async () => {
    const { registerAllEventSchemas } = await import("../../src/event-schema/bootstrap");
    const { getAllRegisteredTypes, validateEventData } = await import("../../src/event-schema/EventSchemaRegistry");
    registerAllEventSchemas();
    const types = getAllRegisteredTypes();
    expect(types.length).toBeGreaterThanOrEqual(14);
    // Verify a known event validates correctly
    const valid = validateEventData("order.created", 1, {
      branchId: 1, orderId: 100, total: 50000, paymentMethod: "cash", items: [],
    } as any);
    expect(valid.valid).toBe(true);
  });
});
