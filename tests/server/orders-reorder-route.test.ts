import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postReorder } from "../../src/app/api/orders/[orderId]/reorder/route";

describe("order reorder BFF route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards only the same-origin G1 session cookie to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      cartId: "cart-1", version: 4, added: [{ sku: "MOCK-AERO-42", quantity: 2 }], adjustments: [],
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Idempotency-Key": "33333333-3333-4333-8333-333333333333",
        Cookie: `g1_session=${"a".repeat(43)}; analytics=private`,
      },
    });
    const response = await postReorder(request, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) });
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://127.0.0.1:10000/api/v1/orders/PED-MOCK-001/reorder");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Cookie: `g1_session=${"a".repeat(43)}`, Origin: "http://localhost", "Idempotency-Key": "33333333-3333-4333-8333-333333333333" });
    expect(JSON.stringify(init)).not.toMatch(/analytics|authorization/i);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects cross-origin and non-empty requests before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const crossSite = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST", headers: { Origin: "https://evil.example" },
    });
    expect((await postReorder(crossSite, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) })).status).toBe(403);
    const body = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST", headers: { Origin: "http://localhost" }, body: "{}",
    });
    expect((await postReorder(body, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a UUID v4 idempotency key before forwarding", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST", headers: { Origin: "http://localhost", "Idempotency-Key": "bad-key" },
    });
    expect((await postReorder(request, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) })).status).toBe(400);
    const wrongVersion = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST", headers: { Origin: "http://localhost", "Idempotency-Key": "33333333-3333-1333-8333-333333333333" },
    });
    expect((await postReorder(wrongVersion, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the backend unavailable status without caching", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "REORDER_UNAVAILABLE" } }), { status: 503 })));
    const request = new NextRequest("http://localhost/api/orders/PED-MOCK-001/reorder", {
      method: "POST", headers: {
        Origin: "http://localhost",
        "Idempotency-Key": "33333333-3333-4333-8333-333333333333",
      },
    });
    const response = await postReorder(request, { params: Promise.resolve({ orderId: "PED-MOCK-001" }) });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
