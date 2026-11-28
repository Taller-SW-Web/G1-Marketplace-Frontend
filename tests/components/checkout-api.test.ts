import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutApi, CheckoutApiError, checkoutErrorMessage, isVerifiedPaidOperation } from "../../src/features/checkout/api";

afterEach(() => vi.unstubAllGlobals());

describe("checkout Backend MOCK adapter", () => {
  it("loads the active cart snapshot from the Cart BFF without relying on a configured version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      cartId: "cart-1", version: 7, items: [{ sku: "SKU-1", quantity: 2 }],
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkoutApi.getCurrentCart()).resolves.toEqual({
      cartId: "cart-1", version: 7, items: [{ sku: "SKU-1", quantity: 2 }],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/cart/current");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("accepts the backend's empty-cart snapshot and rejects malformed versions", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { cartId: null, version: 0, items: [] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { cartId: "cart-1", version: "7", items: [] } }), { status: 200 })));

    await expect(checkoutApi.getCurrentCart()).resolves.toEqual({ cartId: null, version: 0, items: [] });
    await expect(checkoutApi.getCurrentCart()).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("does not treat a Cart BFF error as an empty cart or a fixture snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CART_AUTH_UNAVAILABLE" } }), { status: 503 })));

    await expect(checkoutApi.getCurrentCart()).rejects.toMatchObject({ status: 503, code: "CART_AUTH_UNAVAILABLE" });
  });

  // Forma exacta del BFF de BE #331 / SPECS #19: G7 no tiene teléfono y label/reference son opcionales.
  it("lists BFF addresses without phone and with optional label (GET shape of BE #331)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { addressId: "a1b2c3d4-0000-4000-8000-000000000001", street: "Av. Larco 1234, dpto. 502", district: "Miraflores", province: "Lima", department: "Lima", label: "Casa", reference: "Frente al parque Kennedy" },
      { addressId: "a1b2c3d4-0000-4000-8000-000000000002", street: "Av. Javier Prado Este 560", district: "San Isidro", province: "Lima", department: "Lima" },
    ] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkoutApi.listAddresses()).resolves.toEqual([
      { addressId: "a1b2c3d4-0000-4000-8000-000000000001", street: "Av. Larco 1234, dpto. 502", district: "Miraflores", province: "Lima", department: "Lima", label: "Casa", reference: "Frente al parque Kennedy" },
      { addressId: "a1b2c3d4-0000-4000-8000-000000000002", street: "Av. Javier Prado Este 560", district: "San Isidro", province: "Lima", department: "Lima" },
    ]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/delivery-addresses");
  });

  it("creates with phone in the payload and accepts the BFF 201 that omits it (POST shape of BE #331)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      addressId: "a1b2c3d4-0000-4000-8000-000000000003", street: "Calle 1", district: "Surco", province: "Lima", department: "Lima",
    } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkoutApi.createAddress({ street: "Calle 1", district: "Surco", province: "Lima", department: "Lima", phone: "987654321" }))
      .resolves.toEqual({ addressId: "a1b2c3d4-0000-4000-8000-000000000003", street: "Calle 1", district: "Surco", province: "Lima", department: "Lima" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ street: "Calle 1", district: "Surco", province: "Lima", department: "Lima", phone: "987654321" });
  });

  it("still rejects an address without its required location fields or with a non-string phone", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ addressId: "x", district: "Surco", province: "Lima", department: "Lima" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ addressId: "x", street: "Calle 1", district: "Surco", province: "Lima", department: "Lima", phone: 999 }] }), { status: 200 })));

    await expect(checkoutApi.listAddresses()).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    await expect(checkoutApi.listAddresses()).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("normalizes server-owned quote amounts and expiry without recalculating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-1", expiresAt: "2026-10-15T10:05:00.000Z",
      subtotal: { amount: 340, currency: "PEN" }, discount: { amount: 20, currency: "PEN" },
       shipping: { amount: 15, currency: "PEN", estimatedDays: 2 }, total: { amount: 335, currency: "PEN" },
       addressId: "address-1", cartVersion: 3,
       sources: { pricing: "G6_REAL", shipping: "G5_FIXTURE", benefits: "MOCK", inventoryRevalidation: "G6_REAL" },
       lines: [{ sku: "SKU-1", quantity: 2, productId: "PROD-1", unitPrice: { amount: 170, currency: "PEN" } }],
       selectedBenefit: { type: "COUPON", id: "SAVE20", discount: { amount: 20, currency: "PEN" } },
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await checkoutApi.createQuote("address-1", 3);

    expect(quote).toMatchObject({ quoteId: "quote-1", subtotal: 340, discount: 20, shipping: 15, estimatedDays: 2, total: 335, addressId: "address-1", cartVersion: 3,
      lines: [{ sku: "SKU-1", quantity: 2, productId: "PROD-1", unitPrice: 170 }],
      sources: { pricing: "G6_REAL", shipping: "G5_FIXTURE", benefits: "MOCK", inventoryRevalidation: "G6_REAL" },
      selectedBenefit: { type: "COUPON", id: "SAVE20", discount: 20 } });
    expect(quote.expiresAt).toBe(Date.parse("2026-10-15T10:05:00.000Z"));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/quotes");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ addressId: "address-1", cartVersion: 3 });
  });

  it("rejects a null quote line as an invalid backend response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      quoteId: "quote-null-line", expiresAt: "2026-10-15T10:05:00.000Z",
      subtotal: { amount: 170, currency: "PEN" }, discount: { amount: 0, currency: "PEN" },
      shipping: { amount: 15, currency: "PEN", estimatedDays: 2 }, total: { amount: 185, currency: "PEN" },
      addressId: "address-1", cartVersion: 3, lines: [null],
    } }), { status: 200 })));

    await expect(checkoutApi.createQuote("address-1", 3)).rejects.toMatchObject({
      status: 502, code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("preserves public API errors instead of converting them to a successful fixture", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CART_NOT_FOUND" } }), { status: 409 })));

    await expect(checkoutApi.createQuote("address-1", 1)).rejects.toEqual(expect.objectContaining<Partial<CheckoutApiError>>({ status: 409, code: "CART_NOT_FOUND" }));
  });

  it("keeps only safe validation field identifiers from an API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: {
      code: "ADDRESS_VALIDATION_ERROR",
      fields: ["street", "customerId", "bad field", 4, { message: "private detail" }, "x".repeat(65)],
    } }), { status: 400 })));

    await expect(checkoutApi.listAddresses()).rejects.toMatchObject({
      status: 400,
      code: "ADDRESS_VALIDATION_ERROR",
      fields: ["street", "customerId"],
    });
  });

  it("posts only delivery-address fields and excludes buyer identity", async () => {
    const address = {
      label: "Casa nueva",
      street: "Calle 1",
      district: "Surco",
      province: "Lima",
      department: "Lima",
      reference: "Dpto. 402",
      phone: "999999999",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      addressId: "ADR-2", ...address,
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkoutApi.createAddress(address)).resolves.toMatchObject({
      addressId: "ADR-2", ...address,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/checkout/delivery-addresses");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", cache: "no-store" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(address);
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

  it("retains only bounded, syntactically safe validation field names from a 400", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: {
      code: "CONTACT_VALIDATION_ERROR",
      fields: ["email", "contact", "email", "not a field", 7, "privateNote"],
    } }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkoutApi.createOrder(
      "op-1",
      { fullName: "Test Person", documentType: "DNI", documentNumber: "12345678", phone: "999999999", email: "test@example.test" },
      "stable-key",
    )).rejects.toMatchObject({
      status: 400,
      code: "CONTACT_VALIDATION_ERROR",
      fields: ["email", "contact", "privateNote"],
    });
  });

  it("normalizes the flat F-026 result and retains Ventas-authoritative fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      checkoutOperationId: "op-1", state: "SUCCEEDED", orderId: "PED-2026-00012", orderState: "PAGADO",
      total: { amount: 355, currency: "PEN" }, createdAt: "2026-10-16T10:00:00.000Z",
    } }), { status: 200 })));

    const operation = await checkoutApi.createOrder(
      "op-1",
      { fullName: "Test Person", documentType: "DNI", documentNumber: "12345678", phone: "999999999", email: "test@example.test" },
      "stable-key",
    );

    expect(operation).toMatchObject({
      state: "SUCCEEDED", orderId: "PED-2026-00012", orderState: "PAGADO",
      orderTotal: 355, orderCreatedAt: "2026-10-16T10:00:00.000Z",
    });
    expect(isVerifiedPaidOperation(operation)).toBe(true);
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
