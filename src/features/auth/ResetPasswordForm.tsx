"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { AuthShell } from "./AuthShell";
import { PasswordField } from "./PasswordField";
import { PasswordRules, usePasswordPolicy } from "./PasswordRules";
import { formatMatches } from "./policy";
import { accountCall, AccountError } from "./account-client";
import { announceSessionChange, authCall } from "./client";
import { useAccountCapabilities } from "./useAccountCapabilities";
import { useAuth } from "./AuthProvider";
import { focusFirstInvalid } from "./form-focus";

export function ResetPasswordForm() {
  const token = useRef(""); const captured = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [link, setLink] = useState<"checking" | "present" | "invalid" | "expired" | "success">("checking");
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message && !busy) feedback.current?.focus(); }, [message, busy]);
  const [logoutWarning, setLogoutWarning] = useState(false);
  const rules = usePasswordPolicy(); const capabilities = useAccountCapabilities(); const auth = useAuth();
  useEffect(() => {
    if (!captured.current) {
      captured.current = true; const values = new URLSearchParams(window.location.search).getAll("token");
      if (values.length === 1 && values[0] && values[0].length <= 2048 && !/\s/.test(values[0])) token.current = values[0];
      // Remove the secret from both the visible URL and current history entry.
      window.history.replaceState(null, "", window.location.pathname);
    }
    const timer = window.setTimeout(() => setLink(token.current ? "present" : "invalid"), 0);
    return () => { window.clearTimeout(timer); activeRequest.current?.abort(); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || link !== "present" || !token.current || !rules.policy || !capabilities.recuperacion) return;
    const form = event.currentTarget;
    setMessage(""); setError(""); setPasswordError("");
    if (!formatMatches(rules.policy, password)) { setPasswordError("Revisa los requisitos de formato."); focusFirstInvalid(form); return; }
    if (!confirmation || password !== confirmation) { setError("Las contraseñas deben coincidir."); focusFirstInvalid(form); return; }
    setBusy(true);
    const controller = new AbortController(); activeRequest.current = controller;
    try {
      const result = await accountCall("password/restablecer", { token: token.current, nuevaContrasena: password }, controller.signal);
      if (controller.signal.aborted) return;
      if (result !== null) throw new AccountError("AUTH_UNAVAILABLE", 503);
      token.current = ""; setPassword(""); setConfirmation(""); setLink("success");
      if (auth.enabled) {
        try { const closed = await authCall("logout", {}, controller.signal); if (closed.authenticated !== false || closed.remoteRevocationPending === true) setLogoutWarning(true); }
        catch { setLogoutWarning(true); }
        announceSessionChange();
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof AccountError && ["TOKEN_RECUPERACION_INVALIDO", "TOKEN_RECUPERACION_EXPIRADO"].includes(failure.code)) {
        token.current = ""; setPassword(""); setConfirmation(""); setLink(failure.code.endsWith("EXPIRADO") ? "expired" : "invalid");
      } else if (failure instanceof AccountError && failure.code === "POLITICA_INCUMPLIDA") {
        setPasswordError(failure.message); setPassword(""); setConfirmation(""); focusFirstInvalid(form);
      } else setMessage(failure instanceof AccountError ? failure.message : "No pudimos confirmar el cambio. Puedes intentar iniciar sesión o solicitar un nuevo enlace.");
    } finally { setBusy(false); }
  }
  if (["invalid", "expired", "success"].includes(link)) return <AuthShell
    title={link === "success" ? "Contraseña actualizada" : link === "expired" ? "Enlace vencido" : "Enlace no válido"}
    description={link === "success" ? "Tu contraseña fue actualizada." : link === "expired" ? "Este enlace venció." : "Este enlace no es válido o ya fue utilizado."}>
    <p className="auth-small-copy">{link === "success" ? "Ahora puedes iniciar sesión con tu nueva contraseña." : link === "expired" ? "Solicita un nuevo enlace para continuar con el restablecimiento." : "Solicita un nuevo enlace para restablecer tu contraseña."}</p>
    {logoutWarning && <p role="alert">La contraseña se actualizó, pero no pudimos confirmar el cierre de la sesión anterior de este navegador.</p>}
    <Link className="button button--primary button--md button--full" href={link === "success" ? "/login" : "/recuperar-contrasena"}>{link === "success" ? "Iniciar sesión" : "Solicitar otro enlace"}</Link>
  </AuthShell>;
  return <AuthShell title="Crea una nueva contraseña" description="Ingresa y confirma tu nueva contraseña para recuperar el acceso.">
    {link === "checking" ? <p role="status">Preparando el formulario…</p> : <form className="auth-form" onSubmit={submit} noValidate>
      {!capabilities.loading && !capabilities.recuperacion && <p className="auth-feedback" role="status">El restablecimiento no está disponible por el momento. Inténtalo más adelante.</p>}
      {message && <p ref={feedback} tabIndex={-1} className="auth-feedback auth-feedback--error" role="alert">{message}</p>}
      <PasswordField label="Nueva contraseña" name="nuevaContrasena" autoComplete="new-password" placeholder="Ingresa una nueva contraseña" value={password} readOnly={busy} error={passwordError}
        onChange={event => { setPassword(event.target.value); setPasswordError(""); }} required />
      {rules.policy ? <PasswordRules policy={rules.policy} value={password} confirmation={confirmation} />
        : <p className="auth-policy-message" role="status">{rules.loading ? "Consultando requisitos de contraseña…" : rules.error}
          {!rules.loading && <button type="button" className="auth-text-link" onClick={rules.retry}>Reintentar requisitos</button>}</p>}
      <PasswordField label="Confirma tu contraseña" name="confirmacion" autoComplete="new-password" placeholder="Repite la nueva contraseña" value={confirmation} readOnly={busy}
        onChange={event => { setConfirmation(event.target.value); setError(""); }} error={error} required />
      <Button type="submit" fullWidth loading={busy} preserveFocusWhileLoading disabled={!rules.policy || !capabilities.recuperacion}>Guardar nueva contraseña</Button>
    </form>}
  </AuthShell>;
}
