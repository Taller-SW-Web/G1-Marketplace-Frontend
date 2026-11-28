import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listAddresses: vi.fn(), getCurrentCart: vi.fn(), createQuote: vi.fn(),
  applyBenefit: vi.fn(), removeBenefit: vi.fn(), prepare: vi.fn(),
  createOrder: vi.fn(), getOperation: vi.fn(),
}));

vi.mock("../../src/features/checkout/api", () => ({
  backendMockEnabled: true,
  checkoutApi: api,
  checkoutErrorMessage: (_error: unknown, fallback: string) => fallback,
  CheckoutApiError: class CheckoutApiError extends Error {
    constructor(readonly status: number, readonly code: string) { super(code); }
  },
  isVerifiedPaidOperation: (operation: { state: string; orderState?: string; orderId?: string }) =>
    operation.state === "SUCCEEDED" && operation.orderState === "PAGADO" && Boolean(operation.orderId),
}));

import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";
import { OrderConfirmationSummary } from "../../src/features/checkout/CheckoutComponents";
import { OrderConfirmationLookup } from "../../src/features/checkout/OrderConfirmationLookup";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  api.listAddresses.mockResolvedValue([{
    addressId: "ADR-1", label: "Casa", street: "Av. Lima 123", district: "Miraflores",
    province: "Lima", department: "Lima", phone: "999999999",
  }]);
  api.getCurrentCart.mockResolvedValue({ cartId: "cart-1", version: 7, items: [{ sku: "SKU-1", quantity: 1 }] });
  api.createQuote.mockResolvedValue({ quoteId: "Q-1", expiresAt: Date.now() + 300_000, subtotal: 100, discount: 0, shipping: 10, estimatedDays: 2, total: 110, addressId: "ADR-1", cartVersion: 7, lines: [{ sku: "SKU-1", quantity: 1 }] });
  api.prepare.mockResolvedValue({ checkoutOperationId: "op-1", state: "PREPARED" });
});

afterEach(() => vi.unstubAllGlobals());

async function reachPreparation() {
  render(<CheckoutFlow />);
  await screen.findByText(/Se encontraron 1 productos/);
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
  await screen.findByRole("heading", { name: "Resumen de envío" });
  fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
  await screen.findByRole("heading", { name: "Pago simulado" });
  fireEvent.click(screen.getByRole("checkbox"));
}

async function reachOrderForm() {
  await reachPreparation();
  fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
  await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });
}

function fillContact() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Prueba" } });
  fireEvent.change(screen.getByLabelText("Número de documento"), { target: { value: "12345678" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "999999999" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.test" } });
}

describe("Checkout payment and confirmation acceptance", () => {
  const paidOperation = { checkoutOperationId: "op-1", state: "SUCCEEDED", orderId: "PED-1", orderState: "PAGADO", orderTotal: 110, orderCreatedAt: "2026-10-27T10:00:00Z" } as const;

  it("labels BFF confirmations explicitly and keeps the email notice as a preview", () => {
    render(<OrderConfirmationSummary orderId="PED-1" operationId="op-1" operation={paidOperation} quote={null}
      backendMockEnabled bff copyMessage="" onCopy={vi.fn()} />);

    expect(screen.getByText("Estado verificado por BFF · PAGADO")).toBeDefined();
    expect(screen.getByText("Ventas confirmó el estado PAGADO. El pago lo simula Ventas: no hubo cobro real.")).toBeDefined();
    expect(screen.getByText("Pago simulado confirmado por Ventas")).toBeDefined();
    expect(screen.queryByText(/Backend MOCK confirmó/)).toBeNull();
    expect(screen.getByRole("note").textContent).toContain("Vista previa:");
  });

  it("sends only one preparation request for rapid repeated submits", async () => {
    let resolvePreparation!: (value: { checkoutOperationId: string; state: string }) => void;
    api.prepare.mockImplementationOnce(() => new Promise((resolve) => { resolvePreparation = resolve; }));
    await reachPreparation();
    const button = screen.getByRole("button", { name: "Registrar consentimiento" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.prepare).toHaveBeenCalledTimes(1);
    resolvePreparation({ checkoutOperationId: "op-1", state: "PREPARED" });
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });
    expect(screen.queryByRole("heading", { name: "¡Pedido confirmado!" })).toBeNull();
  });

  it("does not create a paid confirmation from a 202 SUBMITTED response", async () => {
    api.createOrder.mockResolvedValueOnce({ checkoutOperationId: "op-1", state: "SUBMITTED", orderId: "PED-1", orderState: "CREADO" });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    expect(await screen.findByRole("button", { name: "Verificar operación original" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "¡Pedido confirmado!" })).toBeNull();
    expect(screen.getByRole("note").textContent).toContain("se verificará al preparar la compra");
  });

  it("keeps contact transient in browser storage while creating the order", async () => {
    api.createOrder.mockResolvedValueOnce({ checkoutOperationId: "op-1", state: "SUBMITTED" });
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));
    await screen.findByRole("button", { name: "Verificar operación original" });

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("sends only one order request for rapid repeated submits", async () => {
    let resolveOrder!: (value: { checkoutOperationId: string; state: string }) => void;
    api.createOrder.mockImplementationOnce(() => new Promise((resolve) => { resolveOrder = resolve; }));
    await reachOrderForm();
    fillContact();
    const submit = screen.getByRole("button", { name: "Crear pedido" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    resolveOrder({ checkoutOperationId: "op-1", state: "SUBMITTED" });
    await screen.findByRole("button", { name: "Verificar operación original" });
  });

  it("offers a manual copy fallback when clipboard access fails", async () => {
    api.getOperation.mockResolvedValueOnce(paidOperation);
    const testNavigator = Object.create(navigator) as Navigator;
    Object.defineProperty(testNavigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    vi.stubGlobal("navigator", testNavigator);
    render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
    await screen.findByRole("heading", { name: "¡Pedido confirmado!" });
    fireEvent.click(screen.getByRole("button", { name: "Copiar código de pedido PED-1" }));
    expect(await screen.findByText("No pudimos copiarlo. Puedes seleccionar el código y copiarlo manualmente.")).toBeDefined();
  });

  it("never reveals paid details when the deep-link order does not match the operation", async () => {
    api.getOperation.mockResolvedValueOnce({ checkoutOperationId: "op-1", state: "SUCCEEDED", orderId: "PED-OTHER", orderState: "PAGADO", orderTotal: 110, orderCreatedAt: "2026-10-27T10:00:00Z" });
    render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
    await screen.findByRole("heading", { name: "No pudimos verificar el pedido" });
    expect(screen.queryByText("PAGADO")).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    expect(api.getOperation).toHaveBeenCalledWith("op-1");
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
  });

  it("does not query an operation when a deep link has no operation mapping", async () => {
    render(<OrderConfirmationLookup orderId="PED-1" />);
    await screen.findByRole("heading", { name: "No pudimos verificar el pedido" });
    expect(api.getOperation).not.toHaveBeenCalled();
  });

  it("announces order confirmation and shows the MOCK notice without echoing contact", async () => {
    api.createOrder.mockResolvedValueOnce(paidOperation);
    await reachOrderForm();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    const title = await screen.findByRole("heading", { name: "¡Pedido confirmado!" });
    expect(document.activeElement).toBe(title);
    expect(screen.getByRole("note").textContent).toContain("Vista previa:");
    expect(screen.queryByText("ana@example.test")).toBeNull();
  });

  it("shows the notice only after lookup moves from loading and CREADO to verified PAGADO", async () => {
    api.getOperation.mockResolvedValueOnce({ ...paidOperation, state: "SUBMITTED", orderState: "CREADO" });
    api.getOperation.mockResolvedValueOnce(paidOperation);
    render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);

    expect(screen.getByRole("status").textContent).toContain("Consultando el estado");
    expect(screen.queryByRole("note")).toBeNull();
    const verify = await screen.findByRole("button", { name: "Verificar pedido" });
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(verify);

    await screen.findByRole("heading", { name: "¡Pedido confirmado!" });
    expect(screen.getByRole("note").textContent).toContain("Vista previa:");
    expect(api.getOperation).toHaveBeenCalledTimes(2);
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it("only reads the original operation when remounting a confirmed lookup", async () => {
    api.getOperation.mockResolvedValueOnce(paidOperation).mockResolvedValueOnce(paidOperation);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    for (let i = 0; i < 2; i++) {
      const { unmount } = render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
      await screen.findByRole("note");
      unmount();
    }
    expect(api.getOperation.mock.calls).toEqual([["op-1"], ["op-1"]]);
    expect(api.createOrder).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not keep the previous notice while a different deep link is being verified", async () => {
    api.getOperation.mockResolvedValueOnce(paidOperation).mockResolvedValueOnce(paidOperation);
    const { rerender } = render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
    await screen.findByRole("note");

    rerender(<OrderConfirmationLookup orderId="PED-1" operationId="op-2" />);
    expect(screen.queryByRole("note")).toBeNull();
    await screen.findByRole("heading", { name: "No pudimos verificar el pedido" });
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("omits the notice on a failed order and on a checkout lookup error", async () => {
    api.getOperation.mockResolvedValueOnce({ checkoutOperationId: "op-1", state: "FAILED", orderId: "PED-1", orderState: "ANULADO" });
    api.getOperation.mockRejectedValueOnce(new Error("Checkout lookup unavailable"));

    const { unmount } = render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
    await screen.findByRole("heading", { name: "No se confirmó el pago simulado" });
    expect(screen.queryByRole("note")).toBeNull();
    unmount();

    render(<OrderConfirmationLookup orderId="PED-1" operationId="op-1" />);
    await screen.findByRole("heading", { name: "No pudimos verificar el pedido" });
    expect(screen.queryByRole("note")).toBeNull();
  });
});
