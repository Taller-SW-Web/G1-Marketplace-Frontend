import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegistrationForm } from "../../src/features/auth/RegistrationForm";
import { CheckoutLogoutDialog } from "../../src/features/auth/CheckoutLogoutDialog";

const policy = { longitudMinima: 12, requiereMayuscula: true, requiereMinuscula: true, requiereDigito: true,
  requiereCaracterEspecial: false, historial: 5 };
let postResult: Response; let policyFails = false;
const fetcher = vi.fn(async (path: string) => {
  if (path.endsWith("/capabilities")) return Response.json({ login: true, registro: true, recuperacion: true });
  if (path.endsWith("/politica")) return policyFails ? Response.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 }) : Response.json(policy);
  return postResult;
});
beforeEach(() => {
  postResult = Response.json({ id: "11111111-1111-4111-8111-111111111111", estado: "PENDIENTE_VERIFICACION" }, { status: 201 });
  policyFails = false; fetcher.mockClear(); vi.stubGlobal("fetch", fetcher);
  window.history.replaceState(null, "", "/");
});
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });
function registration() { render(<RegistrationForm termsUrl="https://example.test/terms" privacyUrl="https://example.test/privacy" />); }
function fillRegistration() {
  for (const [label, value] of [["Nombres", "Cuenta Local"], ["Apellidos", "Fixture"], ["Correo electrónico", "new@fixture.test"],
    ["Celular", "900000000"], ["Contraseña", "Only-fixture!123"], ["Confirmar contraseña", "Only-fixture!123"]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.click(screen.getByRole("checkbox"));
}
describe("G1 account UI with contract fixtures", () => {
  it("registers once with server DTO fields and explains pending verification without login", async () => {
    registration(); const button = screen.getByRole("button", { name: "Crear cuenta" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fillRegistration(); fireEvent.click(button);
    expect(await screen.findByRole("heading", { name: "Revisa tu correo" })).toBeTruthy();
    expect(screen.getByText(/La sesión aún no está iniciada/)).toBeTruthy();
    const call = fetcher.mock.calls.find(([path]) => path.endsWith("/auth/registro")) as unknown as [string, RequestInit];
    const sent = JSON.parse(call[1].body as string);
    expect(sent.celular).toBe("+51900000000"); expect(sent.aceptaTerminos).toBe(true);
    expect(sent).not.toHaveProperty("confirmacion"); expect(sent).not.toHaveProperty("canalOrigen"); expect(sent).not.toHaveProperty("returnUrl");
    expect(fetcher.mock.calls.filter(([path]) => path.endsWith("/auth/login"))).toHaveLength(0);
  });
  it("requires deliberate consent and matching passwords before sending", async () => {
    registration(); const button = screen.getByRole("button", { name: "Crear cuenta" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fillRegistration(); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Confirmar contraseña", { exact: true }), { target: { value: "Different-fixture!" } });
    fireEvent.click(button);
    expect(await screen.findByText("Debes aceptar los términos y la política de privacidad.")).toBeTruthy();
    expect(screen.getByText("Las contraseñas deben coincidir.")).toBeTruthy();
    expect(fetcher.mock.calls.filter(([path]) => path.endsWith("/auth/registro"))).toHaveLength(0);
  });
  it("keeps registration disabled without published terms/privacy or a current password policy", async () => {
    render(<RegistrationForm />); await screen.findByText(/Los documentos de términos/);
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Crear cuenta" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("offers retry instead of inventing a password policy on provider failure", async () => {
    policyFails = true; registration(); await screen.findByRole("button", { name: "Reintentar requisitos" });
    const button = screen.getByRole("button", { name: "Crear cuenta" }); expect((button as HTMLButtonElement).disabled).toBe(true);
    policyFails = false; fireEvent.click(screen.getByRole("button", { name: "Reintentar requisitos" }));
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });
});
describe("checkout logout confirmation", () => {
  it("focuses the safe action, preserves the order warning, and fires only the chosen action", async () => {
    const confirm = vi.fn(); const cancel = vi.fn();
    render(<CheckoutLogoutDialog opened busy={false} onConfirm={confirm} onCancel={cancel} />);
    const button = screen.getByRole("button", { name: "Continuar checkout" });
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(screen.getByText(/cerrar sesión no lo cancela/)).toBeTruthy();
    fireEvent.click(button); expect(cancel).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
  });
});
