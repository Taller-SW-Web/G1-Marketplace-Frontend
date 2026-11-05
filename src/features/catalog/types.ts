export type CatalogSource = "MOCK" | "REAL" | "UNCONFIGURED";
export type Category = { categoryId: string; name: string };
export type ProductCardDTO = {
  productId: string;
  slug: string;
  name: string;
  categoryId: string;
  brandId: string;
  image: { url: string; alt: string } | null;
};
export type HomeDTO = {
  categories: Category[];
  featuredProducts: ProductCardDTO[];
};
export type CatalogFiltersDTO = {
  categories: Category[];
  brands: { brandId: string; name: string }[];
};
export type PageMeta = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type CatalogPageDTO = { data: ProductCardDTO[]; page: PageMeta; sort?: "NAME_ASC" | "NAME_DESC" | null };
export type QueryState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T; source: CatalogSource }
  | { status: "error"; message: string; code: string };
