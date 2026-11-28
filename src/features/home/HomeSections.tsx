"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { CategoryArtwork } from "@/features/catalog/CategoryArtwork";
import { ProductCard } from "@/features/catalog/ProductCard";
import "@/features/catalog/catalog-listing.css";
import type { ProductCardDTO } from "@/features/catalog/types";
import { categoryHref, type CategoryTile } from "./selection";
import { useReveal } from "./useReveal";

function TileImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="home-tile__fallback" aria-hidden="true" />;
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

/** Franja de categorías con la primera foto real de cada una. */
export function CategoryStrip({ tiles }: { tiles: CategoryTile[] }) {
  const ref = useReveal<HTMLElement>();
  if (tiles.length === 0) return null;
  return (
    <section ref={ref} className="home-section home-reveal" aria-labelledby="home-categorias">
      <div className="home-section__head">
        <h2 id="home-categorias">Compra por categoría</h2>
        <Link className="home-section__link" href="/catalogo">Ver todo<span aria-hidden="true"> →</span></Link>
      </div>
      <ul className="home-categories">
        {tiles.map(({ category, image }, index) => (
          <li key={category.categoryId} style={{ "--i": index } as CSSProperties}>
            <Link className="home-category" href={categoryHref(category.categoryId)}>
              <span className="home-category__media">
                {image ? <TileImage src={image.url} /> : <span className="home-category__art"><CategoryArtwork category={category} /></span>}
              </span>
              <span className="home-category__name">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type PromoBlock = { id: string; eyebrow: string; title: string; text: string; cta: string; href: string; image: ProductCardDTO["image"]; theme: "ink" | "ember" | "volt" };

/** Dos banners grandes con foto real, degradado oscuro y CTA. */
export function PromoBlocks({ blocks }: { blocks: PromoBlock[] }) {
  const ref = useReveal<HTMLElement>();
  if (blocks.length === 0) return null;
  return (
    <section ref={ref} className="home-section home-reveal" aria-label="Colecciones">
      <div className="home-promos">
        {blocks.map((block, index) => (
          <Link key={block.id} href={block.href} className={`home-promo home-promo--${block.theme}`} style={{ "--i": index } as CSSProperties}>
            <span className="home-promo__media" aria-hidden="true">{block.image && <TileImage src={block.image.url} />}</span>
            <span className="home-promo__copy">
              <span className="home-promo__eyebrow">{block.eyebrow}</span>
              <span className="home-promo__title">{block.title}</span>
              <span className="home-promo__text">{block.text}</span>
              <span className="home-promo__cta">{block.cta}<span aria-hidden="true"> →</span></span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Carrusel horizontal de destacados con las tarjetas del catálogo (precio perezoso incluido). */
export function FeaturedRail({ products }: { products: ProductCardDTO[] }) {
  const ref = useReveal<HTMLElement>();
  const track = useRef<HTMLUListElement>(null);
  if (products.length === 0) return null;
  const scroll = (direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <section ref={ref} className="home-section home-reveal" aria-labelledby="home-destacados">
      <div className="home-section__head">
        <h2 id="home-destacados">Destacados para ti</h2>
        <div className="home-rail__nav">
          <button type="button" className="home-rail__arrow" onClick={() => scroll(-1)} aria-label="Ver destacados anteriores">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="home-rail__arrow" onClick={() => scroll(1)} aria-label="Ver más destacados">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <ul ref={track} className="home-rail catalog-listing" tabIndex={0} aria-label="Productos destacados">
        {products.map((product) => (
          <li key={product.productId} className="home-rail__item">
            <ProductCard product={product} returnPath="/" listing={{}} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const benefits = [
  { title: "Sigue tu pedido", text: "Consulta el estado y la línea de tiempo del despacho en Mis pedidos.", href: "/mis-pedidos", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01" },
  { title: "Compra con tu cuenta", text: "Accede con verificación por código para proteger tu sesión.", href: "/login", icon: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5zM12 14v2" },
  { title: "Guarda tus favoritos", text: "Marca lo que te gusta y retómalo cuando quieras.", href: "/favoritos", icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
  { title: "Catálogo con marcas reales", text: "Adidas, Nike, Puma y más, con fotos de cada producto.", href: "/catalogo", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
];

/** Franja de beneficios: solo funciones que existen en el producto. */
export function BenefitsStrip() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="home-section home-reveal" aria-labelledby="home-beneficios">
      <h2 id="home-beneficios" className="sr-only">Por qué comprar en Inka Athletics</h2>
      <ul className="home-benefits">
        {benefits.map((benefit, index) => (
          <li key={benefit.title} style={{ "--i": index } as CSSProperties}>
            <Link className="home-benefit" href={benefit.href}>
              <span className="home-benefit__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26"><path d={benefit.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="home-benefit__title">{benefit.title}</span>
              <span className="home-benefit__text">{benefit.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
