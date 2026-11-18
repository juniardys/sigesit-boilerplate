import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";

const { createPrismaClient, prisma } = await import("./index");

describe("createPrismaClient", () => {
  test("throws when connection string is missing", () => {
    expect(() => createPrismaClient("")).toThrow("DATABASE_URL is not set");
  });

  test("creates a new client exposing model delegates without connecting", () => {
    const client = createPrismaClient("postgresql://user:pass@localhost:5432/test");
    expect(client).not.toBe(prisma);
    expect(typeof client.user.findMany).toBe("function");
    expect(typeof client.$connect).toBe("function");
  });
});

describe("prisma singleton", () => {
  test("reuses instance across imports outside production", async () => {
    const again = await import("./index");
    expect(again.prisma).toBe(prisma);
    expect((globalThis as { prisma?: unknown }).prisma).toBe(prisma);
  });
});
