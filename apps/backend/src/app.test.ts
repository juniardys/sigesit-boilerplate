import { beforeEach, describe, expect, mock, test } from "bun:test";

const findMany = mock();

mock.module("@repo/database", () => ({
  prisma: { user: { findMany } },
}));

const { app } = await import("./app");

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /health", () => {
  test("returns ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("sets security headers", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});

describe("CORS", () => {
  test("allows configured origin", async () => {
    const res = await app.request("/health", { headers: { Origin: "http://localhost:3000" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  test("allows origin from comma-separated list with spaces", async () => {
    const original = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = "https://a.example, https://b.example";
    const { app: freshApp } = await import(`./app?cors=${Date.now()}`);
    process.env.CORS_ORIGIN = original;

    const res = await freshApp.request("/health", { headers: { Origin: "https://b.example" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("https://b.example");
  });

  test("rejects unknown origin", async () => {
    const res = await app.request("/health", { headers: { Origin: "https://evil.example" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("GET /users", () => {
  test("returns users from database", async () => {
    const users = [{ id: "1", name: "A", createdAt: "2026-01-01T00:00:00.000Z" }];
    findMany.mockResolvedValue(users);

    const res = await app.request("/users");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(users);
  });

  test("does not select private fields such as email", async () => {
    findMany.mockResolvedValue([]);

    await app.request("/users");

    const query = findMany.mock.calls[0]?.[0];
    expect(query.select).toBeDefined();
    expect(query.select.email).toBeUndefined();
    expect(query.take).toBeLessThanOrEqual(50);
  });

  test("returns generic 500 without leaking error details", async () => {
    findMany.mockRejectedValue(new Error("connection refused at 10.0.0.5"));
    const originalError = console.error;
    console.error = () => {};

    const res = await app.request("/users");

    console.error = originalError;
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ error: "Internal Server Error" }));
    expect(body).not.toContain("10.0.0.5");
  });
});

describe("body limit", () => {
  test("rejects payload over 1MB", async () => {
    const res = await app.request("/health", {
      method: "POST",
      body: "x".repeat(1024 * 1024 + 1),
      headers: { "Content-Length": String(1024 * 1024 + 1) },
    });
    expect(res.status).toBe(413);
  });
});
