export type PasswordPolicy = {
  longitudMinima: number; requiereMayuscula: boolean; requiereMinuscula: boolean;
  requiereDigito: boolean; requiereCaracterEspecial: boolean; historial: number;
  rechazaComunes?: boolean; rechazaDatosPersonales?: boolean;
};
export function parsePasswordPolicy(value: unknown): PasswordPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.longitudMinima) || Number(input.longitudMinima) < 1 || Number(input.longitudMinima) > 256
    || !Number.isInteger(input.historial) || Number(input.historial) < 0) return null;
  const flags = ["requiereMayuscula", "requiereMinuscula", "requiereDigito", "requiereCaracterEspecial"] as const;
  if (flags.some(name => typeof input[name] !== "boolean")) return null;
  const policy = { longitudMinima: input.longitudMinima, historial: input.historial,
    ...Object.fromEntries(flags.map(name => [name, input[name]])) } as PasswordPolicy;
  for (const name of ["rechazaComunes", "rechazaDatosPersonales"] as const) {
    if (input[name] !== undefined && typeof input[name] !== "boolean") return null;
    if (typeof input[name] === "boolean") policy[name] = input[name];
  }
  return policy;
}
export function policyRequirements(policy: PasswordPolicy) {
  return [`Al menos ${policy.longitudMinima} caracteres`, ...(policy.requiereMayuscula ? ["una mayúscula"] : []),
    ...(policy.requiereMinuscula ? ["una minúscula"] : []), ...(policy.requiereDigito ? ["un dígito"] : []),
    ...(policy.requiereCaracterEspecial ? ["un carácter especial"] : [])].join(", ");
}
export function formatMatches(policy: PasswordPolicy, value: string) {
  return [...value].length >= policy.longitudMinima
    && (!policy.requiereMayuscula || /\p{Lu}/u.test(value)) && (!policy.requiereMinuscula || /\p{Ll}/u.test(value))
    && (!policy.requiereDigito || /\p{Nd}/u.test(value)) && (!policy.requiereCaracterEspecial || /[^\p{L}\p{N}\s]/u.test(value));
}
