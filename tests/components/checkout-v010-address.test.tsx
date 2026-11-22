import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutApiError } from "../../src/features/checkout/api";
import { maskPhone, validateAddressDraft, validateAddressField } from "../../src/features/checkout/address-validation";

// V-010 / F-022 (MOCK): every call below is a contract fixture; no Seguridad or Backend is reached.
const api = vi.hoisted(() => ({
  listAddresses: vi.fn(), getCurrentCart: vi.fn(), createQuote: vi.fn(),
  applyBenefit: vi.fn(), removeBenefit: vi.fn(), createAddress: vi.fn(),
}));

vi.mock("../../src/features/checkout/api", () => ({
  backendMockEnabled: true,
  checkoutApi: api,
  checkoutErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && "code" in error && error.code === "ADDRESS_SERVICE_UNAVAILABLE"
      ? "El servicio de direcciones no está disponible. Inténtalo de nuevo."
      : fallback,
  CheckoutApiError: class CheckoutApiError extends Error {
    constructor(readonly status: number, readonly code: string, readonly fields?: string[]) { super(code); }
  },
  isVerifiedPaidOperation: () => false,
}));

import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";

const address = {
  addressId: "ADR-1", label: "Casa", street: "Av. Lima 123", district: "Miraflores",
  province: "Lima", department: "Lima", phone: "999999123",
};

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Etiqueta (opcional)"), { target: { value: "Oficina" } });
  fireEvent.change(screen.getByLabelText("Dirección"), { target: { value: "Calle 1" } });
  fireEvent.change(screen.getByLabelText("Departamento"), { target: { value: "Lima" } });
  fireEvent.change(screen.getByLabelText("Provincia"), { target: { value: "Lima" } });
  fireEvent.change(screen.getByLabelText("Distrito"), { target: { value: "Surco" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "987 654 321" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAddresses.mockResolvedValue([address]);
  api.getCurrentCart.mockResolvedValue({ cartId: "cart-1", version: 3, items: [{ sku: "SKU-1", quantity: 2 }] });
});

describe("V-010 local validation rules", () => {
  it("requires every field except label and reference and rejects whitespace-only values", () => {
    const errors = validateAddressDraft({ label: " ", street: " ", department: "", province: "", district: "", reference: "", phone: "" });
    expect(Object.keys(errors).sort()).toEqual(["department", "district", "phone", "province", "street"]);
  });

  it("checks phone format and location letters, and masks the phone", () => {
    expect(validateAddressField("phone", "12ab")).toMatch(/Usa solo números/);
    expect(validateAddressField("phone", "987 654 321")).toBeUndefined();
    expect(validateAddressField("district", "Surco 2")).toMatch(/solo letras/);
    expect(maskPhone("999999123")).toBe("••• ••• 123");
  });
});

describe("V-010 Dirección de envío (MOCK)", () => {
  it("shows a skeleton while addresses load and keeps Continue disabled", async () => {
    api.listAddresses.mockReturnValueOnce(new Promise(() => undefined));
    render(<CheckoutFlow />);
    expect(screen.getByRole("status", { name: "Cargando tus direcciones…" })).toBeDefined();
    expect((screen.getByRole("button", { name: "Continuar al resumen" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("masks the phone on address cards and announces only its last digits", async () => {
    render(<CheckoutFlow />);
    const radio = await screen.findByRole("radio", { name: /Casa/ });
    expect(radio.closest("label")?.textContent).toContain("Teléfono terminado en 123");
    expect(radio.closest("label")?.textContent).not.toContain("999999123");
  });

  it("validates inline on blur and clears the message once the value is valid", async () => {
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
    const phone = screen.getByLabelText("Teléfono");
    fireEvent.change(phone, { target: { value: "abc" } });
    expect(phone.getAttribute("aria-invalid")).not.toBe("true");
    fireEvent.blur(phone);
    expect(phone.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/Usa solo números/)).toBeDefined();
    fireEvent.change(phone, { target: { value: "987654321" } });
    expect(phone.getAttribute("aria-invalid")).not.toBe("true");
  });

  it("blocks an incomplete submit locally, focuses the first error and keeps valid values", async () => {
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
    fireEvent.change(screen.getByLabelText("Etiqueta (opcional)"), { target: { value: "Casa playa" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Dirección")));
    expect(api.createAddress).not.toHaveBeenCalled();
    expect(screen.getByText("Ingresa la dirección.")).toBeDefined();
    expect((screen.getByLabelText("Etiqueta (opcional)") as HTMLInputElement).value).toBe("Casa playa");
    expect(screen.getByLabelText("Etiqueta (opcional)").getAttribute("aria-invalid")).not.toBe("true");
  });

  it("sends only the address fields, never an editable identity (RC-F-022-04)", async () => {
    api.createAddress.mockResolvedValueOnce({ ...address, addressId: "ADR-2", label: "Oficina", street: "Calle 1" });
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));

    await screen.findByText("La dirección «Oficina» se guardó y quedó seleccionada.");
    const payload = api.createAddress.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["department", "district", "label", "phone", "province", "street"]);
    expect(payload.phone).toBe("987654321");
    expect((screen.getByRole("radio", { name: /Oficina/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("preserves the typed address and offers a retry when the service returns 503", async () => {
    api.createAddress.mockRejectedValueOnce(new CheckoutApiError(503, "ADDRESS_SERVICE_UNAVAILABLE"))
      .mockResolvedValueOnce({ ...address, addressId: "ADR-3", label: "Oficina" });
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));

    await screen.findByText("El servicio de direcciones no está disponible. Inténtalo de nuevo.");
    expect((screen.getByLabelText("Dirección") as HTMLInputElement).value).toBe("Calle 1");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("987 654 321");
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));
    await screen.findByText(/se guardó y quedó seleccionada/);
    expect(api.createAddress).toHaveBeenCalledTimes(2);
  });

  it("removes addresses and the draft when creation returns 401 (RC-F-022-03)", async () => {
    api.createAddress.mockRejectedValueOnce(new CheckoutApiError(401, "UNAUTHENTICATED"));
    render(<CheckoutFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar nueva dirección" }));
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));

    await screen.findByRole("link", { name: "Iniciar sesión" });
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByLabelText("Dirección")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continuar al resumen" })).toBeNull();
  });

  it("works with the exact BFF shape: no phone block and optional label; a created address is selected", async () => {
    // BE #331 / SPECS #19: G7 has no phone, so neither GET nor the POST 201 return it.
    api.listAddresses.mockResolvedValueOnce([
      { addressId: "a1b2c3d4-0000-4000-8000-000000000001", street: "Av. Larco 1234", district: "Miraflores", province: "Lima", department: "Lima", label: "Casa" },
      { addressId: "a1b2c3d4-0000-4000-8000-000000000002", street: "Av. Javier Prado Este 560", district: "San Isidro", province: "Lima", department: "Lima" },
    ]);
    api.createAddress.mockResolvedValueOnce({ addressId: "a1b2c3d4-0000-4000-8000-000000000003", street: "Calle 1", district: "Surco", province: "Lima", department: "Lima" });
    render(<CheckoutFlow />);
    const casa = await screen.findByRole("radio", { name: /Casa/ });
    const sinEtiqueta = screen.getByRole("radio", { name: /Av\. Javier Prado Este 560/ });
    for (const radio of [casa, sinEtiqueta]) {
      expect(radio.closest("label")?.textContent).not.toMatch(/Tel\.|Teléfono/);
    }

    fireEvent.click(screen.getByRole("button", { name: "Agregar nueva dirección" }));
    expect((screen.getByLabelText("Etiqueta (opcional)") as HTMLInputElement).required).toBe(false);
    fireEvent.change(screen.getByLabelText("Dirección"), { target: { value: "Calle 1" } });
    fireEvent.change(screen.getByLabelText("Departamento"), { target: { value: "Lima" } });
    fireEvent.change(screen.getByLabelText("Provincia"), { target: { value: "Lima" } });
    fireEvent.change(screen.getByLabelText("Distrito"), { target: { value: "Surco" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "987654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar esta dirección" }));

    await screen.findByText("La dirección «Calle 1» se guardó y quedó seleccionada.");
    expect(api.createAddress).toHaveBeenCalledWith({ street: "Calle 1", district: "Surco", province: "Lima", department: "Lima", phone: "987654321" });
    const created = screen.getByRole("radio", { name: /Calle 1/ }) as HTMLInputElement;
    expect(created.checked).toBe(true);
    expect(created.closest("label")?.textContent).not.toMatch(/Tel\.|Teléfono/);
  });

  it("blocks Continue and points back to the cart when the cart is empty", async () => {
    api.getCurrentCart.mockResolvedValueOnce({ cartId: "cart-1", version: 3, items: [] });
    render(<CheckoutFlow />);
    await screen.findByText(/Tu carrito está vacío/);
    await screen.findByRole("radio", { name: /Casa/ });
    expect((screen.getByRole("button", { name: "Continuar al resumen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Volver al carrito" }).getAttribute("href")).toBe("/carrito");
  });
});
