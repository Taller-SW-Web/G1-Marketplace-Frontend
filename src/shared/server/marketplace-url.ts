// Server configuration only. Container hostnames are never supplied by a browser request.

/** Prefijo publicado por defecto del BFF de G1 (`/api/v1/catalog/...`). */
export const DEFAULT_MARKETPLACE_API_BASE_PATH = "/api/v1";

/** Segmentos tolerados en el prefijo: sin `..`, sin barras duplicadas ni query. */
const BASE_PATH_PATTERN = /^(?:\/[A-Za-z0-9._~-]+)+$/u;

/**
 * Origen del BFF validado.
 *
 * Sólo se acepta un origen sin credenciales, query, hash ni ruta. El prefijo
 * publicado se configura aparte con `MARKETPLACE_API_BASE_PATH` para que APIM
 * pueda publicar `/v1` o `/api/v1` sin relajar esta comprobación.
 */
export function marketplaceApiUrl(): URL {
  const url = new URL(process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000");
  const internalHost = process.env.MARKETPLACE_INTERNAL_HTTP_HOST;
  const loopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  const approvedInternal = Boolean(internalHost && url.hostname === internalHost);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && (loopback || approvedInternal)))) {
    throw new Error("Invalid Marketplace BFF origin");
  }
  return url;
}

/**
 * Prefijo publicado (`/api/v1` por defecto, `/v1` cuando APIM lo publique así).
 *
 * Se valida como ruta absoluta de segmentos seguros: sin `//`, sin `..`, sin
 * query ni fragmento y sin barra final. Un valor inválido no se corrige en
 * silencio: falla la petición y queda visible en el run de evidencia.
 */
export function marketplaceApiBasePath(): string {
  const configured = process.env.MARKETPLACE_API_BASE_PATH;
  const candidate = configured === undefined || configured.trim() === ""
    ? DEFAULT_MARKETPLACE_API_BASE_PATH
    : configured.trim();
  const segments = candidate.split("/");
  if (
    !BASE_PATH_PATTERN.test(candidate) ||
    segments.includes(".") ||
    segments.includes("..")
  ) {
    throw new Error("Invalid Marketplace API base path");
  }
  return candidate;
}

/** Construye una URL del BFF con el prefijo publicado y el origen validado. */
export function marketplaceApiEndpoint(path: string): URL {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${marketplaceApiBasePath()}${suffix}`, marketplaceApiUrl());
}
