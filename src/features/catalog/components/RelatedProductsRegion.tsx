"use client";
import { useRelatedProducts } from "../hooks/useRelatedProducts";
import { RelatedProducts } from "./RelatedProducts";

/**
 * Envoltorio de F-015: la región se carga de forma independiente y degradable
 * debajo de la ficha. Vacío o fallo → se omite por completo.
 */
export function RelatedProductsRegion({ slug }: { slug: string }) {
  const { state } = useRelatedProducts(slug);
  return <RelatedProducts state={state} />;
}
