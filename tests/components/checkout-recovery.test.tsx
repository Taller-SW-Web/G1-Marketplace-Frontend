import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutApiError } from "../../src/features/checkout/api";

const api = vi.hoisted(() => ({
  listAddresses: vi.fn(),
  getCurrentCart: vi.fn(),
  createQuote: vi.fn(),
  applyBenefit: vi.fn(),
  removeBenefit: vi.fn(),
  prepare: vi.fn(),
  createOrder: vi.fn(),
  getOperation: vi.fn(),
}));

vi.mock("../../src/features/checkout/api", () => ({
  backendMockEnabled: true,
  checkoutApi: api,
  checkoutErrorMessage: (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "code" in error) {
      const code = String(error.code);
      if (code === "CONTACT_VALIDATION_ERROR") return "Revisa los datos de contacto e inténtalo de nuevo.";
      if (code === "REVALIDATION_CHANGED") return "La disponibilidad cambió.";
    }
    return fallback;
  },
  CheckoutApiError: class CheckoutApiError extends Error {
    constructor(readonly status: number, readonly code: string) { super(code); }
  },
  isVerifiedPaidOperation: (operation: { state: string }) => operation.state === "SUCCEEDED",
}));

import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";

const quote = (quoteId: string) => ({
  quoteId,
  expiresAt: Date.now() + 5 * 60_000,
  subtotal: 340,
  discount: 0,
  shipping: 15,
  estimatedDays: 2,
  total: 355,
  addressId: "ADR-1",
  cartVersion: 7,
  lines: [{ sku: "SKU-1", quantity: 2 }],
});

async function reachOrderForm() {
  render(<CheckoutFlow />);
  await screen.findByText(/Se encontraron 2 productos/);
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Resumen de envío" });
  fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
  await screen.findByRole("heading", { name: "Pago simulado" });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
  await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });
}

function fillContact() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Prueba" } });
  fireEvent.change(screen.getByLabelText("Número de documento"), { target: { value: "12345678" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "999999999" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.test" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAddresses.mockResolvedValue([{
    addressId: "ADR-1", label: "Casa", street: "Av. Lima 123", district: "Miraflores",
    province: "Lima", department: "Lima", phone: "999999999",
  }]);
  api.getCurrentCart.mockResolvedValue({ cartId: "cart-1", version: 7, items: [{ sku: "SKU-1", quantity: 2 }] });
  api.createQuote.mockImplementation(async () => quote("Q-1"));
  api.prepare.mockResolvedValue({ checkoutOperationId: "operation-1", state: "PREPARED" });
  api.createOrder.mockResolvedValue({ checkoutOperationId: "operation-1", state: "SUBMITTED" });
  api.getOperation.mockResolvedValue({ checkoutOperationId: "operation-1", state: "PREPARED" });
});

afterEach(() => vi.unstubAllGlobals());

describe("CheckoutFlow recovery in Backend MOCK mode", () => {
  it("restores editable contact form after a 400 and retries with the same order key", async () => {
    api.createOrder.mockRejectedValueOnce(new CheckoutApiError(400, "CONTACT_VALIDATION_ERROR"));
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    expect((await screen.findByRole("status")).textContent).toContain("Revisa los datos de contacto");
    expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe("Ana Prueba");
    expect(screen.getByRole("button", { name: "Crear pedido" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Verificar operación original" })).toBe(null);

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Corregida" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(api.createOrder.mock.calls[0]?.[2]).toBe(api.createOrder.mock.calls[1]?.[2]);
    expect(api.createOrder.mock.calls[1]?.[1]).toMatchObject({ fullName: "Ana Corregida" });
  });

  it("restores the contact form when verification finds the operation still PREPARED", async () => {
    api.createOrder.mockRejectedValueOnce(new Error("network timeout"));
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    await screen.findByRole("button", { name: "Verificar operación original" });

    fireEvent.click(screen.getByRole("button", { name: "Verificar operación original" }));
    expect(await screen.findByRole("button", { name: "Crear pedido" })).toBeDefined();
    expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).value).toBe("ana@example.test");
    expect(screen.getByRole("status").textContent).toContain("operación está preparada");
  });

  it("returns to summary and allows immediate requote after REVALIDATION_CHANGED", async () => {
    api.prepare.mockRejectedValueOnce(new CheckoutApiError(409, "REVALIDATION_CHANGED"));
    api.createQuote.mockResolvedValueOnce(quote("Q-1")).mockResolvedValueOnce(quote("Q-2"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));

    await screen.findByRole("heading", { name: "Resumen de envío" });
    expect(screen.getByRole("alert").textContent).toContain("cotización fue invalidada");
    fireEvent.click(screen.getByRole("button", { name: "Actualizar resumen" }));

    await waitFor(() => expect(api.createQuote).toHaveBeenCalledTimes(2));
    expect(api.createQuote.mock.calls[1]).toEqual(["ADR-1", 7]);
    expect((screen.getByRole("button", { name: "Continuar al pago simulado" }) as HTMLButtonElement).disabled).toBe(false);
    expect(api.prepare).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });
    expect(api.prepare.mock.calls[1]?.[0]).toBe("Q-2");
    expect(api.prepare.mock.calls[1]?.[2]).not.toBe(api.prepare.mock.calls[0]?.[2]);
  });

  it("creates a new preparation key when a transient failure is followed by a new quote", async () => {
    api.prepare.mockRejectedValueOnce(new CheckoutApiError(503, "REVALIDATION_UNAVAILABLE"));
    api.createQuote.mockResolvedValueOnce(quote("Q-1")).mockResolvedValueOnce(quote("Q-2"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await waitFor(() => expect(api.prepare).toHaveBeenCalledTimes(1));
    const firstKey = api.prepare.mock.calls[0]?.[2];
    await screen.findByText("No se pudo preparar la compra. Intenta actualizar el resumen.");

    fireEvent.click(screen.getByRole("button", { name: "Volver al resumen" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver a dirección" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });

    expect(api.prepare.mock.calls[1]?.[0]).toBe("Q-2");
    expect(api.prepare.mock.calls[1]?.[2]).not.toBe(firstKey);
  });

  it("uses a fresh preparation key when applying or removing a benefit changes the quote", async () => {
    api.prepare.mockRejectedValueOnce(new CheckoutApiError(503, "REVALIDATION_UNAVAILABLE"));
    api.applyBenefit.mockResolvedValueOnce({
      ...quote("Q-2"),
      selectedBenefit: { type: "COUPON", id: "SAVE20", discount: 20 },
    });
    api.removeBenefit.mockResolvedValueOnce(quote("Q-3"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await screen.findByText("No se pudo preparar la compra. Intenta actualizar el resumen.");
    const firstKey = api.prepare.mock.calls[0]?.[2];

    fireEvent.click(screen.getByRole("button", { name: "Volver al resumen" }));
    fireEvent.change(screen.getByLabelText("Código promocional"), { target: { value: "SAVE20" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await screen.findByText("Cupón aplicado.");
    fireEvent.click(screen.getByRole("button", { name: "Quitar beneficio" }));
    await screen.findByText("Se actualizó el resumen sin el beneficio.");

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });

    expect(api.prepare.mock.calls[1]?.[0]).toBe("Q-3");
    expect(api.prepare.mock.calls[1]?.[2]).not.toBe(firstKey);
  });

  it("invalidates the quote instead of labeling a context failure as payment rejection", async () => {
    api.createOrder.mockRejectedValueOnce(new CheckoutApiError(409, "QUOTE_EXPIRED"));
    api.getOperation.mockResolvedValueOnce({
      checkoutOperationId: "operation-1", state: "FAILED", failureCode: "QUOTE_EXPIRED",
    });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    await screen.findByRole("button", { name: "Verificar operación original" });
    fireEvent.click(screen.getByRole("button", { name: "Verificar operación original" }));

    await screen.findByRole("heading", { name: "Resumen de envío" });
    expect(screen.getByRole("alert").textContent).toContain("cotización fue invalidada");
    expect(screen.getByRole("button", { name: "Actualizar resumen" })).toBeDefined();
    expect(screen.queryByText(/pago simulado fue rechazado/i)).toBe(null);
  });

  it("keeps the rejection message for a terminal failed payment", async () => {
    api.createOrder.mockResolvedValueOnce({
      checkoutOperationId: "operation-1",
      state: "FAILED",
      failureCode: "PAGO_NO_COMPLETADO",
      orderState: "ANULADO",
    });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    expect((await screen.findByRole("alert")).textContent).toContain("La operación fue rechazada o anulada");
    expect(screen.getByRole("button", { name: "Seguir comprando" })).toBeDefined();
  });

  it.each([
    ["SUBMITTED with recoveryRequired", "submitted"],
    ["ORDER_NOT_SUBMITTED", "not-submitted"],
  ])("keeps verification busy until the recovered POST finishes (%s)", async (_label, recoveryPath) => {
    api.createOrder.mockRejectedValueOnce(new Error("initial timeout"));
    let resolveRecoveredPost!: (value: { checkoutOperationId: string; state: string }) => void;
    api.createOrder.mockImplementationOnce(() => new Promise((resolve) => { resolveRecoveredPost = resolve; }));
    if (recoveryPath === "submitted") {
      api.getOperation.mockResolvedValueOnce({
        checkoutOperationId: "operation-1", state: "SUBMITTED", recoveryRequired: true,
      });
    } else {
      api.getOperation.mockRejectedValueOnce(new CheckoutApiError(404, "ORDER_NOT_SUBMITTED"));
    }

    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    const verifyButton = await screen.findByRole("button", { name: "Verificar operación original" });
    fireEvent.click(verifyButton);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect((screen.getByRole("button", { name: /Verificar operación original/ }) as HTMLButtonElement).disabled).toBe(true);

    resolveRecoveredPost({ checkoutOperationId: "operation-1", state: "SUBMITTED" });
    await waitFor(() => expect((screen.getByRole("button", { name: /Verificar operación original/ }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("ignores a late PREPARED response after returning to summary and reuses its key", async () => {
    let resolvePreparation!: (value: { checkoutOperationId: string; state: string }) => void;
    api.prepare.mockImplementationOnce(() => new Promise((resolve) => { resolvePreparation = resolve; }));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await waitFor(() => expect(api.prepare).toHaveBeenCalledTimes(1));
    const originalKey = api.prepare.mock.calls[0]?.[2];

    fireEvent.click(screen.getByRole("button", { name: "Volver al resumen" }));
    resolvePreparation({ checkoutOperationId: "operation-1", state: "PREPARED" });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Resumen de envío" })).toBeDefined());
    expect(screen.queryByRole("heading", { name: "Confirma y crea tu pedido" })).toBe(null);

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar misma preparación" }));
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });
    expect(api.prepare.mock.calls[1]?.[2]).toBe(originalKey);
  });
});
