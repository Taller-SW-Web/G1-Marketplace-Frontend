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
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
    expect(fetcher.mock.calls.filter(([path]) => path.endsWith("/auth/registro"))).toHaveLength(0);
  });
  it("shows one red message per unmet policy rule and removes each as it is met, without a checklist", async () => {
    registration(); const button = screen.getByRole("button", { name: "Crear cuenta" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    const password = screen.getByLabelText("Contraseña", { exact: true });
    expect(password.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText(/Debe /)).toBeNull();
    fireEvent.change(password, { target: { value: "abc" } });
    expect(screen.getByText("Debe tener al menos 12 caracteres.")).toBeTruthy();
    expect(screen.getByText("Debe incluir una letra mayúscula.")).toBeTruthy();
    expect(screen.getByText("Debe incluir un número.")).toBeTruthy();
    expect(screen.queryByText("Debe incluir una letra minúscula.")).toBeNull();
    // requiereCaracterEspecial is false in this policy: never ask for it.
    expect(screen.queryByText(/carácter especial/)).toBeNull();
    expect(password.getAttribute("aria-invalid")).toBe("true");
    const list = screen.getByText("Debe tener al menos 12 caracteres.").closest("ul")!;
    expect(list.getAttribute("aria-live")).toBe("polite");
    expect(password.getAttribute("aria-describedby")?.split(" ")).toContain(list.id);
    fireEvent.change(password, { target: { value: "Abcdefghijkl" } });
    expect(screen.queryByText("Debe tener al menos 12 caracteres.")).toBeNull();
    expect(screen.queryByText("Debe incluir una letra mayúscula.")).toBeNull();
    expect(screen.getByText("Debe incluir un número.")).toBeTruthy();
    fireEvent.change(password, { target: { value: "Abcdefghijk1" } });
    expect(screen.queryByText(/Debe /)).toBeNull();
    expect(password.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText(/Cumplido|Pendiente|Formato comprobado|Coinciden/)).toBeNull();
    const confirmation = screen.getByLabelText("Confirmar contraseña", { exact: true });
    fireEvent.change(confirmation, { target: { value: "Abcdefghijk" } });
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
    fireEvent.change(confirmation, { target: { value: "Abcdefghijk1" } });
    expect(screen.queryByText("Las contraseñas no coinciden.")).toBeNull();
  });
  it("validates other fields only after leaving them and clears the message once corrected", async () => {
    registration(); await waitFor(() => expect((screen.getByRole("button", { name: "Crear cuenta" }) as HTMLButtonElement).disabled).toBe(false));
    const email = screen.getByLabelText("Correo electrónico", { exact: true });
    fireEvent.change(email, { target: { value: "nombre@" } });
    expect(screen.queryByText("Ingresa un correo electrónico válido.")).toBeNull();
    fireEvent.blur(email);
    expect(screen.getByText("Ingresa un correo electrónico válido.")).toBeTruthy();
    fireEvent.change(email, { target: { value: "nombre@fixture.test" } });
    expect(screen.queryByText("Ingresa un correo electrónico válido.")).toBeNull();
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(screen.getByLabelText("Contraseña", { exact: true }).getAttribute("autocomplete")).toBe("new-password");
  });
  it("warns discreetly while Caps Lock is on in password fields", async () => {
    registration();
    const password = screen.getByLabelText("Contraseña", { exact: true });
    const key = (type: string, capsLock: boolean) => {
      const event = new KeyboardEvent(type, { key: "a", bubbles: true });
      Object.defineProperty(event, "getModifierState", { value: (name: string) => name === "CapsLock" && capsLock });
      return event;
    };
    fireEvent(password, key("keydown", true));
    expect(screen.getByText("Bloq Mayús está activado.")).toBeTruthy();
    fireEvent(password, key("keyup", false));
    expect(screen.queryByText("Bloq Mayús está activado.")).toBeNull();
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
