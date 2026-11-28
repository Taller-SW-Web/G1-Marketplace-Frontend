import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/features/catalog/Catalog";
import { ProductSkeletons } from "@/shared/ui/Feedback";
export const metadata: Metadata = { title: "Catálogo" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container catalog-page">
          <ProductSkeletons />
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
