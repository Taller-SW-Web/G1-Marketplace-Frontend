import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../src/app/api/checkout/[...path]/route";

const ORIGIN = "https://web.example";
const SESSION = `g1_session=${"a".repeat(43)}`;
const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });

function request(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest(`${ORIGIN}/api/checkout/${path}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body,
  });
}

describe("checkout route in bff mode", () => {
  beforeEach(() => {
    vi.stubEnv("CHECKOUT_MODE", "bff");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_MODE", "bff");
    vi.stubEnv("G1_AUTH_ENABLED", "true");
    vi.stubEnv("G1_WEB_ORIGIN", ORIGIN);
    vi.stubEnv("MARKETPLACE_API_URL", "https://bff.example");
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("forwards the address list with only the G1 session cookie and the web origin", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    vi.stubGlobal("fetch", upstream);
    const response = await GET(request("delivery-addresses", { headers: { Cookie: `${SESSION}; analytics=secret` } }), ctx("delivery-addresses"));
    expect(response.status).toBe(200);
    const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://bff.example/api/v1/checkout/delivery-addresses");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({ Origin: ORIGIN, Cookie: SESSION });
    expect(JSON.stringify(init.headers)).not.toMatch(/analytics|authorization/i);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("forwards the idempotency key, the cart session and the JSON body on order creation", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: { state: "SUBMITTED" } }, { status: 202 }));
    vi.stubGlobal("fetch", upstream);
    const body = JSON.stringify({ checkoutOperationId: "00000000-0000-4000-8000-000000000001", contact: { fullName: "Prueba", phone: "+51900000001" } });
    const response = await POST(request("orders", {
      method: "POST",
      headers: { Cookie: `${SESSION}; cart_session=${"c".repeat(24)}`, "Content-Type": "application/json", Origin: ORIGIN, "Idempotency-Key": "key-0001-abcdef" },
      body,
    }), ctx("orders"));
    expect(response.status).toBe(202);
    const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://bff.example/api/v1/checkout/orders");
    expect(init.headers).toMatchObject({
      "Idempotency-Key": "key-0001-abcdef",
      Cookie: `${SESSION}; cart_session=${"c".repeat(24)}`,
      "Content-Type": "application/json",
    });
    expect(init.body).toBe(JSON.stringify(JSON.parse(body)));
  });

  it("preserves a 429 with Retry-After and a 409 pending order without retrying", async () => {
    const upstream = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "SALES_RATE_LIMITED" } }), { status: 429, headers: { "Retry-After": "12" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "ORDER_CREATION_PENDING" } }), { status: 409 }));
    vi.stubGlobal("fetch", upstream);
    const first = await GET(request("operations/00000000-0000-4000-8000-000000000001", { headers: { Cookie: SESSION } }), ctx("operations", "00000000-0000-4000-8000-000000000001"));
    expect(first.status).toBe(429);
    expect(first.headers.get("Retry-After")).toBe("12");
    const second = await GET(request("operations/00000000-0000-4000-8000-000000000001", { headers: { Cookie: SESSION } }), ctx("operations", "00000000-0000-4000-8000-000000000001"));
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: { code: "ORDER_CREATION_PENDING" } });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("rejects mutations from a foreign origin without calling the backend", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await POST(request("quotes", {
      method: "POST", headers: { Cookie: SESSION, "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}",
    }), ctx("quotes"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "FORBIDDEN" } });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects caller-provided bearer tokens and unsupported endpoints", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const bearer = await GET(request("delivery-addresses", { headers: { Authorization: "Bearer caller-token", Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(bearer.status).toBe(400);
    const unknown = await GET(request("admin", { headers: { Cookie: SESSION } }), ctx("admin"));
    expect(unknown.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("answers 503 with a stable code when the backend is unreachable and 502 when it is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(new Response("<html>", { status: 200 })));
    const down = await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({ error: { code: "CHECKOUT_BACKEND_UNAVAILABLE" } });
    const html = await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(html.status).toBe(502);
    expect(await html.json()).toEqual({ error: { code: "INVALID_BACKEND_RESPONSE" } });
  });

  it("rejects a partial bff configuration without calling the backend", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_MODE", "local-fixtures");
    const onlyServer = await POST(request("orders", {
      method: "POST", headers: { Cookie: SESSION, "Content-Type": "application/json", Origin: ORIGIN, "Idempotency-Key": "key-0001-abcdef" }, body: "{}",
    }), ctx("orders"));
    expect(onlyServer.status).toBe(503);
    expect(await onlyServer.json()).toEqual({ error: { code: "CHECKOUT_MODE_MISCONFIGURED" } });
    vi.stubEnv("CHECKOUT_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_MODE", "bff");
    const onlyPublic = await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(onlyPublic.status).toBe(503);
    expect(await onlyPublic.json()).toEqual({ error: { code: "CHECKOUT_MODE_MISCONFIGURED" } });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("gives order creation a longer deadline than the other calls so a slow Ventas does not lose the 202", async () => {
    const timeouts: number[] = [];
    const spy = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => { timeouts.push(ms); return new AbortController().signal; });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: {} }, { status: 202 })));
    await POST(request("orders", {
      method: "POST", headers: { Cookie: SESSION, "Content-Type": "application/json", Origin: ORIGIN, "Idempotency-Key": "key-0001-abcdef" }, body: "{}",
    }), ctx("orders"));
    await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    spy.mockRestore();
    expect(timeouts).toEqual([55_000, 20_000]);
  });

  it("answers 504 with Retry-After, without claiming a state, when the backend is slower than the proxy deadline", async () => {
    const operationId = "00000000-0000-4000-8000-000000000001";
    const slow = Object.assign(new Error("timeout"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(slow));
    const created = await POST(request("orders", {
      method: "POST",
      headers: { Cookie: SESSION, "Content-Type": "application/json", Origin: ORIGIN, "Idempotency-Key": "key-0001-abcdef" },
      body: JSON.stringify({ checkoutOperationId: operationId, contact: { fullName: "Prueba", phone: "+51900000001" } }),
    }), ctx("orders"));
    expect(created.status).toBe(504);
    expect(created.headers.get("Retry-After")).toBe("5");
    expect(await created.json()).toEqual({ error: { code: "CHECKOUT_BACKEND_TIMEOUT" } });
    const verified = await GET(request(`operations/${operationId}`, { headers: { Cookie: SESSION } }), ctx("operations", operationId));
    expect(verified.status).toBe(504);
    expect(await verified.json()).toEqual({ error: { code: "CHECKOUT_BACKEND_TIMEOUT" } });
    const addresses = await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(addresses.status).toBe(503);
  });

  it("holds a really delayed backend response until the proxy deadline and then answers 504 with Retry-After", async () => {
    const operationId = "00000000-0000-4000-8000-000000000001";
    const deadline = new AbortController();
    const timeouts: number[] = [];
    const spy = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => { timeouts.push(ms); return deadline.signal; });
    let abortedAfterWaiting = false;
    vi.stubGlobal("fetch", vi.fn((_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => { abortedAfterWaiting = true; reject(Object.assign(new Error("timeout"), { name: "TimeoutError" })); });
    })));
    const pending = POST(request("orders", {
      method: "POST",
      headers: { Cookie: SESSION, "Content-Type": "application/json", Origin: ORIGIN, "Idempotency-Key": "key-0001-abcdef" },
      body: JSON.stringify({ checkoutOperationId: operationId, contact: { fullName: "Prueba", phone: "+51900000001" } }),
    }), ctx("orders"));
    let settled = false;
    void pending.then(() => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false); // la respuesta del BFF sigue pendiente: el proxy espera
    deadline.abort(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    const response = await pending;
    spy.mockRestore();
    expect(abortedAfterWaiting).toBe(true);
    expect(timeouts).toEqual([55_000]);
    expect(response.status).toBe(504);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({ error: { code: "CHECKOUT_BACKEND_TIMEOUT" } });
  });

  it("never sends a second POST while verifying: the verification of an operation is a single GET", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ error: { code: "ORDER_NOT_SUBMITTED" } }, { status: 409 }));
    vi.stubGlobal("fetch", upstream);
    const operationId = "00000000-0000-4000-8000-000000000001";
    const response = await GET(request(`operations/${operationId}`, { headers: { Cookie: SESSION } }), ctx("operations", operationId));
    expect(response.status).toBe(409);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((upstream.mock.calls[0][1] as RequestInit).method).toBe("GET");
  });

  it("keeps the mode disabled in production when it is not configured", async () => {
    vi.stubEnv("CHECKOUT_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_MODE", "");
    const response = await GET(request("delivery-addresses", { headers: { Cookie: SESSION } }), ctx("delivery-addresses"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "CHECKOUT_BACKEND_MODE_DISABLED" } });
  });
});
