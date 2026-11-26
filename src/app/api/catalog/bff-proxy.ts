import { marketplaceApiEndpoint } from "@/shared/server/marketplace-url";

/**
 * Proxy server-only al BFF Marketplace (`/api/v1/catalog/...`).
 *
 * El navegador nunca llama a Productos y Ofertas: toda petición pasa por
 * aquí. Además del reenvío, el proxy participa en la correlación de
 * respuestas del contrato API F-011 (§3/§4):
 *
 * - `X-Request-Id`: se conserva el del consumidor si es seguro; si falta o
 *   es inseguro, se genera uno. Se envía al BFF y se devuelve siempre.
 * - `traceparent` (W3C): se propaga el contexto entrante válido o se genera
 *   uno nuevo. Permite unir la petición de la web con la entrada en APIM y la
 *   salida al BFF en el mismo trazo (FE #140).
 * - El prefijo publicado (`MARKETPLACE_API_BASE_PATH`) se configura aparte
 *   del origen: APIM puede publicar `/v1` sin aceptar rutas arbitrarias.
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
  if (path.length === 1) return ["home", "products", "filters"].includes(path[0]);
  if (path[0] !== "products" || !isProductSlug(path[1] ?? "")) return false;
  if (path.length === 2) return true;
  return (
    path.length === 3 &&
    (COMMERCE_SUBPATHS as readonly string[]).includes(path[2])
  );
};

/** Correlación (API-F011 §3): id opaco de 1–64 caracteres seguros. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/u;

/** `traceparent` W3C válido (versión 00, ids hexadecimales, flags 00/01). */
const TRACEPARENT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/u;

/** Base de identificadores `type` (ejemplo canónico del contrato §4). */
const PROBLEM_TYPE_BASE = "https://marketplace.example.com/problems";

interface ProblemInput {
  status: number;
  code: string;
  title: string;
  instance: string;
  requestId: string;
  traceparent?: string;
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
      ...(input.traceparent ? { traceparent: input.traceparent } : {}),
    },
  });
}

/** Resuelve el id de correlación de la petición entrante. */
function resolveRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id") ?? "";
  return SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
}

/**
 * Contexto de trazo W3C. Si el navegador o APIM ya envían uno válido se
 * reutiliza; si no, se genera aquí para que APIM y el BFF registren el mismo
 * `traceparent`. El flag se conserva en `01` para que el tramo se muestree.
 */
function resolveTraceparent(request: Request): string {
  const incoming = request.headers.get("traceparent") ?? "";
  if (TRACEPARENT.test(incoming)) return incoming;
  const traceId = crypto.randomUUID().replace(/-/gu, "");
  const spanId = crypto.randomUUID().replace(/-/gu, "").slice(0, 16);
  return `00-${traceId}-${spanId}-01`;
}

// Server-only runtime budget. Keep the normal 8s limit unless explicitly set.
function catalogBffTimeoutMs(): number {
  const configured = process.env.CATALOG_BFF_TIMEOUT_MS ?? "";
  if (!/^\d+$/.test(configured)) return 8000;
  const timeout = Number(configured);
  return Number.isSafeInteger(timeout) && timeout >= 1000 && timeout <= 30000
    ? timeout
    : 8000;
}

/** Reenvía la petición al BFF y normaliza la respuesta hacia el navegador. */
export async function catalogProxyGet(
  request: Request,
  path: string[],
): Promise<Response> {
  const requestId = resolveRequestId(request);
  const traceparent = resolveTraceparent(request);
  const instance = new URL(request.url).pathname;

  if (!isAllowedPath(path))
    return problemResponse({
      status: 404,
      code: "NOT_FOUND",
      title: "Ruta del catálogo no disponible.",
      instance,
      requestId,
      traceparent,
    });

  let timeoutSignal: AbortSignal | undefined;
  try {
    const url = marketplaceApiEndpoint(`/catalog/${path.join("/")}`);
    url.search = new URL(request.url).search;
    timeoutSignal = AbortSignal.timeout(catalogBffTimeoutMs());
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "X-Request-Id": requestId,
        traceparent,
      },
      signal: AbortSignal.any([request.signal, timeoutSignal]),
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
        traceparent:
          response.headers.get("traceparent") || traceparent,
      },
    });
  } catch (error: unknown) {
    const timedOut = !request.signal.aborted && (timeoutSignal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "TimeoutError"));
    return problemResponse({
      status: 503,
      code: timedOut ? "CATALOG_TIMEOUT" : "CATALOG_UNAVAILABLE",
      title: timedOut ? "El catálogo tardó demasiado en responder." : "No pudimos cargar el catálogo.",
      instance,
      requestId,
      traceparent,
    });
  }
}
