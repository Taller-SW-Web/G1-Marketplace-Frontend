import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "../../src/features/auth/LoginForm";

afterEach(() => vi.unstubAllGlobals());

function fillForm() {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "demo@inka.test" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "Hito3Demo!" },
  });
}

describe("F-002 login H3", () => {
  it("validates fields locally and does not send incomplete credentials", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByText("Ingresa un correo electrónico válido.")).toBeTruthy();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the same neutral invalid credentials message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401, ok: false }));
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña e inténtalo de nuevo.",
    );
  });

  it("calls the Marketplace route and labels the result MOCK without a real session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ mode: "MOCK", authenticated: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/login");
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Validación de ejemplo completada. No se inició una sesión real.",
    );
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
  });

  it("toggles password visibility without submitting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("text");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
