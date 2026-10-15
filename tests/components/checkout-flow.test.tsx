import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckoutFlow } from "../../src/features/checkout/CheckoutFlow";

describe("CheckoutFlow local fixtures", () => {
  it("runs address, quote, preparation and order to a clearly labeled fixture result", async () => {
    render(<CheckoutFlow />);

    expect(screen.getByRole("heading", { name: "Dirección de envío" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });

    fireEvent.change(screen.getByLabelText("Código promocional"), {
      target: { value: "SAVE20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect((await screen.findByRole("status")).textContent).toContain("Cupón aplicado");

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar consentimiento" }));
    await screen.findByRole("heading", { name: "Confirma y crea tu pedido" });

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Prueba" } });
    fireEvent.change(screen.getByLabelText("Número de documento"), { target: { value: "12345678" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "999999999" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "¡Pedido confirmado!" })).toBeDefined());
    expect(screen.getByText(/Resultado de fixture/)).toBeDefined();
    expect(screen.getByText("PAGADO (fixture)")).toBeDefined();
    expect(screen.getByRole("region", { name: "¡Pedido confirmado!" }).textContent).toContain("No se llamó al Backend");
  });

  it("does not create a preparation until the no-charge consent is checked", async () => {
    render(<CheckoutFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago simulado" }));
    await screen.findByRole("heading", { name: "Pago simulado" });
    expect((screen.getByRole("button", { name: "Registrar consentimiento" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("heading", { name: "Confirma y crea tu pedido" })).toBe(null);
  });

  it("keeps the current quote when a local coupon is not applicable", async () => {
    render(<CheckoutFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Resumen de envío" });
    const totalBefore = screen.getByText(/Total estimado/).parentElement?.textContent;

    fireEvent.change(screen.getByLabelText("Código promocional"), { target: { value: "NOTVALID" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect((await screen.findByRole("status")).textContent).toContain("no se puede aplicar");
    expect(screen.getByText(/Total estimado/).parentElement?.textContent).toBe(totalBefore);
  });
});
