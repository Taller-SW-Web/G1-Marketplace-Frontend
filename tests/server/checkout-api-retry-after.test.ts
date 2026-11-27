import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutApi, CheckoutApiError } from "../../src/features/checkout/api";

const OPERATION = "00000000-0000-4000-8000-000000000001";

describe("checkout client keeps the Retry-After of the BFF", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds retryAfterSeconds to a pending operation (202)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { data: { checkoutOperationId: OPERATION, state: "SUBMITTED" } }, { status: 202, headers: { "Retry-After": "5" } },
    )));
    await expect(checkoutApi.getOperation(OPERATION)).resolves.toMatchObject({ state: "SUBMITTED", retryAfterSeconds: 5 });
  });

  it("carries Retry-After in the error of a 429 or 504", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: { code: "CHECKOUT_BACKEND_TIMEOUT" } }, { status: 504, headers: { "Retry-After": "12" } },
    )));
    const error = await checkoutApi.getOperation(OPERATION).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(CheckoutApiError);
    expect(error).toMatchObject({ status: 504, code: "CHECKOUT_BACKEND_TIMEOUT", retryAfterSeconds: 12 });
  });

  it("ignores a malformed Retry-After", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { data: { checkoutOperationId: OPERATION, state: "SUBMITTED" } }, { status: 202, headers: { "Retry-After": "soon" } },
    )));
    const operation = await checkoutApi.getOperation(OPERATION);
    expect(operation.retryAfterSeconds).toBeUndefined();
  });
});
