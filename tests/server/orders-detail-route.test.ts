import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getDetail } from "../../src/app/api/orders/[orderId]/route";
import { GET as getTracking } from "../../src/app/api/orders/[orderId]/tracking/route";

describe("order detail and tracking BFF routes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards only the validated G1 session cookie to the detail backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/orders/PED-MOCK-004", { headers: { Cookie: `g1_session=${"a".repeat(43)}; analytics=private` } });
    await getDetail(request, { params: Promise.resolve({ orderId: "PED-MOCK-004" }) });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://127.0.0.1:10000/api/v1/orders/PED-MOCK-004");
    expect(init.headers).toMatchObject({ Cookie: `g1_session=${"a".repeat(43)}` });
    expect(JSON.stringify(init)).not.toMatch(/analytics|authorization/i);
  });

  it("preserves backend 202 for tracking that is not ready and disables caching", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "TRACKING_NOT_READY" } }), { status: 202 })));
    const response = await getTracking(new NextRequest("http://localhost/api/orders/PED-MOCK-002/tracking"), { params: Promise.resolve({ orderId: "PED-MOCK-002" }) });
    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: { code: "TRACKING_NOT_READY" } });
  });
});
