"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AuthShell } from "./AuthShell";
import { PasswordField } from "./PasswordField";
import { usePasswordPolicy } from "./PasswordRules";
import { passwordIssues, policyRequirements, type PasswordPolicy } from "./policy";
import { accountCall, AccountError } from "./account-client";
import { useAccountCapabilities } from "./useAccountCapabilities";
import { useAuth } from "./AuthProvider";
import { focusFirstInvalid } from "./form-focus";

const initial = { nombres: "", apellidos: "", correo: "", celular: "", contrasena: "", confirmacion: "", aceptaTerminos: false };
type Values = typeof initial;
type Field = keyof Values;
const fields: Field[] = ["nombres", "apellidos", "correo", "celular", "contrasena", "confirmacion", "aceptaTerminos"];
const normalizedCelular = (value: string) => /^[0-9]{9}$/.test(value.trim()) ? `+51${value.trim()}` : value.trim();

// Red messages under each field, recomputed on every change once the field was touched.
function fieldErrors(name: Field, values: Values, policy: PasswordPolicy | null): string[] {
  switch (name) {
    case "nombres": case "apellidos": {
      const value = values[name].trim();
      if (!value) return [name === "nombres" ? "Ingresa tus nombres." : "Ingresa tus apellidos."];
      return value.length > 100 ? ["Usa como máximo 100 caracteres."] : [];
    }
    case "correo":
      if (!values.correo.trim()) return ["Ingresa tu correo electrónico."];
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo.trim()) ? [] : ["Ingresa un correo electrónico válido."];
    case "celular":
      return /^\+51[0-9]{9}$/.test(normalizedCelular(values.celular)) ? [] : ["Ingresa nueve dígitos, con el prefijo +51 si lo incluyes."];
    case "contrasena":
      if (!values.contrasena) return ["Ingresa una contraseña."];
      return policy ? passwordIssues(policy, values.contrasena) : [];
    case "confirmacion":
      if (!values.confirmacion) return ["Confirma tu contraseña."];
      return values.confirmacion === values.contrasena ? [] : ["Las contraseñas no coinciden."];
    case "aceptaTerminos":
      return values.aceptaTerminos ? [] : ["Debes aceptar los términos y la política de privacidad."];
  }
}
export function RegistrationForm({ termsUrl = "", privacyUrl = "" }: { termsUrl?: string; privacyUrl?: string }) {
  const { session } = useAuth();
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message && !busy) feedback.current?.focus(); }, [message, busy]);
  const rules = usePasswordPolicy();
  const capabilities = useAccountCapabilities();
  const legalReady = Boolean(termsUrl && privacyUrl);
  useEffect(() => { if (session.authenticated) window.location.replace("/"); }, [session.authenticated]);
  const shown = (name: Field) => serverErrors[name] ? [serverErrors[name]] : touched[name] ? fieldErrors(name, values, rules.policy) : [];
  const touch = (name: Field) => setTouched(previous => previous[name] ? previous : { ...previous, [name]: true });
  function change(name: Field, value: string | boolean) {
    setValues(previous => ({ ...previous, [name]: value }));
    setServerErrors(previous => previous[name] ? { ...previous, [name]: undefined } : previous);
    // Password rules show from the first keystroke; other fields wait for blur.
    if (name === "contrasena" || name === "confirmacion" || name === "aceptaTerminos") touch(name);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !rules.policy || !capabilities.registro || !legalReady) return;
    const form = event.currentTarget;
    setTouched(Object.fromEntries(fields.map(name => [name, true])));
    setServerErrors({}); setMessage("");
    if (fields.some(name => fieldErrors(name, values, rules.policy).length)) { focusFirstInvalid(form); return; }
    const celular = normalizedCelular(values.celular);
    setBusy(true);
    try {
      const result = await accountCall("auth/registro", { nombres: values.nombres.trim(), apellidos: values.apellidos.trim(), correo: values.correo.trim(),
        celular, contrasena: values.contrasena, aceptaTerminos: true });
      if (result?.estado !== "PENDIENTE_VERIFICACION") throw new AccountError("AUTH_UNAVAILABLE", 503);
      setValues(initial); setTouched({}); setAccepted(true);
    } catch (error) {
      if (error instanceof AccountError && error.code === "POLITICA_INCUMPLIDA") {
        setServerErrors({ contrasena: error.message });
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
        <TextField label="Nombres" name="nombres" autoComplete="given-name" placeholder="Ingresa tus nombres" maxLength={100} value={values.nombres} onChange={event => change("nombres", event.target.value)} error={shown("nombres")[0]} onBlur={() => touch("nombres")} readOnly={busy} required />
        <TextField label="Apellidos" name="apellidos" autoComplete="family-name" placeholder="Ingresa tus apellidos" maxLength={100} value={values.apellidos} onChange={event => change("apellidos", event.target.value)} error={shown("apellidos")[0]} onBlur={() => touch("apellidos")} readOnly={busy} required />
      </div>
      <TextField label="Correo electrónico" name="correo" type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" maxLength={254} value={values.correo} onChange={event => change("correo", event.target.value)} error={shown("correo")[0]} onBlur={() => touch("correo")} readOnly={busy} required />
      <TextField label="Celular" name="celular" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ingresa tu número de celular" maxLength={12} value={values.celular} onChange={event => change("celular", event.target.value)} error={shown("celular")[0]} onBlur={() => touch("celular")} readOnly={busy} required />
      <div className="auth-field-row">
        <PasswordField label="Contraseña" name="contrasena" autoComplete="new-password" placeholder="Crea tu contraseña" value={values.contrasena} onChange={event => change("contrasena", event.target.value)} errors={shown("contrasena")} onBlur={() => touch("contrasena")} readOnly={busy} required
          hint={rules.policy && !values.contrasena && !shown("contrasena").length ? `Usa ${policyRequirements(rules.policy).toLowerCase()}.` : undefined} />
        <PasswordField label="Confirmar contraseña" name="confirmacion" autoComplete="new-password" placeholder="Repite tu contraseña" value={values.confirmacion} onChange={event => change("confirmacion", event.target.value)} errors={shown("confirmacion")} onBlur={() => { if (values.confirmacion) touch("confirmacion"); }} readOnly={busy} required />
      </div>
      {!rules.policy && <div className="auth-policy-message" role="status">{rules.loading ? "Consultando requisitos de contraseña…" : rules.error}
          {!rules.loading && <button type="button" className="auth-text-link" onClick={rules.retry}>Reintentar requisitos</button>}</div>}
      <div><label className="auth-consent"><input name="aceptaTerminos" type="checkbox" checked={values.aceptaTerminos} disabled={!legalReady} aria-disabled={busy || undefined} onClick={event => { if (busy) event.preventDefault(); }} onChange={event => { if (!busy) change("aceptaTerminos", event.target.checked); }} aria-invalid={shown("aceptaTerminos").length ? true : undefined} aria-describedby={shown("aceptaTerminos").length ? "consent-error" : undefined} />
        <span>Acepto los {termsUrl ? <a href={termsUrl} target="_blank" rel="noopener noreferrer">términos</a> : "términos"} y la {privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer">política de privacidad</a> : "política de privacidad"}.</span></label>
        {shown("aceptaTerminos").length > 0 && <p className="field-error" id="consent-error" role="alert">{shown("aceptaTerminos")[0]}</p>}
        {!legalReady && <p className="field-hint">Los documentos de términos y privacidad todavía no están disponibles. El registro permanecerá deshabilitado.</p>}
      </div>
      <Button type="submit" loading={busy} preserveFocusWhileLoading fullWidth loadingLabel="" disabled={!capabilities.registro || !rules.policy || !legalReady}>{busy ? "Creando cuenta…" : "Crear cuenta"}</Button>
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
