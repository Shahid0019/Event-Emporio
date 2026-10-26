/** JSON calls from the browser to our own API, with a readable error either way. */
export async function sendJson<T = unknown>(
  url: string,
  body?: unknown,
  method: "POST" | "PUT" | "GET" = "POST",
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: data as T };
    const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : "";
    return { ok: false, error: message || "Something went wrong. Please try again.", status: res.status };
  } catch {
    return { ok: false, error: "Can't reach the shop right now. Check your connection and try again.", status: 0 };
  }
}
