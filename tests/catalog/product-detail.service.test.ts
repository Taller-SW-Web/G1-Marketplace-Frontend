import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProductDetailError,
  fetchProductDetail,
  isValidMedia,
  isValidProductSlug,
} from "../../src/features/catalog/services/product-detail.service";
import { MOCK_PRODUCT_SIMPLE } from "../../src/features/catalog/fixtures/product-detail.fixture";

/** Respuesta mínima con la superficie que usa el servicio. */
const asResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

async function expectFailure(
  promise: Promise<unknown>,
  code: string,
  status: number,
): Promise<void> {
  try {
    await promise;
    throw new Error("La consulta no falló como esperaba el contrato");
  } catch (error) {
    expect(error).toBeInstanceOf(ProductDetailError);
    expect((error as ProductDetailError).code).toBe(code);
    expect((error as ProductDetailError).status).toBe(status);
  }
}

const MEDIA_CASES: Array<{
  title: string;
  media: unknown;
  valid: boolean;
}> = [
  {
    title: "acepta IMAGE con URL HTTPS, alt y orden válido",
    media: MOCK_PRODUCT_SIMPLE.data.media[0],
    valid: true,
  },
  {
    title: "rechaza URL no HTTPS",
    media: {
      mediaId: "MED-HTTP",
      type: "IMAGE",
      url: "http://insecure.example/a.png",
      alt: "Vista",
      displayOrder: 1,
    },
    valid: false,
  },
  {
    title: "rechaza alt vacío",
    media: {
      mediaId: "MED-ALT",
      type: "IMAGE",
      url: "https://cdn.example/a.png",
      alt: "   ",
      displayOrder: 1,
    },
    valid: false,
  },
  {
    title: "rechaza tipo distinto de IMAGE",
    media: {
      mediaId: "MED-TYPE",
      type: "VIDEO",
      url: "https://cdn.example/a.mp4",
      alt: "Clip",
      displayOrder: 1,
    },
    valid: false,
  },
  {
    title: "rechaza orden negativo",
    media: {
      mediaId: "MED-ORDER",
      type: "IMAGE",
      url: "https://cdn.example/a.png",
      alt: "Vista",
      displayOrder: -1,
    },
    valid: false,
  },
];

describe("isValidMedia (API-CA-F011-04)", () => {
  for (const { title, media, valid } of MEDIA_CASES) {
    it(title, () => {
      expect(isValidMedia(media as never)).toBe(valid);
    });
  }

  it("descarta medios inválidos y conserva los válidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        asResponse({
          ...MOCK_PRODUCT_SIMPLE,
          data: {
            ...MOCK_PRODUCT_SIMPLE.data,
            media: [
              ...MOCK_PRODUCT_SIMPLE.data.media,
              {
                mediaId: "MED-HTTP",
                type: "IMAGE",
                url: "http://insecure.example/a.png",
                alt: "Insegura",
                displayOrder: 3,
              },
              {
                mediaId: "MED-VIDEO",
                type: "VIDEO",
                url: "https://cdn.example/a.mp4",
                alt: "Clip",
                displayOrder: 4,
              },
            ],
          },
        }),
      ),
    );

    const result = await fetchProductDetail("zapatillas-running-aero-x");
    expect(result.data.media.map((item) => item.mediaId)).toEqual([
      "MED-001",
      "MED-002",
    ]);
  });

  it("si ningún medio es válido responde 502 INVALID_RESPONSE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        asResponse({
          ...MOCK_PRODUCT_SIMPLE,
          data: {
            ...MOCK_PRODUCT_SIMPLE.data,
            media: [
              {
                mediaId: "MED-ONLY-HTTP",
                type: "IMAGE",
                url: "http://insecure.example/a.png",
                alt: "Insegura",
                displayOrder: 1,
              },
            ],
          },
        }),
      ),
    );

    await expectFailure(
      fetchProductDetail("zapatillas-running-aero-x"),
      "PRODUCT_CATALOG_INVALID_RESPONSE",
      502,
    );
  });
});

describe("fetchProductDetail — validación de entrada", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no consulta el BFF con un slug inválido", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expectFailure(
      fetchProductDetail("Slug con espacios"),
      "INVALID_PRODUCT_SLUG",
      400,
    );
    await expectFailure(
      fetchProductDetail(`slug-${"a".repeat(120)}`),
      "INVALID_PRODUCT_SLUG",
      400,
    );
    await expectFailure(
      fetchProductDetail("ruta/con-barras"),
      "INVALID_PRODUCT_SLUG",
      400,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mapea los códigos HTTP del contrato a ProductDetailErrorCode", async () => {
    const casos = [
      [400, "INVALID_PRODUCT_SLUG"],
      [404, "PRODUCT_NOT_AVAILABLE"],
      [502, "PRODUCT_CATALOG_INVALID_RESPONSE"],
      [503, "PRODUCT_CATALOG_UNAVAILABLE"],
      [504, "PRODUCT_CATALOG_TIMEOUT"],
    ] as const;

    for (const [status, code] of casos) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => asResponse({}, status)),
      );
      await expectFailure(
        fetchProductDetail("zapatillas-running-aero-x"),
        code,
        status,
      );
      vi.unstubAllGlobals();
    }
  });

  it("una respuesta sin medios válidos no se muestra como ficha parcial", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        asResponse({
          ...MOCK_PRODUCT_SIMPLE,
          data: { ...MOCK_PRODUCT_SIMPLE.data, media: [] },
        }),
      ),
    );

    await expectFailure(
      fetchProductDetail("zapatillas-running-aero-x"),
      "PRODUCT_CATALOG_INVALID_RESPONSE",
      502,
    );
  });
});

describe("isValidProductSlug (contrato API-F011-001)", () => {
  it("acepta el patrón canónico de 1 a 120 caracteres", () => {
    expect(isValidProductSlug("zapatillas-running-aero-x")).toBe(true);
    expect(isValidProductSlug("a")).toBe(true);
    expect(isValidProductSlug(`slug-${"b".repeat(115)}`)).toBe(true);
  });

  it("rechaza vacíos, mayúsculas, espacios, barras y longitudes fuera de rango", () => {
    expect(isValidProductSlug("")).toBe(false);
    expect(isValidProductSlug("Zapatillas")).toBe(false);
    expect(isValidProductSlug("con espacios")).toBe(false);
    expect(isValidProductSlug("con/barras")).toBe(false);
    expect(isValidProductSlug(`slug-${"c".repeat(120)}`)).toBe(false);
  });
});
