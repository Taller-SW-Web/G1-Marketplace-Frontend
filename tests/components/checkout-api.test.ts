import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutApi, CheckoutApiError, isVerifiedPaidOperation } from "../../src/features/checkout/api";

afterEach(() => vi.unstubAllGlobals());

describe("checkout Backend MOCK adapter", () => {
  it("normalizes server-owned quote amounts and expiry without recalculating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-1", expiresAt: "2026-10-15T10:05:00.000Z",
      subtotal: { amount: 340, currency: "PEN" }, discount: { amount: 20, currency: "PEN" },
      shipping: { amount: 15, currency: "PEN", estimatedDays: 2 }, total: { amount: 335, currency: "PEN" },
      addressId: "address-1", cartVersion: 3, selectedBenefit: { id: "SAVE20" },
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await checkoutApi.createQuote("address-1", 3);

    expect(quote).toMatchObject({ quoteId: "quote-1", subtotal: 340, discount: 20, shipping: 15, total: 335, addressId: "address-1", cartVersion: 3, coupon: "SAVE20" });
    expect(quote.expiresAt).toBe(Date.parse("2026-10-15T10:05:00.000Z"));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/quotes");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ addressId: "address-1", cartVersion: 3 });
  });

  it("preserves public API errors instead of converting them to a successful fixture", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CART_NOT_FOUND" } }), { status: 409 })));

    await expect(checkoutApi.createQuote("address-1", 1)).rejects.toEqual(expect.objectContaining<Partial<CheckoutApiError>>({ status: 409, code: "CART_NOT_FOUND" }));
  });

  it("forwards the stable idempotency key for order submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { checkoutOperationId: "op-1", state: "SUBMITTED" } }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await checkoutApi.createOrder("op-1", { fullName: "Test Person", documentType: "DNI", documentNumber: "12345678", phone: "999999999", email: "test@example.test" }, "stable-key");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "Idempotency-Key": "stable-key" });
  });

  it("treats only an authoritative SUCCEEDED + PAGADO operation with an order id as paid", () => {
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "PREPARED" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUBMITTED", orderState: "CREADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "FAILED", orderState: "PAGADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUCCEEDED", orderState: "CREADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUCCEEDED", orderState: "PAGADO", orderId: "order" })).toBe(true);
  });
});
