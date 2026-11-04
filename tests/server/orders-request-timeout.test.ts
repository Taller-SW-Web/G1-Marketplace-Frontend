import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersBackendTimeout } from "../../src/app/api/orders/request-timeout";

describe("orders backend BFF timeout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("allows bounded G5 cold starts without changing the G7 auth timeout", () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(new AbortController().signal);
    expect(ordersBackendTimeout()).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(185000);
  });

  it("rejects unsafe or unbounded timeout configuration", () => {
    vi.stubEnv("G1_ORDERS_BFF_TIMEOUT_MS", "300000");
    expect(() => ordersBackendTimeout()).toThrow("G1_ORDERS_BFF_TIMEOUT_MS");
    vi.stubEnv("G1_ORDERS_BFF_TIMEOUT_MS", "180000");
    expect(() => ordersBackendTimeout()).toThrow("G1_ORDERS_BFF_TIMEOUT_MS");
  });
});
