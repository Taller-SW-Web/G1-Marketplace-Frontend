import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marketplaceApiUrl } from "@/shared/server/marketplace-url";
import { ProductDetailContainer } from "@/features/catalog/components/ProductDetailContainer";

/** Patrón canónico del contrato F-011 (espejo del BFF y del proxy). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Verificación server-only del estado real contra el BFF (modo MOCK o real).
 * - slug fuera de contrato o producto inexistente → HTTP 404 (not-found).
 * - 503/504/502 o BFF inaccesible → renderiza el contenedor, que muestra el
 *   estado de error acordado con reintento.
 */
async function resolveBffStatus(slug: string): Promise<number | null> {
  let base: URL;
  try {
    base = marketplaceApiUrl();
  } catch {
    return null;
  }

  try {
    const response = await fetch(
      new URL(`/api/v1/catalog/products/${encodeURIComponent(slug)}`, base),
      {
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    const status = response.status;
    await response.body?.cancel().catch(() => undefined);
    return status;
  } catch {
    // BFF inaccesible: el contenedor gestiona el estado de error.
    return null;
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { returnTo } = await searchParams;

  // Fuera del patrón canónico no es un producto → 404 (nunca consulta).
  if (slug.length < 1 || slug.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(slug)) {
    notFound();
  }

  const status = await resolveBffStatus(slug);
  if (status === 404) notFound();

  return (
    <ProductDetailContainer
      slug={slug}
      returnTo={typeof returnTo === "string" ? returnTo : undefined}
      showAddToCart={true}
    />
  );
}

export function generateMetadata(): Metadata {
  return {
    title: "Producto — Marketplace",
    description: "Detalle del producto.",
  };
}
