import type { Metadata } from "next";
import { ProductDetailContainer } from "@/features/catalog/components/ProductDetailContainer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailContainer slug={slug} />;
}

export function generateMetadata(): Metadata {
  return {
    title: "Producto — Marketplace",
    description: "Detalle del producto.",
  };
}
