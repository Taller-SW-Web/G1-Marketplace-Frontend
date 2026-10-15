"use client";
import Link from "next/link";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";

// H3 category links only: this is not the later multi-filter panel.
export function CategoryNavigation({ sidebar = false, activeId }: {
  sidebar?: boolean;
  activeId?: string | null;
}) {
  const { state } = useCatalog("home", isHome);
  return (
    <nav className={sidebar ? "category-navigation category-navigation--sidebar" : "category-navigation"}
      aria-label={sidebar ? "Explorar categorías" : "Navegación principal"}>
      {sidebar && <h2>Categorías</h2>}
      <Link href="/catalogo" aria-current={sidebar && !activeId ? "page" : undefined}>
        <span className="desktop-label">Todo el catálogo</span><span className="mobile-label">Catálogo</span>
      </Link>
      {state.status === "ready" && state.data.categories.map((category) => (
        <Link key={category.categoryId}
          href={`/catalogo?categoryIds=${encodeURIComponent(category.categoryId)}`}
          aria-current={sidebar && activeId === category.categoryId ? "page" : undefined}>
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
