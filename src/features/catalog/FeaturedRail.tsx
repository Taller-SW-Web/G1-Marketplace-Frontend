"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { ProductCard } from "./ProductCard";
import type { Category, ProductCardDTO } from "./types";

export function FeaturedRail({ products, categories }: { products: ProductCardDTO[]; categories: Category[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ previous: false, next: false });
  const categoryNames = new Map(categories.map(category => [category.categoryId, category.name]));

  useEffect(() => {
    const track = rail.current;
    if (!track) return;
    function update() {
      if (!track) return;
      const previous = track.scrollLeft > 2;
      const next = track.scrollLeft + track.clientWidth < track.scrollWidth - 2;
      setEdges(current => current.previous === previous && current.next === next ? current : { previous, next });
    }
    const resize = new ResizeObserver(update);
    resize.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, [products.length]);

  function move(direction: -1 | 1) {
    const track = rail.current;
    const first = track?.firstElementChild;
    if (!track || !first) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: (first.getBoundingClientRect().width + gap) * direction });
  }

  return (
    <section className="featured-section" aria-labelledby="destacados-title">
      <div className="section-heading">
        <h2 id="destacados-title">Destacados</h2>
        <div className="h5-featured-tools">
          {(edges.previous || edges.next) && <div className="h5-featured-controls">
            <Button className="h5-featured-prev" variant="secondary" size="sm"
              aria-label="Destacados anteriores" aria-controls={id} disabled={!edges.previous}
              onClick={() => move(-1)}>
              <img src="/figma/h5-shell/arrow.svg" alt="" width="22" height="22" />
            </Button>
            <Button variant="secondary" size="sm" aria-label="Siguientes destacados" aria-controls={id}
              disabled={!edges.next} onClick={() => move(1)}>
              <img src="/figma/h5-shell/arrow.svg" alt="" width="22" height="22" />
            </Button>
          </div>}
          <Link className="text-link" href="/catalogo">Ver catálogo</Link>
        </div>
      </div>
      <div ref={rail} id={id} className="product-grid h5-featured-rail" role="group" aria-label="Carrusel de destacados"
        tabIndex={0} onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}>
        {products.map(product => <ProductCard key={product.productId} product={product} returnPath="/"
          featured={{ categoryName: categoryNames.get(product.categoryId) }} />)}
      </div>
    </section>
  );
}
