import type { Metadata } from "next";
import { ProductDetailContainer } from "@/features/catalog/components/ProductDetailContainer";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { returnTo } = await searchParams;
  return (
    <ProductDetailContainer
      slug={slug}
      returnTo={typeof returnTo === "string" ? returnTo : undefined}
    />
  );
}

export function generateMetadata(): Metadata {
  return {
    title: "Producto — Marketplace",
    description: "Detalle del producto.",
  };
}
