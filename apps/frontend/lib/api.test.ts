import { describe, expect, mock, test } from "bun:test";
import { getApiStatus } from "./api";

function fakeFetch(response: Response | Error) {
  return mock(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
}

describe("getApiStatus", () => {
  test("returns status from backend health endpoint", async () => {
    const fetchFn = fakeFetch(Response.json({ status: "ok" }));
    expect(await getApiStatus("http://api.test", fetchFn)).toBe("ok");
    expect(fetchFn).toHaveBeenCalledWith("http://api.test/health", { cache: "no-store" });
  });

  test("returns unreachable when fetch throws", async () => {
    const fetchFn = fakeFetch(new TypeError("fetch failed"));
    expect(await getApiStatus("http://api.test", fetchFn)).toBe("unreachable");
  });

  test("returns unreachable on non-2xx response", async () => {
    const fetchFn = fakeFetch(Response.json({ error: "x" }, { status: 503 }));
    expect(await getApiStatus("http://api.test", fetchFn)).toBe("unreachable");
  });

  test("returns unknown when body has no status string", async () => {
    const fetchFn = fakeFetch(Response.json({ foo: 1 }));
    expect(await getApiStatus("http://api.test", fetchFn)).toBe("unknown");
  });
});
