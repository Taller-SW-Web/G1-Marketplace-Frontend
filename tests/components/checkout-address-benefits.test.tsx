import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutApiError } from "../../src/features/checkout/api";
import type { CheckoutQuote } from "../../src/features/checkout/fixtures";

const api = vi.hoisted(() => ({
  listAddresses: vi.fn(), getCurrentCart: vi.fn(), createQuote: vi.fn(),
  applyBenefit: vi.fn(), removeBenefit: vi.fn(), createAddress: vi.fn(),
}));

vi.mock("../../src/features/checkout/api", () => ({
  backendMockEnabled: true,
  checkoutApi: api,
  checkoutErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && "code" in error && error.code === "CART_CHANGED"
      ? "Tu carrito cambió. Vuelve al carrito y actualiza el resumen."
      : fallback,
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

  it("invalidates the quote when the buyer selects a different address", async () => {
    api.listAddresses.mockResolvedValueOnce([address, {
      ...address, addressId: "ADR-2", label: "Trabajo", street: "Jr. Comercio 450",
    }]);
    api.createQuote.mockResolvedValueOnce(quote).mockResolvedValueOnce({ ...quote, quoteId: "Q-2", addressId: "ADR-2" });
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Volver a dirección" }));
    fireEvent.click(screen.getByRole("radio", { name: /Trabajo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("heading", { name: "Resumen de envío" });
    expect(api.createQuote).toHaveBeenLastCalledWith("ADR-2", 7);
    expect(screen.getByText("Trabajo: Jr. Comercio 450, Miraflores")).toBeDefined();
  });

  it("does not represent an unavailable quote service as free shipping", async () => {
    api.createQuote.mockRejectedValueOnce(new CheckoutApiError(503, "QUOTE_UNAVAILABLE"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByText("No se pudo calcular el envío.");
    expect(screen.queryByRole("heading", { name: "Resumen de envío" })).toBeNull();
    expect(screen.queryByText(/Envío/)).toBeNull();
  });

  it("explains a changed cart and does not continue with an obsolete quote", async () => {
    api.createQuote.mockRejectedValueOnce(new CheckoutApiError(409, "CART_CHANGED"));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByText("Tu carrito cambió. Vuelve al carrito y actualiza el resumen.");
    expect(screen.queryByRole("heading", { name: "Resumen de envío" })).toBeNull();
  });

  it("blocks continuation when the quote has expired", async () => {
    api.createQuote.mockResolvedValueOnce({ ...quote, expiresAt: Date.now() - 10_000 });
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });

    await waitFor(() => expect(screen.getByRole("button", { name: "Continuar al pago simulado" }).hasAttribute("disabled")).toBe(true), { timeout: 2500 });
    expect(screen.getByRole("alert").textContent).toContain("La cotización venció");
  });

  it("removes a selected benefit by requesting a fresh quote", async () => {
    const discountedQuote = {
      ...quote,
      quoteId: "Q-DISCOUNTED",
      discount: 20,
      total: 335,
      selectedBenefit: { type: "COUPON", id: "SAVE20", discount: 20 },
    };
    api.applyBenefit.mockResolvedValueOnce(discountedQuote);
    api.removeBenefit.mockResolvedValueOnce(quote);
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.change(screen.getByLabelText("Código promocional"), { target: { value: "SAVE20" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await screen.findByText("Cupón aplicado: SAVE20");
    fireEvent.click(screen.getByRole("button", { name: "Quitar beneficio" }));

    await screen.findByText("Se actualizó el resumen sin el beneficio.");
    expect(api.removeBenefit).toHaveBeenCalledWith(discountedQuote);
    expect(screen.getByText(/Total estimado/).parentElement?.textContent).toContain("355");
    expect(screen.getByLabelText("Código promocional")).toBeDefined();
  });

  it("ignores a delayed benefit response after the quote context changes", async () => {
    let resolveBenefit!: (value: CheckoutQuote) => void;
    api.listAddresses.mockResolvedValueOnce([address, {
      ...address, addressId: "ADR-2", label: "Trabajo", street: "Jr. Comercio 450",
    }]);
    api.createQuote.mockResolvedValueOnce(quote).mockResolvedValueOnce({ ...quote, addressId: "ADR-2" });
    api.applyBenefit.mockImplementationOnce(() => new Promise((resolve) => { resolveBenefit = resolve; }));
    render(<CheckoutFlow />);
    await screen.findByText(/Se encontraron 2 productos/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.change(screen.getByLabelText("Código promocional"), { target: { value: "SAVE20" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver a dirección" }));
    fireEvent.click(screen.getByRole("radio", { name: /Trabajo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText(/Jr\. Comercio 450/);
    resolveBenefit({ ...quote, quoteId: "Q-LATE", total: 1, selectedBenefit: { type: "COUPON", id: "OLD", discount: 354 } });

    await waitFor(() => expect(screen.queryByText("Cupón aplicado: OLD")).toBeNull());
    expect(screen.getByText(/Total estimado/).parentElement?.textContent).toContain("355");
  });
});
