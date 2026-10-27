export type PublicUser = { id: string; nombreCompleto: string; roles: string[] };
export type PublicSession = { authenticated: boolean; scope: string; user?: PublicUser };
export const anonymous: PublicSession = { authenticated: false, scope: "anonymous" };
const messages: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña e inténtalo de nuevo.",
  PASSWORD_CADUCADA: "Tu contraseña necesita actualizarse. Solicita su recuperación para continuar.",
  CODIGO_INVALIDO: "El código no es válido. Revísalo e inténtalo de nuevo.",
  OTP_EXPIRADO: "El código o el desafío venció. Vuelve a iniciar sesión.",
  OTP_INTENTOS_AGOTADOS: "Se agotaron los intentos. Vuelve a iniciar sesión.",
  TOKEN_INVALIDO: "El desafío ya no es válido. Vuelve a iniciar sesión.",
  RATE_LIMITED: "Has realizado varios intentos. Espera antes de volver a intentarlo.",
};
export class AccessError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(messages[code] ?? "No pudimos completar el acceso. Inténtalo más tarde.");
  }
}
export async function authCall(action: string, body?: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/v1/auth/${action}`, { cache: "no-store", credentials: "same-origin",
    signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(25000)]), ...(body !== undefined ? { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const result: unknown = await response.json();
  if (!response.ok) throw new AccessError(result && typeof result === "object" && "code" in result && typeof result.code === "string" ? result.code : "AUTH_UNAVAILABLE", response.status);
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new AccessError("AUTH_UNAVAILABLE", 503);
  return result as Record<string, unknown>;
}
export function announceSessionChange() {
  window.dispatchEvent(new Event("g1:session-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("g1-session"); channel.postMessage("changed"); channel.close();
  }
}
export function safeReturn(value: string | null) {
  const unsafe = (text: string) => text.includes("\\") || [...text].some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127);
  if (!value || !value.startsWith("/") || value.startsWith("//") || unsafe(value)) return "/";
  try {
    const parsed = new URL(value, "https://g1.invalid");
    const path = decodeURIComponent(parsed.pathname);
    if (parsed.origin !== "https://g1.invalid" || path.startsWith("//") || unsafe(path)
      || /^\/(api|login|registro|recuperar-contrasena|restablecer-contrasena)(\/|$)/i.test(path)) return "/";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return "/"; }
}
