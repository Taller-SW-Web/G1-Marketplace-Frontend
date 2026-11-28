"use client";
import Link from "next/link";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";

// Hide the two G6 QA categories from the header until G6 deactivates them.
const QA_HEADER_CATEGORY_IDS = new Set([
  "127dea28-522a-444b-a52a-74538322f8fd",
  "18c2521c-2a13-4571-9b0c-e0575436db26",
]);

// H3 category links only: this is not the later multi-filter panel.
export function CategoryNavigation({ sidebar = false, activeId, onNavigate }: {
  sidebar?: boolean;
  activeId?: string | null;
  onNavigate?: () => void;
}) {
  const { state } = useCatalog("home", isHome);
  const categories = state.status === "ready" ? state.data.categories : [];
  const navigationCategories = sidebar
    ? categories
    : categories.filter(({ categoryId }) => !QA_HEADER_CATEGORY_IDS.has(categoryId));

  return (
    <nav className={sidebar ? "category-navigation category-navigation--sidebar" : "category-navigation"}
      aria-label={sidebar || onNavigate ? "Explorar categorías" : "Navegación principal"}>
      {(sidebar || onNavigate) && <h2>Categorías</h2>}
      <Link href="/catalogo" onClick={onNavigate} aria-current={sidebar && !activeId ? "page" : undefined}>
        <span className="desktop-label">Todo el catálogo</span><span className="mobile-label">Catálogo</span>
      </Link>
      {navigationCategories.map((category) => (
        <Link key={category.categoryId} onClick={onNavigate}
          href={`/catalogo?categoryIds=${encodeURIComponent(category.categoryId)}`}
          aria-current={sidebar && activeId === category.categoryId ? "page" : undefined}>
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
