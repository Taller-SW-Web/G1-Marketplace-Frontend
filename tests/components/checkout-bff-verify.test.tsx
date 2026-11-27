import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// El modo se resuelve al cargar el módulo: debe fijarse antes de importar CheckoutFlow.
vi.hoisted(() => { process.env.NEXT_PUBLIC_CHECKOUT_MODE = "bff"; });

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

vi.mock("../../src/features/checkout/api", () => {
  class MockCheckoutApiError extends Error {
    constructor(readonly status: number, readonly code: string, readonly fields?: string[], readonly retryAfterSeconds?: number) { super(code); }
  }
  return {
    backendMockEnabled: true,
    checkoutApi: api,
    checkoutErrorMessage: (_error: unknown, fallback: string) => fallback,
    CheckoutApiError: MockCheckoutApiError,
    isVerifiedPaidOperation: (operation: { state: string }) => operation.state === "SUCCEEDED",
  };
});

import { CheckoutApiError } from "../../src/features/checkout/api";
import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";

const quote = {
  quoteId: "Q-1", expiresAt: Date.now() + 5 * 60_000, subtotal: 340, discount: 0, shipping: 15, estimatedDays: 2,
  total: 355, addressId: "ADR-1", cartVersion: 7, lines: [{ sku: "SKU-1", quantity: 2 }],
};

async function reachOrderForm() {
  render(<CheckoutFlow />);
  await screen.findByText(/Se encontraron 2 productos/);
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
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
  api.createQuote.mockImplementation(async () => quote);
  api.prepare.mockResolvedValue({ checkoutOperationId: "operation-1", state: "PREPARED" });
  api.createOrder.mockRejectedValueOnce(new CheckoutApiError(504, "CHECKOUT_BACKEND_TIMEOUT", undefined, 5));
});

describe("CheckoutFlow in bff mode: verification is read-only", () => {
  it("shows the bff labels and never resends the order while verifying a SUBMITTED operation that needs recovery", async () => {
    api.getOperation.mockResolvedValueOnce({ checkoutOperationId: "operation-1", state: "SUBMITTED", recoveryRequired: true });
    await reachOrderForm();
    expect(screen.getByText(/Conectado al BFF/)).toBeDefined();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    const verify = await screen.findByRole("button", { name: "Verificar operación original" });
    expect(api.createOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(verify);
    await waitFor(() => expect(api.getOperation).toHaveBeenCalledTimes(1));
    await screen.findByText(/necesita recuperación/);
    expect(api.createOrder).toHaveBeenCalledTimes(1);
  });

  it("returns control to the person on ORDER_NOT_SUBMITTED and resends only on an explicit click, with the same operation and key", async () => {
    api.getOperation.mockRejectedValueOnce(new CheckoutApiError(409, "ORDER_NOT_SUBMITTED"));
    api.createOrder.mockResolvedValueOnce({ checkoutOperationId: "operation-1", state: "SUBMITTED" });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    const verify = await screen.findByRole("button", { name: "Verificar operación original" });
    const originalKey = api.createOrder.mock.calls[0]?.[2];

    fireEvent.click(verify);
    await screen.findByText(/no llegó a registrarse/);
    expect(api.createOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(api.createOrder.mock.calls[1]?.[0]).toBe(api.createOrder.mock.calls[0]?.[0]);
    expect(api.createOrder.mock.calls[1]?.[2]).toBe(originalKey);
  });

  it("passes the Retry-After of a pending operation to the person", async () => {
    api.getOperation.mockResolvedValueOnce({ checkoutOperationId: "operation-1", state: "SUBMITTED", retryAfterSeconds: 7 });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    fireEvent.click(await screen.findByRole("button", { name: "Verificar operación original" }));
    await screen.findByText(/Vuelve a verificar en 7 s/);
    expect(api.createOrder).toHaveBeenCalledTimes(1);
  });
});
