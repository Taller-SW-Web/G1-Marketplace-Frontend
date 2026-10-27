"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountCall } from "./account-client";
import { formatMatches, parsePasswordPolicy, policyRequirements, type PasswordPolicy } from "./policy";

export function usePasswordPolicy() {
  const [state, setState] = useState<{ loading: boolean; policy: PasswordPolicy | null; error: string }>({ loading: true, policy: null, error: "" });
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try {
      const policy = parsePasswordPolicy(await accountCall("password/politica", undefined, controller.signal));
      if (!controller.signal.aborted) setState(policy ? { loading: false, policy, error: "" } : { loading: false, policy: null, error: "No pudimos consultar los requisitos de contraseña." });
    } catch { if (!controller.signal.aborted) setState({ loading: false, policy: null, error: "No pudimos consultar los requisitos de contraseña. Inténtalo nuevamente." }); }
  }, []);
  useEffect(() => {
    // Let the reset view scrub its incoming recovery URL before starting requests.
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [reload]);
  return { ...state, retry: () => { setState({ loading: true, policy: null, error: "" }); void reload(); } };
}
export function PasswordRules({ policy, value, confirmation }: { policy: PasswordPolicy; value: string; confirmation?: string }) {
  const format = Boolean(value) && formatMatches(policy, value);
  return <div className="password-rules"><p><strong>Requisitos de contraseña</strong></p>
    {value && <p><img src="/figma/auth/checked.svg" alt="" /><span>Cumplido · Has ingresado una contraseña.</span></p>}
    <p><img src="/figma/auth/pending.svg" alt="" /><span>{format ? "Formato comprobado" : "Pendiente"} · {policyRequirements(policy)}.</span></p>
    {confirmation !== undefined && <p><img src="/figma/auth/pending.svg" alt="" /><span>{confirmation && confirmation === value ? "Coinciden" : "Pendiente · Las contraseñas deben coincidir"}</span></p>}
    <small>Seguridad realiza la validación final{policy.rechazaComunes ? " y rechaza contraseñas comunes" : ""}{policy.rechazaDatosPersonales ? " o que contengan datos personales" : ""}.</small>
  </div>;
}
