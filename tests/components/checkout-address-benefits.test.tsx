import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutApiError } from "../../src/features/checkout/api";

const api = vi.hoisted(() => ({
  listAddresses: vi.fn(), getCurrentCart: vi.fn(), createQuote: vi.fn(),
  applyBenefit: vi.fn(), removeBenefit: vi.fn(), createAddress: vi.fn(),
}));

vi.mock("../../src/features/checkout/api", () => ({
  backendMockEnabled: true,
  checkoutApi: api,
  checkoutErrorMessage: (_error: unknown, fallback: string) => fallback,
  CheckoutApiError: class CheckoutApiError extends Error {
    constructor(readonly status: number, readonly code: string) { super(code); }
  },
  isVerifiedPaidOperation: () => false,
}));

import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";

const address = {
  addressId: "ADR-1", label: "Casa", street: "Av. Lima 123", district: "Miraflores",
  province: "Lima", department: "Lima", phone: "999999999",
};
const quote = {
  quoteId: "Q-1", expiresAt: Date.now() + 300_000, subtotal: 340, discount: 0,
  shipping: 15, estimatedDays: 2, total: 355, addressId: "ADR-1", cartVersion: 7,
  lines: [{ sku: "SKU-1", quantity: 2 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listAddresses.mockResolvedValue([address]);
  api.getCurrentCart.mockResolvedValue({ cartId: "cart-1", version: 7, items: [{ sku: "SKU-1", quantity: 2 }] });
  api.createQuote.mockResolvedValue(quote);
});

describe("Checkout address and benefit acceptance", () => {
  it("clears the address selection when quote access returns 401", async () => {
    api.createQuote.mockRejectedValueOnce(new CheckoutApiError(401, "UNAUTHORIZED"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByText("No se pudo calcular el envío.");
    expect(screen.queryByText("Casa")).toBeNull();
    expect(screen.getByText("Aún no tienes direcciones guardadas.")).toBeDefined();
  });

  it("preserves the valid quote when benefit application returns 422", async () => {
    api.applyBenefit.mockRejectedValueOnce(new CheckoutApiError(422, "COUPON_NOT_APPLICABLE"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    const totalBefore = screen.getByText(/Total estimado/).parentElement?.textContent;

    fireEvent.change(screen.getByLabelText("Código promocional"), { target: { value: "NOPE" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await screen.findByText("No se pudo validar el cupón.");
    expect(screen.getByText(/Total estimado/).parentElement?.textContent).toBe(totalBefore);
    expect(screen.getByRole("button", { name: "Continuar al pago simulado" })).toBeDefined();
  });

  it("retains address fields after a rejected create request", async () => {
    api.createAddress.mockRejectedValueOnce(new CheckoutApiError(400, "ADDRESS_VALIDATION_ERROR"));
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar dirección" }));
    fireEvent.change(screen.getByLabelText("Etiqueta"), { target: { value: "Casa nueva" } });
    fireEvent.change(screen.getByLabelText("Dirección"), { target: { value: "Calle 1" } });
    fireEvent.change(screen.getByLabelText("Departamento"), { target: { value: "Lima" } });
    fireEvent.change(screen.getByLabelText("Provincia"), { target: { value: "Lima" } });
    fireEvent.change(screen.getByLabelText("Distrito"), { target: { value: "Surco" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar dirección" }));

    await screen.findByText("No se pudo guardar la dirección.");
    expect((screen.getByLabelText("Etiqueta") as HTMLInputElement).value).toBe("Casa nueva");
    expect((screen.getByLabelText("Dirección") as HTMLInputElement).value).toBe("Calle 1");
    expect(api.createAddress).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar dirección" })).toBeDefined());
  });
});
