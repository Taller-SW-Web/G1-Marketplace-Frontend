import type { ProductMediaDTO } from "./types/product-detail.types";
import type { VariantImageDTO } from "./types/product-variants.types";

/**
 * Combina la imagen de la variante elegida (F-013) con la galería del producto
 * (F-011) sin perder las demás vistas.
 *
 * La imagen de la variante se coloca primero para que sea la vista principal.
 * Si ya existe en la galería se reutiliza su entrada (no se duplica); si es
 * nueva se añade al inicio con un `mediaId` estable derivado de su URL, de modo
 * que el fallo de carga de una variante no se arrastre a otra.
 *
 * Devuelve el mismo arreglo cuando no hay imagen de variante, para conservar la
 * identidad que usa la galería al reiniciar su selección.
 */
export function withVariantImage(
  media: ProductMediaDTO[],
  image: VariantImageDTO | null | undefined,
): ProductMediaDTO[] {
  if (!image?.url) return media;

  const existingIndex = media.findIndex((item) => item.url === image.url);
  if (existingIndex === 0) return media;
  if (existingIndex > 0) {
    const reordered = [...media];
    const [match] = reordered.splice(existingIndex, 1);
    return [match, ...reordered];
  }

  const variantMedia: ProductMediaDTO = {
    mediaId: `variant-${image.url}`,
    type: "IMAGE",
    url: image.url,
    alt: image.alt,
    displayOrder: 0,
  };
  return [variantMedia, ...media];
}
