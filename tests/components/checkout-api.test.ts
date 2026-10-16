import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutApi, CheckoutApiError, checkoutErrorMessage, isVerifiedPaidOperation } from "../../src/features/checkout/api";

afterEach(() => vi.unstubAllGlobals());

describe("checkout Backend MOCK adapter", () => {
  it("normalizes server-owned quote amounts and expiry without recalculating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-1", expiresAt: "2026-10-15T10:05:00.000Z",
      subtotal: { amount: 340, currency: "PEN" }, discount: { amount: 20, currency: "PEN" },
      shipping: { amount: 15, currency: "PEN", estimatedDays: 2 }, total: { amount: 335, currency: "PEN" },
      addressId: "address-1", cartVersion: 3, lines: [{ sku: "SKU-1", quantity: 2 }],
      selectedBenefit: { type: "COUPON", id: "SAVE20", discount: { amount: 20, currency: "PEN" } },
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await checkoutApi.createQuote("address-1", 3);

    expect(quote).toMatchObject({ quoteId: "quote-1", subtotal: 340, discount: 20, shipping: 15, estimatedDays: 2, total: 335, addressId: "address-1", cartVersion: 3, lines: [{ sku: "SKU-1", quantity: 2 }], selectedBenefit: { type: "COUPON", id: "SAVE20", discount: 20 } });
    expect(quote.expiresAt).toBe(Date.parse("2026-10-15T10:05:00.000Z"));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/quotes");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ addressId: "address-1", cartVersion: 3 });
  });

  it("preserves public API errors instead of converting them to a successful fixture", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CART_NOT_FOUND" } }), { status: 409 })));

    await expect(checkoutApi.createQuote("address-1", 1)).rejects.toEqual(expect.objectContaining<Partial<CheckoutApiError>>({ status: 409, code: "CART_NOT_FOUND" }));
  });

  it("merges a partial benefit response into the current quote without recalculating base amounts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-with-coupon", selectedBenefit: { type: "COUPON", id: "COUPON-1", discount: { amount: 20, currency: "PEN" } },
      total: { amount: 335, currency: "PEN" }, expiresAt: "2026-10-15T10:05:00.000Z",
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const baseQuote = {
      quoteId: "quote-base", expiresAt: Date.parse("2026-10-15T10:00:00.000Z"), subtotal: 340,
      discount: 0, shipping: 15, estimatedDays: 2, total: 355, addressId: "address-1", cartVersion: 3,
      lines: [{ sku: "SKU-1", quantity: 2 }],
    };

    const quote = await checkoutApi.applyBenefit(baseQuote, "SAVE20");

    expect(quote).toMatchObject({ ...baseQuote, expiresAt: Date.parse("2026-10-15T10:05:00.000Z"), quoteId: "quote-with-coupon", discount: 20, total: 335, selectedBenefit: { type: "COUPON", id: "COUPON-1", discount: 20 } });
    expect(quote.expiresAt).toBe(Date.parse("2026-10-15T10:05:00.000Z"));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ quoteId: "quote-base", couponCode: "SAVE20" });
  });

  it("rejects an incomplete benefit response instead of silently accepting an unapplied coupon", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-without-benefit", total: { amount: 335 }, expiresAt: "2026-10-15T10:05:00.000Z",
    } }), { status: 200 })));

    await expect(checkoutApi.applyBenefit({
      quoteId: "quote-base", expiresAt: Date.now() + 60_000, subtotal: 340, discount: 0,
      shipping: 15, estimatedDays: 2, total: 355, addressId: "address-1", cartVersion: 3,
      lines: [{ sku: "SKU-1", quantity: 2 }],
    }, "SAVE20")).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("removes a benefit by requesting a fresh base quote, not by posting benefits without a code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-new-base", expiresAt: "2026-10-15T10:05:00.000Z", subtotal: { amount: 340 },
      discount: { amount: 0 }, shipping: { amount: 15, estimatedDays: 2 }, total: { amount: 355 },
      addressId: "address-1", cartVersion: 3, lines: [{ sku: "SKU-1", quantity: 2 }],
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const currentQuote = {
      quoteId: "quote-with-coupon", expiresAt: Date.now() + 60_000, subtotal: 340, discount: 20,
      shipping: 15, estimatedDays: 2, total: 335, addressId: "address-1", cartVersion: 3,
      lines: [{ sku: "SKU-1", quantity: 2 }], selectedBenefit: { type: "COUPON", id: "COUPON-1", discount: 20 },
    };

    const quote = await checkoutApi.removeBenefit(currentQuote);

    expect(quote).toMatchObject({ quoteId: "quote-new-base", discount: 0, total: 355 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/quotes");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ addressId: "address-1", cartVersion: 3 });
  });

  it("maps public failures to user-safe messages without exposing internal codes", () => {
    expect(checkoutErrorMessage(new CheckoutApiError(409, "CART_NOT_FOUND"), "fallback")).toContain("carrito activo");
    expect(checkoutErrorMessage(new CheckoutApiError(503, "INTERNAL_STACK_TRACE"), "No se pudo continuar.")).toBe("No se pudo continuar.");
  });

  it("forwards the stable idempotency key for order submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { checkoutOperationId: "op-1", state: "SUBMITTED" } }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await checkoutApi.createOrder("op-1", { fullName: "Test Person", documentType: "DNI", documentNumber: "12345678", phone: "999999999", email: "test@example.test" }, "stable-key");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "Idempotency-Key": "stable-key" });
  });

  it("normalizes the published nested F-027 order and keeps Ventas total and creation date", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      state: "SUCCEEDED",
      order: {
        orderId: "PED-2026-00981", state: "PAGADO", total: { amount: 355, currency: "PEN" },
        createdAt: "2026-09-27T18:30:00Z",
      },
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const operation = await checkoutApi.getOperation("op-1");

    expect(operation).toMatchObject({
      checkoutOperationId: "op-1", state: "SUCCEEDED", orderId: "PED-2026-00981", orderState: "PAGADO",
      orderTotal: 355, orderCreatedAt: "2026-09-27T18:30:00Z",
    });
    expect(isVerifiedPaidOperation(operation)).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/operations/op-1");
  });

  it("keeps a pending F-027 operation neutral when Sales has not supplied a paid order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { state: "SUBMITTED" } }), { status: 202 })));

    const operation = await checkoutApi.getOperation("op-pending");

    expect(operation).toMatchObject({ checkoutOperationId: "op-pending", state: "SUBMITTED" });
    expect(isVerifiedPaidOperation(operation)).toBe(false);
  });

  it("treats only an authoritative SUCCEEDED + PAGADO operation with an order id as paid", () => {
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "PREPARED" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUBMITTED", orderState: "CREADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "FAILED", orderState: "PAGADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUCCEEDED", orderState: "CREADO", orderId: "order" })).toBe(false);
    expect(isVerifiedPaidOperation({ checkoutOperationId: "op", state: "SUCCEEDED", orderState: "PAGADO", orderId: "order", orderTotal: 355, orderCreatedAt: "2026-09-27T18:30:00Z" })).toBe(true);
  });
});
