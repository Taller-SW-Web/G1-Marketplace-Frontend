import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/features/catalog/Catalog";
import { ProductSkeletons } from "@/shared/ui/Feedback";
export const metadata: Metadata = { title: "Catálogo" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container catalog-page h5-catalog">
          <div className="catalog-heading"><h1>Catálogo</h1></div>
          <div className="catalog-results">
            <p className="result-count">Cargando productos…</p>
            <ProductSkeletons />
          </div>
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
