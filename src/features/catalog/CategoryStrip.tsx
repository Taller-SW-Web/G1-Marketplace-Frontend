"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type CategoryStripItem = { id: string; name: string; href: string; current: boolean };

/**
 * Categorías del hero en UNA sola línea. Si no caben, aparece una flecha a la derecha
 * (y a la izquierda al desplazarse) y los extremos se difuminan.
 */
export function CategoryStrip({ items, onSelect }: { items: CategoryStripItem[]; onSelect: (href: string) => void }) {
  const track = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const element = track.current;
    if (!element) return;
    setCanPrev(element.scrollLeft > 4);
    setCanNext(element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, items.length]);

  function scrollBy(direction: 1 | -1) {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: direction * Math.max(200, element.clientWidth * 0.7), behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="catalog-category-strip" data-prev={canPrev} data-next={canNext}>
      {canPrev && (
        <button type="button" className="strip-arrow strip-arrow--prev" aria-label="Ver categorías anteriores" onClick={() => scrollBy(-1)}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      <nav ref={track} className="catalog-hero-categories" aria-label="Atajos a categorías">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={item.current ? "true" : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onSelect(item.href);
            }}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      {canNext && (
        <button type="button" className="strip-arrow strip-arrow--next" aria-label="Ver más categorías" onClick={() => scrollBy(1)}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </div>
  );
}
