"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";

const INVALID_CREDENTIALS =
  "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña e inténtalo de nuevo.";

export function LoginForm() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFeedback(null);

    const nextEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
      ? ""
      : "Ingresa un correo electrónico válido.";
    const nextPasswordError = contrasena ? "" : "Ingresa tu contraseña.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ correo: correo.trim(), contrasena }),
      });
      if (response.status === 401) {
        setFeedback({ kind: "error", message: INVALID_CREDENTIALS });
        return;
      }
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: "La demostración de acceso no está disponible ahora. Inténtalo más tarde.",
        });
        return;
      }
      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("mode" in result) ||
        result.mode !== "MOCK" ||
        !("authenticated" in result) ||
        result.authenticated !== false
      ) {
        throw new Error("Unexpected login response");
      }
      setContrasena("");
      setFeedback({
        kind: "success",
        message: "Validación de ejemplo completada. No se inició una sesión real.",
      });
    } catch {
      setFeedback({
        kind: "error",
        message: "No pudimos conectar con la demostración. Inténtalo más tarde.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-card">
        <div className="auth-intro">
          <div className="auth-logo">
            <img src="/figma/logo.png" alt="Inka Athletics" width="210" height="158" />
          </div>
          <div className="auth-heading">
            <h1 id="auth-title">Inicia sesión</h1>
            <p>Ingresa a tu cuenta para continuar.</p>
          </div>
        </div>

        {feedback && (
          <div
            className={`auth-feedback auth-feedback--${feedback.kind}`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Correo electrónico"
            type="email"
            name="correo"
            autoComplete="email"
            placeholder="nombre@correo.com"
            value={correo}
            onChange={(event) => {
              setCorreo(event.target.value);
              if (emailError) setEmailError("");
            }}
            error={emailError}
            disabled={busy}
            required
          />
          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            name="contrasena"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            value={contrasena}
            onChange={(event) => {
              setContrasena(event.target.value);
              if (passwordError) setPasswordError("");
            }}
            error={passwordError}
            disabled={busy}
            required
            endAdornment={
              <button
                className="auth-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={busy}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            }
          />
          <div className="auth-actions">
            <Link className="auth-text-link" href="/recuperar-contrasena">
              ¿Olvidaste tu contraseña?
            </Link>
            <Button type="submit" loading={busy} fullWidth>
              Iniciar sesión
            </Button>
          </div>
        </form>

        <p className="auth-register">
          ¿No tienes cuenta? <Link className="auth-text-link" href="/registro">Crear cuenta</Link>
        </p>
        <p className="auth-demo-label">Corte H3 · Demostración con datos de prueba</p>
      </div>
    </section>
  );
}
