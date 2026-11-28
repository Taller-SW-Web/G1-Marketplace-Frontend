import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadListingPrice } from "@/features/catalog/hooks/useListingPrice";
import { fetchProductPrice } from "@/features/catalog/services/product-price.service";
import { fetchProductVariants } from "@/features/catalog/services/product-variants.service";

vi.mock("@/features/catalog/services/product-price.service");
vi.mock("@/features/catalog/services/product-variants.service");

const price = {
  regularAmount: 79.9, saleAmount: null, currency: "PEN", discountPercent: null,
  validFrom: "2026-01-01T00:00:00.000Z", validUntil: null, priceVersion: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("precio del listado", () => {
  it("limita la concurrencia total a cuatro y reutiliza trabajo y resultado por producto", async () => {
    let active = 0;
    let peak = 0;
    const simulateRequest = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    };
    vi.mocked(fetchProductVariants).mockImplementation(async (slug) => {
      await simulateRequest();
      return { data: {
        productId: slug, hasVariants: true, attributes: [],
        variants: [{ variantId: "1", sku: "TEST-SKU", status: "ACTIVE", attributes: {}, image: null }],
      } };
    });
    vi.mocked(fetchProductPrice).mockImplementation(async (slug, sku) => {
      await simulateRequest();
      return { data: { productId: slug, sku: sku!, price }, meta: {
        channel: "MARKETPLACE", retrievedAt: "2026-01-01T00:00:00.000Z",
      } };
    });

    const jobs = Array.from({ length: 9 }, (_, index) => {
      const id = `queue-${index}`;
      return loadListingPrice(id, id);
    });
    expect(loadListingPrice("queue-0", "queue-0")).toBe(jobs[0]);
    expect(await Promise.all(jobs)).toEqual(Array(9).fill({ price, onlySku: "TEST-SKU" }));
    expect(peak).toBe(4);
    expect(loadListingPrice("queue-0", "queue-0")).toBe(jobs[0]);
    expect(fetchProductVariants).toHaveBeenCalledTimes(9);
    expect(fetchProductPrice).toHaveBeenCalledTimes(9);
    expect(fetchProductPrice).toHaveBeenCalledWith("queue-0", "TEST-SKU", expect.any(AbortSignal));
  });

  it("muestra el precio de la primera variante sin ofrecer compra directa si hay varias", async () => {
    vi.mocked(fetchProductVariants).mockResolvedValue({ data: {
      productId: "multi", hasVariants: true, attributes: [],
      variants: [
        { variantId: "1", sku: "SKU-S", status: "ACTIVE", attributes: {}, image: null },
        { variantId: "2", sku: "SKU-M", status: "ACTIVE", attributes: {}, image: null },
      ],
    } });
    vi.mocked(fetchProductPrice).mockResolvedValue({ data: { productId: "multi", sku: "SKU-S", price }, meta: {
      channel: "MARKETPLACE", retrievedAt: "2026-01-01T00:00:00.000Z",
    } });
    await expect(loadListingPrice("multi", "multi")).resolves.toEqual({ price });
    expect(fetchProductPrice).toHaveBeenCalledTimes(1);
    expect(fetchProductPrice).toHaveBeenCalledWith("multi", "SKU-S", expect.any(AbortSignal));
  });

  it("muestra el pendiente cuando no hay SKU y evita una segunda petición", async () => {
    vi.mocked(fetchProductVariants).mockResolvedValue({ data: {
      productId: "no-variant", hasVariants: false, attributes: [], variants: [],
    } });
    await expect(loadListingPrice("no-variant", "no-variant")).resolves.toBeNull();
    expect(fetchProductPrice).not.toHaveBeenCalled();
  });
});
