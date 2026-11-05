export class AccountError extends Error {
  constructor(readonly code: string, readonly status: number, readonly retryAfterSeconds?: number) {
    const messages: Record<string, string> = {
      AUTH_OPERATION_UNAVAILABLE: "Esta función todavía no está disponible. Inténtalo más adelante.",
      AUTH_UNAVAILABLE: "No pudimos confirmar la operación. Inténtalo más tarde.",
      CORREO_NO_DISPONIBLE: "No pudimos completar el registro con esos datos. Revisa la información o intenta recuperar el acceso.",
      POLITICA_INCUMPLIDA: "Seguridad no aceptó esta contraseña. Revisa los requisitos y elige una diferente.",
      DEMASIADAS_SOLICITUDES: "Has realizado varias solicitudes. Espera antes de volver a intentarlo.",
      RATE_LIMITED: "Has realizado varios intentos. Espera antes de continuar.",
      TOKEN_RECUPERACION_INVALIDO: "Este enlace no es válido o ya se utilizó. Solicita otro enlace.",
      TOKEN_RECUPERACION_EXPIRADO: "Este enlace venció. Solicita otro enlace para continuar.",
      VALIDACION: "Revisa la información del formulario.",
    };
    super(messages[code] ?? "No pudimos confirmar la operación. Inténtalo más tarde.");
  }
}
export async function accountCall(action: string, body?: unknown, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  const response = await fetch(`/api/v1/${action}`, { cache: "no-store", credentials: "same-origin", referrerPolicy: "no-referrer",
    signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(25000)]),
    ...(body !== undefined ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (response.status === 204) return null;
  const value: unknown = await response.json();
  if (!response.ok) throw new AccountError(value && typeof value === "object" && "code" in value && typeof value.code === "string" ? value.code : "AUTH_UNAVAILABLE", response.status,
    value && typeof value === "object" && "retryAfterSeconds" in value && typeof value.retryAfterSeconds === "number" ? value.retryAfterSeconds : undefined);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccountError("AUTH_UNAVAILABLE", 503);
  return value as Record<string, unknown>;
}
