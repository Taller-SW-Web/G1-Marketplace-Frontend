"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AuthShell } from "./AuthShell";
import { accountCall, AccountError } from "./account-client";
import { useAccountCapabilities } from "./useAccountCapabilities";

export function RecoverPasswordForm() {
  const [correo, setCorreo] = useState(""); const [error, setError] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [accepted, setAccepted] = useState(false);
  const capabilities = useAccountCapabilities();
  const [retryAt, setRetryAt] = useState(0); const [wait, setWait] = useState(0);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setWait(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || wait || !capabilities.recuperacion) return;
    setMessage(""); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) { setError("Ingresa un correo electrónico válido."); return; }
    setError(""); setBusy(true);
    try {
      const result = await accountCall("password/recuperar", { correo: correo.trim() });
      if (result?.accepted !== true) throw new AccountError("AUTH_UNAVAILABLE", 503);
      setAccepted(true);
    } catch (failure) {
      setMessage(failure instanceof AccountError ? failure.message : "No pudimos confirmar la solicitud. Inténtalo más tarde.");
      if (failure instanceof AccountError && failure.status === 429 && failure.retryAfterSeconds !== undefined) {
        setWait(failure.retryAfterSeconds); setRetryAt(Date.now() + failure.retryAfterSeconds * 1000);
      }
    }
    finally { setBusy(false); }
  }
  return <AuthShell title={accepted ? "Revisa tu correo" : "Recupera tu contraseña"}
    description={accepted ? "Si el correo es válido, recibirás instrucciones para continuar." : "Ingresa tu correo y te indicaremos los siguientes pasos."}>
    {accepted ? <><p className="auth-small-copy">Revisa también la carpeta de correo no deseado.</p>
      <Link className="button button--primary button--md button--full" href="/login">Volver a iniciar sesión</Link>
      <button type="button" className="auth-text-link" onClick={() => { setAccepted(false); setMessage(""); }}>Intentar nuevamente</button></>
      : <form className="auth-form" onSubmit={submit} noValidate>
        {!capabilities.loading && !capabilities.recuperacion && <p className="auth-feedback" role="status">La recuperación no está disponible por el momento. Inténtalo más adelante.</p>}
        {message && <p className="auth-feedback auth-feedback--error" role="alert">{message}</p>}
        <TextField label="Correo electrónico" name="correo" type="email" autoComplete="email" placeholder="nombre@correo.com" value={correo} maxLength={254}
          onChange={event => { setCorreo(event.target.value); setError(""); }} error={error} disabled={busy} required />
        <div className="auth-actions auth-actions--center"><Button type="submit" fullWidth loading={busy} disabled={!capabilities.recuperacion || wait > 0}>{wait ? `Reintentar en ${wait} s` : "Enviar instrucciones"}</Button>
          <Link className="auth-text-link" href="/login">Volver a iniciar sesión</Link></div>
      </form>}
  </AuthShell>;
}
