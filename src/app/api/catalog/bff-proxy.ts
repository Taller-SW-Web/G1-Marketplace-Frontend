import { marketplaceApiUrl } from "@/shared/server/marketplace-url";

/**
 * Proxy server-only al BFF Marketplace (`/api/v1/catalog/...`).
 *
 * El navegador nunca llama a Productos y Ofertas: toda petición pasa por
 * aquí. Además del reenvío, el proxy participa en la correlación de
 * respuestas del contrato API F-011 (§3/§4):
 *
 * - `X-Request-Id`: se conserva el del consumidor si es seguro; si falta o
 *   es inseguro, se genera uno. Se envía al BFF y se devuelve siempre.
 * - Errores propios del proxy en el mismo sobre `application/problem+json`
 *   (RFC 9457) que devuelve el BFF: `{ type, title, status, code, instance,
 *   requestId }`.
 */

export const dynamic = "force-dynamic";

// Rutas permitidas del proxy:
//   home | products | products/{slug}                       (F-011)
//   products/{slug}/price | variants | availability | recommendations
//                                                          (F-012…F-015)
// El slug se valida con el patrón canónico del contrato antes de salir.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const COMMERCE_SUBPATHS = [
  "price",
  "variants",
  "availability",
  "recommendations",
] as const;
const isProductSlug = (segment: string): boolean =>
  segment.length <= 120 && SLUG_PATTERN.test(segment);
const isAllowedPath = (path: string[]): boolean => {
  if (path.length === 1) return ["home", "products"].includes(path[0]);
  if (path[0] !== "products" || !isProductSlug(path[1] ?? "")) return false;
  if (path.length === 2) return true;
  return (
    path.length === 3 &&
    (COMMERCE_SUBPATHS as readonly string[]).includes(path[2])
  );
};

/** Correlación (API-F011 §3): id opaco de 1–64 caracteres seguros. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/u;

/** Base de identificadores `type` (ejemplo canónico del contrato §4). */
const PROBLEM_TYPE_BASE = "https://marketplace.example.com/problems";

interface ProblemInput {
  status: number;
  code: string;
  title: string;
  instance: string;
  requestId: string;
}

/** Error del proxy en el sobre Problem Details uniforme (RFC 9457). */
function problemResponse(input: ProblemInput): Response {
  const body = {
    type: `${PROBLEM_TYPE_BASE}/${input.code.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
    title: input.title,
    status: input.status,
    code: input.code,
    instance: input.instance,
    requestId: input.requestId,
  };
  return new Response(JSON.stringify(body), {
    status: input.status,
    headers: {
      "Content-Type": "application/problem+json",
      "Cache-Control": "no-store",
      "X-Request-Id": input.requestId,
    },
  });
}

/** Resuelve el id de correlación de la petición entrante. */
function resolveRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id") ?? "";
  return SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
}

/** Reenvía la petición al BFF y normaliza la respuesta hacia el navegador. */
export async function catalogProxyGet(
  request: Request,
  path: string[],
): Promise<Response> {
  const requestId = resolveRequestId(request);
  const instance = new URL(request.url).pathname;

  if (!isAllowedPath(path))
    return problemResponse({
      status: 404,
      code: "NOT_FOUND",
      title: "Ruta del catálogo no disponible.",
      instance,
      requestId,
    });

  try {
    const base = marketplaceApiUrl();
    const url = new URL(`/api/v1/catalog/${path.join("/")}`, base);
    url.search = new URL(request.url).search;
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", "X-Request-Id": requestId },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });
    const body = await response.text();
    JSON.parse(body); // Un cuerpo no-JSON del BFF es un fallo del proxy.
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.ok
          ? "application/json"
          : "application/problem+json",
        "Cache-Control": "no-store",
        "X-Catalog-Source":
          response.headers.get("x-catalog-source") || "UNCONFIGURED",
        // El BFF NestJS devuelve el mismo id correlacionado; si aún no lo
        // hace (versión previa), se conserva el id generado por el proxy.
        "X-Request-Id": response.headers.get("x-request-id") || requestId,
      },
    });
  } catch {
    return problemResponse({
      status: 503,
      code: "CATALOG_UNAVAILABLE",
      title: "No pudimos cargar el catálogo.",
      instance,
      requestId,
    });
  }
}
