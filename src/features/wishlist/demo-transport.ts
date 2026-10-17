import { WishlistError } from "./api";
import type { FavoriteProduct } from "./contract";
import type { FavoritesTransport } from "./transport";

export const scenarios = {
  lista: "Con favoritos", vacio: "Lista vacía", cargando: "Cargando", "error-catalogo": "Error de catálogo",
  agotados: "Sin existencias", retirado: "Producto retirado", quitando: "Quitando producto", "error-quitar": "Error al quitar",
  eliminado: "Eliminado / Deshacer", restaurando: "Restaurando", restaurado: "Restauración confirmada", "error-restaurar": "No restaurado",
  "sesion-vencida": "Sesión vencida",
} as const;
export type Scenario = keyof typeof scenarios;
export const isScenario = (value: unknown): value is Scenario => typeof value === "string" && Object.hasOwn(scenarios, value);
const fixture = (id: string, name: string, slug: string, brand: string, file: string, amount: number, color: string, index: number): FavoriteProduct => ({
  productId: id, name, slug, brandLabel: brand, image: { url: `/figma/${file}`, alt: name }, availability: "in_stock",
  price: { amount, currency: "PEN" }, color, createdAt: `2026-10-16T12:00:0${9 - index}.000Z`,
});
export const demoProducts: FavoriteProduct[] = [
  fixture("preview-1", "Nike Air Zoom Pegasus 41", "nike-air-zoom-pegasus-41", "NOVA SELECT", "favorite-pegasus.png", 349.9, "Negro / Naranja", 0),
  fixture("preview-2", "Terrex Swift R3 GTX", "terrex-swift-r3-gtx", "ADIDAS", "favorite-terrex.png", 429.9, "Oliva / Negro", 1),
  fixture("preview-3", "Trail Series 710 ml", "trail-series-710-ml", "HYDRO FLASK", "favorite-bottle.png", 89.9, "Arcilla", 2),
];
const vest = fixture("preview-4", "Nano Puff Vest", "nano-puff-vest", "PATAGONIA", "favorite-vest.png", 699.9, "Azul marino", 3);

export function createDemoTransport(scenario: Scenario) {
  let items = scenario === "vacio" ? [] : structuredClone(demoProducts);
  if (scenario === "agotados") items.push({ ...vest, availability: "out_of_stock" });
  if (scenario === "retirado") items.push({ ...vest, availability: "unavailable", slug: null, image: null, price: undefined });
  const saved = new Map([vest, ...items].map(item => [item.productId, item]));
  let listCalls = 0; let removeCalls = 0;
  let pending: { complete: () => void; reject: () => void } | undefined;
  let released = false;
  const delay = (signal: AbortSignal, duration = 350) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const aborted = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", aborted); resolve(); }, duration);
    signal.addEventListener("abort", aborted, { once: true });
  });
  const hold = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (released && !signal.aborted) { resolve(); return; }
    const aborted = () => { pending = undefined; reject(new DOMException("Aborted", "AbortError")); };
    if (signal.aborted) { aborted(); return; }
    signal.addEventListener("abort", aborted, { once: true });
    pending = { complete: () => { signal.removeEventListener("abort", aborted); pending = undefined; resolve(); }, reject: aborted };
  });
  const adapter: FavoritesTransport = {
    async list(signal) {
      if (scenario === "cargando") await hold(signal); else await delay(signal);
      if (scenario === "error-catalogo" && listCalls++ === 0) throw new WishlistError("CATALOG_UNAVAILABLE", 503);
      if (scenario === "sesion-vencida") throw new WishlistError("UNAUTHORIZED", 401);
      return structuredClone(items);
    },
    async remove(id, signal) {
      if (scenario === "quitando" && removeCalls++ === 0) await hold(signal); else await delay(signal);
      if (scenario === "error-quitar" && removeCalls++ === 0) throw new WishlistError("INTERNAL_ERROR", 500);
      items = items.filter(item => item.productId !== id);
    },
    async save(id, signal) {
      if (scenario === "restaurando") await hold(signal); else await delay(signal);
      if (scenario === "error-restaurar" || saved.get(id)?.availability === "unavailable") throw new WishlistError("PRODUCT_NOT_AVAILABLE", 404);
      const item = saved.get(id);
      if (item) items = [{ ...item, createdAt: new Date().toISOString() }, ...items.filter(product => product.productId !== id)];
    },
  };
  return { adapter, complete: () => { released = true; pending?.complete(); } };
}
