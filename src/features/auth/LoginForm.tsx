"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AccessError, announceSessionChange, authCall, safeReturn } from "./client";
import { focusFirstInvalid } from "./form-focus";

const INVALID_CREDENTIALS =
  "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña e inténtalo de nuevo.";

export function LoginForm({ realAuth = false }: { realAuth?: boolean }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [challenge, setChallenge] = useState<{ deadline: number; destination?: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [resendReady, setResendReady] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackElement = useRef<HTMLDivElement>(null);
  const expiredNotice = useRef<HTMLParagraphElement>(null);
  const mfaStep = Boolean(challenge);
  useEffect(() => { heading.current?.focus(); }, [mfaStep]);
  useEffect(() => { if (feedback?.kind === "error" && !busy) feedbackElement.current?.focus(); }, [feedback, busy]);
  useEffect(() => {
    if (challenge && challenge.deadline <= Date.now() && remaining === 0 && !busy) expiredNotice.current?.focus();
  }, [challenge, remaining, busy]);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function call(action: string, body: unknown) {
    activeRequest.current?.abort(); const controller = new AbortController(); activeRequest.current = controller;
    const value = await authCall(action, body, controller.signal);
    controller.signal.throwIfAborted(); return value;
  }

  useEffect(() => {
    if (!challenge) return;
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((challenge.deadline - Date.now()) / 1000)));
      setResendReady(Date.now() >= resendAt);
    };
    update(); const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, resendAt]);
  function finish(result: Record<string, unknown>) {
    if (activeRequest.current?.signal.aborted) return;
    if (result.authenticated !== true) throw new Error("Unexpected session");
    announceSessionChange();
    window.location.replace(safeReturn(new URLSearchParams(window.location.search).get("returnTo")));
  }
  async function sendCode() {
    const result = await call("otp/solicitar", {});
    setChallenge(previous => previous ? { ...previous, destination: typeof result.destinoEnmascarado === "string" ? result.destinoEnmascarado : undefined } : previous);
    setResendAt(Date.now() + 30000);
    setFeedback({ kind: "success", message: "Enviamos un código a tu correo. Revisa también la carpeta de spam." });
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !/^\d{6}$/.test(codigo) || !remaining) return;
    setBusy(true); setFeedback(null);
    try { finish(await call("otp/verificar", { codigo })); }
    catch (error) { setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No pudimos verificar el código." }); }
    finally { setBusy(false); setCodigo(""); }
  }

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
    if (nextEmailError || nextPasswordError) { focusFirstInvalid(event.currentTarget); return; }

    setBusy(true);
    try {
      if (realAuth) {
        const result = await call("login", { correo: correo.trim(), contrasena });
        setContrasena("");
        if (result.mfaRequerido === true && typeof result.expiraEn === "number") {
          setRemaining(Math.max(0, Math.ceil(result.expiraEn)));
          setChallenge({ deadline: Date.now() + result.expiraEn * 1000 });
          await sendCode();
        } else finish(result);
        return;
      }
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
    } catch (error) {
      setFeedback({
        kind: "error",
        message: realAuth ? error instanceof AccessError ? error.message : "No pudimos completar el acceso. Inténtalo más tarde." : "No pudimos conectar con la demostración. Inténtalo más tarde.",
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
            <h1 ref={heading} tabIndex={-1} id="auth-title">{challenge ? "Verifica tu acceso" : "Inicia sesión"}</h1>
            <p>{challenge ? "Ingresa el código de seis dígitos enviado por correo." : "Ingresa a tu cuenta para continuar."}</p>
          </div>
        </div>

        {feedback && (
          <div
            ref={feedbackElement} tabIndex={-1}
            className={`auth-feedback auth-feedback--${feedback.kind}`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </div>
        )}

        {challenge ? <form className="auth-form" onSubmit={verify}>
          {challenge.destination && <p>Correo: {challenge.destination}</p>}
          <TextField label="Código de verificación" name="codigo" inputMode="numeric" autoComplete="one-time-code"
            value={codigo} onChange={event => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
            readOnly={busy} disabled={!remaining} maxLength={6} required />
          {remaining ? <p role="timer" aria-live="off">Tiempo para completar el acceso: {remaining} s</p>
            : <p ref={expiredNotice} tabIndex={-1} role="status">El desafío venció. Vuelve a iniciar sesión.</p>}
          <Button type="submit" loading={busy} preserveFocusWhileLoading disabled={codigo.length !== 6 || !remaining} fullWidth>Verificar código</Button>
          <button className="auth-text-link" type="button" disabled={busy || !remaining || !resendReady} onClick={async () => {
            setBusy(true); setFeedback(null);
            try { await sendCode(); } catch (error) { setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No pudimos enviar el código." }); }
            finally { setBusy(false); }
          }}>Reenviar código</button>
          <button className="auth-text-link" type="button" disabled={busy} onClick={() => { setChallenge(null); setCodigo(""); setFeedback(null); }}>Volver al inicio de sesión</button>
        </form> : <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            readOnly={busy}
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
            readOnly={busy}
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
            <Button type="submit" loading={busy} preserveFocusWhileLoading fullWidth>
              Iniciar sesión
            </Button>
          </div>
        </form>}

        <p className="auth-register">
          ¿No tienes cuenta? <Link className="auth-text-link" href="/registro">Crear cuenta</Link>
        </p>
        {!realAuth && <p className="auth-demo-label">Corte H3 · Demostración con datos de prueba</p>}
      </div>
    </section>
  );
}
