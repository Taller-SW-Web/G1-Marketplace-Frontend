import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/checkout/[...path]/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("checkout server-side proxy guard", () => {
  it("does not mint or forward credentials when Backend MOCK mode is disabled", async () => {
    vi.stubEnv("CHECKOUT_MODE", "local-fixtures");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api/checkout/preparations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: "q", cartVersion: 1, simulationConfirmed: true }),
    }) as never, { params: Promise.resolve({ path: ["preparations"] }) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "CHECKOUT_BACKEND_MODE_DISABLED" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unapproved routes before making upstream requests", async () => {
    vi.stubEnv("CHECKOUT_MODE", "backend-mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api/checkout/admin", { method: "POST" }) as never, {
      params: Promise.resolve({ path: ["admin"] }),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
