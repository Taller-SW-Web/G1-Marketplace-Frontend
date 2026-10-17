/**
 * Validador InternalPath del handoff `?returnTo=...` (ProductCard → ficha).
 *
 * ELEMENTOS-COMPARTIDOS.md §4: "El receptor debe validar returnTo como ruta
 * interna permitida antes de usarlo: encodeURIComponent codifica, no autoriza
 * destinos ni reemplaza el validador InternalPath pendiente."
 *
 * Sólo se aceptan rutas internas: prefijo única `/` (sin `//` ni `/\`), sin
 * caracteres de control y con longitud razonable. Cualquier otro valor cae al
 * destino por defecto `/catalogo` (F-011 UI: "Volver al catálogo" → `/catalogo`).
 */

/** Destino por defecto cuando no hay returnTo válido (spec F-011 UI). */
export const DEFAULT_RETURN_TO = "/catalogo";

const MAX_RETURN_TO_LENGTH = 512;

/** Detecta caracteres de control (U+0000–U+001F, U+007F) sin usar regex. */
const hasControlChars = (value: string): boolean =>
  Array.from(value).some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code <= 0x1f || code === 0x7f;
  });

/**
 * Valida `returnTo` como ruta interna permitida.
 *
 * @param {string} [value] - Valor crudo de `searchParams.returnTo`
 * @returns {string} Ruta interna válida o `/catalogo` si falta/rechazada
 */
export function sanitizeReturnTo(value: string | undefined): string {
  if (typeof value !== "string") return DEFAULT_RETURN_TO;
  if (value.length === 0 || value.length > MAX_RETURN_TO_LENGTH) {
    return DEFAULT_RETURN_TO;
  }
  // Sólo rutas internas: descarta `https:`, `javascript:`, `data:`…
  if (!value.startsWith("/")) return DEFAULT_RETURN_TO;
  // Rutas relativas al host (`//evil.test`) y variantes con backslash.
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_RETURN_TO;
  if (value.includes("\\")) return DEFAULT_RETURN_TO;
  if (hasControlChars(value)) return DEFAULT_RETURN_TO;
  return value;
}

/**
 * Variante para destinos etiquetados "Catálogo": conserva los criterios
 * previos sólo cuando `returnTo` apunta al catálogo (`/catalogo` con query o
 * fragment opcional); en cualquier otro caso, catálogo general.
 * Ver V-007 (ficha): "Migas → Catálogo … Criterios previos cuando existan;
 * si no, catálogo general."
 *
 * @param {string} [value] - Valor crudo de `searchParams.returnTo`
 * @returns {string} `/catalogo` con criterios o `/catalogo` general
 */
export function sanitizeCatalogReturnTo(value: string | undefined): string {
  const href = sanitizeReturnTo(value);
  if (href === DEFAULT_RETURN_TO) return DEFAULT_RETURN_TO;
  if (href.startsWith("/catalogo?") || href.startsWith("/catalogo#")) {
    return href;
  }
  return DEFAULT_RETURN_TO;
}
