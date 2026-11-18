const DEFAULT_API_URL = "http://localhost:3001";

export async function getApiStatus(
  apiUrl = process.env.API_URL ?? DEFAULT_API_URL,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  try {
    const res = await fetchFn(`${apiUrl}/health`, { cache: "no-store" });
    if (!res.ok) {
      return "unreachable";
    }
    const data: { status?: unknown } = await res.json();
    return typeof data.status === "string" ? data.status : "unknown";
  } catch {
    return "unreachable";
  }
}
