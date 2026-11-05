"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AuthShell } from "./AuthShell";
import { PasswordField } from "./PasswordField";
import { PasswordRules, usePasswordPolicy } from "./PasswordRules";
import { formatMatches } from "./policy";
import { accountCall, AccountError } from "./account-client";
import { useAccountCapabilities } from "./useAccountCapabilities";
import { useAuth } from "./AuthProvider";
import { focusFirstInvalid } from "./form-focus";

const initial = { nombres: "", apellidos: "", correo: "", celular: "", contrasena: "", confirmacion: "", aceptaTerminos: false };
export function RegistrationForm({ termsUrl = "", privacyUrl = "" }: { termsUrl?: string; privacyUrl?: string }) {
  const { session } = useAuth();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message && !busy) feedback.current?.focus(); }, [message, busy]);
  const rules = usePasswordPolicy();
  const capabilities = useAccountCapabilities();
  const legalReady = Boolean(termsUrl && privacyUrl);
  useEffect(() => { if (session.authenticated) window.location.replace("/"); }, [session.authenticated]);
  function change(name: keyof typeof initial, value: string | boolean) {
    setValues(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: "" }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !rules.policy || !capabilities.registro || !legalReady) return;
    const form = event.currentTarget;
    const next: Record<string, string> = {};
    for (const name of ["nombres", "apellidos"] as const) if (!values[name].trim() || values[name].length > 100) next[name] = "Ingresa este dato (máximo 100 caracteres).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo.trim())) next.correo = "Ingresa un correo electrónico válido.";
    const celular = /^[0-9]{9}$/.test(values.celular.trim()) ? `+51${values.celular.trim()}` : values.celular.trim();
    if (!/^\+51[0-9]{9}$/.test(celular)) next.celular = "Ingresa nueve dígitos, con el prefijo +51 si lo incluyes.";
    if (!formatMatches(rules.policy, values.contrasena)) next.contrasena = "Revisa los requisitos de formato.";
    if (!values.confirmacion || values.confirmacion !== values.contrasena) next.confirmacion = "Las contraseñas deben coincidir.";
    if (!values.aceptaTerminos) next.aceptaTerminos = "Debes aceptar los términos y la política de privacidad.";
    setErrors(next); setMessage(""); if (Object.keys(next).length) { focusFirstInvalid(form); return; }
    setBusy(true);
    try {
      const result = await accountCall("auth/registro", { nombres: values.nombres.trim(), apellidos: values.apellidos.trim(), correo: values.correo.trim(),
        celular, contrasena: values.contrasena, aceptaTerminos: true });
      if (result?.estado !== "PENDIENTE_VERIFICACION") throw new AccountError("AUTH_UNAVAILABLE", 503);
      setValues(initial); setAccepted(true);
    } catch (error) {
      if (error instanceof AccountError && error.code === "POLITICA_INCUMPLIDA") {
        setErrors({ contrasena: error.message });
        setValues(previous => ({ ...previous, contrasena: "", confirmacion: "" }));
        focusFirstInvalid(form);
      } else setMessage(error instanceof AccountError ? error.message : "No pudimos confirmar tu solicitud. Revisa tu correo antes de volver a intentarlo.");
    }
    finally { setBusy(false); }
  }
  if (accepted) return <RegistrationAccepted />;
  return <AuthShell wide title="Crea tu cuenta" description="Compra, guarda favoritos y consulta tus pedidos. Después del registro, verifica tu correo para activar tu cuenta.">
    {message && <p ref={feedback} tabIndex={-1} className="auth-feedback auth-feedback--error" role="alert">{message}</p>}
    {!capabilities.loading && !capabilities.registro && <p className="auth-feedback" role="status">El registro no está disponible por el momento. Puedes volver a intentarlo más adelante.</p>}
    <form className="auth-form registration-form" onSubmit={submit} noValidate>
      <div className="auth-field-row">
        <TextField label="Nombres" name="nombres" autoComplete="given-name" placeholder="Ingresa tus nombres" maxLength={100} value={values.nombres} onChange={event => change("nombres", event.target.value)} error={errors.nombres} readOnly={busy} required />
        <TextField label="Apellidos" name="apellidos" autoComplete="family-name" placeholder="Ingresa tus apellidos" maxLength={100} value={values.apellidos} onChange={event => change("apellidos", event.target.value)} error={errors.apellidos} readOnly={busy} required />
      </div>
      <TextField label="Correo electrónico" name="correo" type="email" autoComplete="email" placeholder="nombre@correo.com" maxLength={254} value={values.correo} onChange={event => change("correo", event.target.value)} error={errors.correo} readOnly={busy} required />
      <TextField label="Celular" name="celular" type="tel" autoComplete="tel" placeholder="Ingresa tu número de celular" maxLength={12} value={values.celular} onChange={event => change("celular", event.target.value)} error={errors.celular} readOnly={busy} required />
      <div className="auth-field-row">
        <PasswordField label="Contraseña" name="contrasena" autoComplete="new-password" placeholder="Crea tu contraseña" value={values.contrasena} onChange={event => change("contrasena", event.target.value)} error={errors.contrasena} readOnly={busy} required />
        <PasswordField label="Confirmar contraseña" name="confirmacion" autoComplete="new-password" placeholder="Repite tu contraseña" value={values.confirmacion} onChange={event => change("confirmacion", event.target.value)} error={errors.confirmacion} readOnly={busy} required />
      </div>
      {rules.policy ? values.contrasena ? <PasswordRules policy={rules.policy} value={values.contrasena} confirmation={values.confirmacion} /> : <p className="auth-policy-message">Usa una contraseña segura y diferente de la de otras cuentas.</p>
        : <div className="auth-policy-message" role="status">{rules.loading ? "Consultando requisitos de contraseña…" : rules.error}
          {!rules.loading && <button type="button" className="auth-text-link" onClick={rules.retry}>Reintentar requisitos</button>}</div>}
      <div><label className="auth-consent"><input name="aceptaTerminos" type="checkbox" checked={values.aceptaTerminos} disabled={!legalReady} aria-disabled={busy || undefined} onClick={event => { if (busy) event.preventDefault(); }} onChange={event => { if (!busy) change("aceptaTerminos", event.target.checked); }} aria-invalid={errors.aceptaTerminos ? true : undefined} aria-describedby={errors.aceptaTerminos ? "consent-error" : undefined} />
        <span>Acepto los {termsUrl ? <a href={termsUrl} target="_blank" rel="noopener noreferrer">términos</a> : "términos"} y la {privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer">política de privacidad</a> : "política de privacidad"}.</span></label>
        {errors.aceptaTerminos && <p className="field-error" id="consent-error" role="alert">{errors.aceptaTerminos}</p>}
        {!legalReady && <p className="field-hint">Los documentos de términos y privacidad todavía no están disponibles. El registro permanecerá deshabilitado.</p>}
      </div>
      <Button type="submit" loading={busy} preserveFocusWhileLoading fullWidth disabled={!capabilities.registro || !rules.policy || !legalReady}>Crear cuenta</Button>
    </form>
    <p className="auth-register">¿Ya tienes una cuenta? <Link className="auth-text-link" href="/login">Iniciar sesión</Link></p>
  </AuthShell>;
}
export function RegistrationAccepted() {
  return <AuthShell compact title="Revisa tu correo" description="Tu solicitud fue aceptada. Verifica tu correo para activar tu cuenta.">
    <p className="auth-feedback auth-feedback--info">La sesión aún no está iniciada. Después de verificar tu correo, podrás iniciar sesión.</p>
    <p>Abre el enlace en Seguridad para verificar tu cuenta y regresar al login de Marketplace. Revisa también la carpeta de spam.</p>
    <Link className="button button--primary button--md button--full" href="/login">Ir a iniciar sesión</Link>
  </AuthShell>;
}
