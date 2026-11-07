import { describe, expect, it } from "vitest";
import { withVariantImage } from "../../src/features/catalog/galleryMedia";
import type { ProductMediaDTO } from "../../src/features/catalog/types/product-detail.types";

const MEDIA: ProductMediaDTO[] = [
  {
    mediaId: "MED-001",
    type: "IMAGE",
    url: "https://cdn.test/1.jpg",
    alt: "Vista frontal",
    displayOrder: 1,
  },
  {
    mediaId: "MED-002",
    type: "IMAGE",
    url: "https://cdn.test/2.jpg",
    alt: "Vista lateral",
    displayOrder: 2,
  },
];

describe("withVariantImage (F-013 → F-011)", () => {
  it("sin imagen de variante conserva la misma referencia", () => {
    expect(withVariantImage(MEDIA, null)).toBe(MEDIA);
    expect(withVariantImage(MEDIA, undefined)).toBe(MEDIA);
  });

  it("antepone la imagen nueva de la variante sin perder la galería", () => {
    const result = withVariantImage(MEDIA, {
      url: "https://cdn.test/variante.jpg",
      alt: "Variante negro",
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      mediaId: "variant-https://cdn.test/variante.jpg",
      type: "IMAGE",
      url: "https://cdn.test/variante.jpg",
      alt: "Variante negro",
    });
    expect(result.slice(1)).toEqual(MEDIA);
  });

  it("reutiliza la entrada existente en vez de duplicarla y la mueve al inicio", () => {
    const result = withVariantImage(MEDIA, {
      url: "https://cdn.test/2.jpg",
      alt: "Vista lateral",
    });

    expect(result).toHaveLength(2);
    expect(result[0].mediaId).toBe("MED-002");
    expect(result[1].mediaId).toBe("MED-001");
  });

  it("no reordena si la imagen ya es la principal", () => {
    expect(
      withVariantImage(MEDIA, {
        url: "https://cdn.test/1.jpg",
        alt: "Vista frontal",
      }),
    ).toBe(MEDIA);
  });
});
