import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "../../src/features/auth/LoginForm";

afterEach(() => vi.unstubAllGlobals());
function fill() {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "a@fixture.test" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Fixture!123" } });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}
describe("G7 login and MFA states", () => {
  it("requests the email OTP and waits for verification without claiming an authenticated session", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ mfaRequerido: true, canal: "EMAIL", expiraEn: 300 }))
      .mockResolvedValueOnce(Response.json({ canal: "EMAIL", destinoEnmascarado: "a***@fixture.test", expiraEn: 300, desafioExpiraEn: 300 }));
    vi.stubGlobal("fetch", fetcher); render(<LoginForm realAuth />); fill();
    expect(await screen.findByLabelText("Código de verificación")).toBeTruthy();
    expect(await screen.findByText("Correo: a***@fixture.test")).toBeTruthy();
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/v1/auth/login", "/api/v1/auth/otp/solicitar"]);
    expect(screen.queryByText(/Demostración con datos/)).toBeNull();
    expect(screen.queryByText(/sesión iniciada/i)).toBeNull();
  });
  it("keeps the challenge for a wrong code and clears the entered code", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ mfaRequerido: true, canal: "EMAIL", expiraEn: 300 }))
      .mockResolvedValueOnce(Response.json({ canal: "EMAIL", destinoEnmascarado: "a***@fixture.test", expiraEn: 300, desafioExpiraEn: 300 }))
      .mockResolvedValueOnce(Response.json({ code: "CODIGO_INVALIDO" }, { status: 401 }));
    vi.stubGlobal("fetch", fetcher); render(<LoginForm realAuth />); fill();
    const field = await screen.findByLabelText("Código de verificación");
    await screen.findByText("Correo: a***@fixture.test");
    fireEvent.change(field, { target: { value: "999999" } }); fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    expect((await screen.findByRole("alert")).textContent).toContain("El código no es válido");
    expect((field as HTMLInputElement).value).toBe("");
    expect(fetcher.mock.calls[2][1].body).toBe(JSON.stringify({ codigo: "999999" }));
  });
  it("explains a password policy or temporary throttle response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "PASSWORD_CADUCADA" }, { status: 403 })));
    render(<LoginForm realAuth />); fill();
    expect((await screen.findByRole("alert")).textContent).toContain("contraseña necesita actualizarse");
  });
  it("allows retry after the initial OTP delivery fails", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ mfaRequerido: true, expiraEn: 300 }))
      .mockResolvedValueOnce(Response.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ canal: "EMAIL", destinoEnmascarado: "a***@fixture.test", expiraEn: 300, desafioExpiraEn: 300 }));
    vi.stubGlobal("fetch", fetcher); render(<LoginForm realAuth />); fill();
    expect(await screen.findByRole("alert")).toBeTruthy();
    const resend = screen.getByRole("button", { name: "Reenviar código" });
    await waitFor(() => expect((resend as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(resend);
    expect(await screen.findByText("Correo: a***@fixture.test")).toBeTruthy();
    await waitFor(() => expect((screen.getByRole("button", { name: "Reenviar código" }) as HTMLButtonElement).disabled).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
