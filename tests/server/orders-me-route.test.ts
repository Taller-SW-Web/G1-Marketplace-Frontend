import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/orders/me/route";

describe("GET /api/orders/me", () => {
  const originalBase = process.env.MARKETPLACE_API_URL;

  beforeEach(() => {
    process.env.MARKETPLACE_API_URL = "http://127.0.0.1:10000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalBase === undefined) delete process.env.MARKETPLACE_API_URL;
    else process.env.MARKETPLACE_API_URL = originalBase;
  });

  it("forwards only the allow-listed paging and filter values to the G1 backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [], page: {
      number: 0, size: 10, totalElements: 0, totalPages: 0,
    } }), { status: 200, headers: { "Content-Type": "application/json", "X-Orders-Source": "MOCK" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest(
      "http://localhost/api/orders/me?page=0&pageSize=10&state=PAGADO&from=2026-10-10&to=2026-10-10&customerId=somebody-else",
    ));

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://127.0.0.1:10000/api/v1/orders/me?page=0&pageSize=10&state=PAGADO&from=2026-10-10&to=2026-10-10");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(JSON.stringify(init)).not.toMatch(/authorization|customerId/i);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Orders-Source")).toBe("MOCK");
  });
});
