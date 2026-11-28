import type { Category, ProductCardDTO } from "@/features/catalog/types";

/** Registros de prueba (QA) que no deben aparecer en la portada pública. */
const QA_PATTERN = /(^|\s)(g\d+\s+)?qa(\s|$)/i;

export const isShowcaseCategory = (category: Category) => !QA_PATTERN.test(category.name);
export const isShowcaseProduct = (product: ProductCardDTO) =>
  Boolean(product.image?.url) && !QA_PATTERN.test(product.name) && !/(^|-)qa(-|$)/i.test(product.slug);

export const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type HeroSlide = {
  id: string;
  theme: "ink" | "volt" | "ember" | "sky" | "night";
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  products: ProductCardDTO[];
};

type SlideTemplate = Omit<HeroSlide, "href" | "products"> & { category?: RegExp };

/** Plantillas de texto; cada una solo se muestra si la categoría existe y tiene fotos reales. */
const templates: SlideTemplate[] = [
  { id: "todo", theme: "ink", eyebrow: "INKA ATHLETICS", title: "El movimiento empieza contigo", subtitle: "Calzado, ropa y accesorios para cada entrenamiento.", cta: "Ver todo el catálogo" },
  { id: "futbol", theme: "ember", category: /futbol/, eyebrow: "FÚTBOL", title: "Domina la cancha", subtitle: "Botines para pisar fuerte en cada jugada.", cta: "Ver fútbol" },
  { id: "running", theme: "volt", category: /running/, eyebrow: "RUNNING", title: "Corre más lejos", subtitle: "Zapatillas para sumar kilómetros a tu ritmo.", cta: "Ver running" },
  { id: "balones", theme: "sky", category: /balon/, eyebrow: "BALONES", title: "Cada pase cuenta", subtitle: "Balones para entrenar y jugar el partido.", cta: "Ver balones" },
  { id: "entrenamiento", theme: "night", category: /entrena/, eyebrow: "ENTRENAMIENTO", title: "Entrena sin pausa", subtitle: "Camisetas y shorts para darlo todo.", cta: "Ver entrenamiento" },
];

export const categoryHref = (categoryId: string) => `/catalogo?categoryIds=${encodeURIComponent(categoryId)}`;

export function productsByCategory(products: ProductCardDTO[]) {
  const map = new Map<string, ProductCardDTO[]>();
  for (const product of products.filter(isShowcaseProduct)) {
    const list = map.get(product.categoryId) ?? [];
    list.push(product);
    map.set(product.categoryId, list);
  }
  return map;
}

/** Toma productos espaciados de la lista para variar la escena (no siempre los tres primeros). */
function spread<T>(items: T[], count: number) {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, index) => items[Math.floor(index * step)]);
}

export function buildHeroSlides(categories: Category[], products: ProductCardDTO[]): HeroSlide[] {
  const grouped = productsByCategory(products);
  const showcase = products.filter(isShowcaseProduct);
  const slides: HeroSlide[] = [];
  for (const template of templates) {
    const { category: pattern, ...copy } = template;
    if (!pattern) {
      const mixed = [...grouped.values()].map((list) => list[0]).filter(Boolean);
      const picks = spread(mixed.length >= 3 ? mixed : showcase, 3);
      if (picks.length > 0) slides.push({ ...copy, href: "/catalogo", products: picks });
      continue;
    }
    const category = categories.filter(isShowcaseCategory).find((item) => pattern.test(normalize(item.name)));
    const list = category ? grouped.get(category.categoryId) ?? [] : [];
    if (category && list.length > 0) slides.push({ ...copy, href: categoryHref(category.categoryId), products: spread(list, 3) });
  }
  return slides;
}

export type CategoryTile = { category: Category; image: ProductCardDTO["image"]; count: number };

export function buildCategoryTiles(categories: Category[], products: ProductCardDTO[]): CategoryTile[] {
  const grouped = productsByCategory(products);
  return categories.filter(isShowcaseCategory).map((category) => {
    const list = grouped.get(category.categoryId) ?? [];
    return { category, image: list[0]?.image ?? null, count: list.length };
  });
}

/** Destacados: el que devuelve el BFF primero (si es público) y luego uno por categoría, alternando. */
export function buildFeatured(featured: ProductCardDTO[], products: ProductCardDTO[], limit = 10) {
  const result: ProductCardDTO[] = [];
  const seen = new Set<string>();
  const add = (product: ProductCardDTO) => {
    if (seen.has(product.productId) || !isShowcaseProduct(product) || result.length >= limit) return;
    seen.add(product.productId);
    result.push(product);
  };
  featured.forEach(add);
  const lists = [...productsByCategory(products).values()];
  for (let round = 0; result.length < limit && lists.some((list) => list.length > round); round += 1) {
    lists.forEach((list) => list[round] && add(list[round]));
  }
  return result;
}
