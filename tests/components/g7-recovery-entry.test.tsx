import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "../../src/features/auth/LoginForm";
import { LegacyResetNotice } from "../../src/features/auth/LegacyResetNotice";
import { g7RecoveryUrl } from "../../src/features/auth/g7-recovery-url";

afterEach(() => { window.history.replaceState(null, "", "/"); });

describe("G7 recovery entry", () => {
  it("accepts only a fixed recovery page without user data or callback parameters", () => {
    const target = "https://g7.example.test/recuperar-contrasena";
    expect(g7RecoveryUrl(target, "production")).toBe(target);
    for (const unsafe of [
      "https://g7.example.test/recuperar-contrasena?token=fixture",
      "https://g7.example.test/recuperar-contrasena#fragment",
      "https://user@g7.example.test/recuperar-contrasena",
      "https://g7.example.test/otra-ruta",
      "http://g7.example.test/recuperar-contrasena",
      "//g7.example.test/recuperar-contrasena",
    ]) expect(g7RecoveryUrl(unsafe, "production")).toBeNull();
    expect(g7RecoveryUrl("http://127.0.0.1:4000/recuperar-contrasena", "test"))
      .toBe("http://127.0.0.1:4000/recuperar-contrasena");
  });

  it("links directly to the G7 recovery page without copying login fields", () => {
    const target = "https://g7.example.test/recuperar-contrasena";
    render(<LoginForm realAuth recoveryUrl={target} />);
    const link = screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" });
    expect(link.getAttribute("href")).toBe(target);
    expect(link.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("removes legacy reset parameters and history state without forwarding them", () => {
    window.history.replaceState({ secret: "fixture" }, "", "/restablecer-contrasena?token=fixture#fragment");
    render(<LegacyResetNotice />);
    expect(window.location.pathname).toBe("/restablecer-contrasena");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
    expect(window.history.state).toBeNull();
  });
});
