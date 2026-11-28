"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isCatalogPage, isHome } from "@/features/catalog/api";
import { useCatalog } from "@/features/catalog/useCatalog";
import { ErrorState, MockNotice } from "@/shared/ui/Feedback";
import { HeroCarousel } from "./HeroCarousel";
import { BenefitsStrip, CategoryStrip, FeaturedRail, PromoBlocks } from "./HomeSections";
import { buildCategoryTiles, buildFeatured, buildHeroSlides, buildPromos } from "./selection";
import "./home.css";

/** Una sola página de productos reales alimenta hero, categorías y destacados. */
const PRODUCTS_PATH = "products?page=0&pageSize=48";

export function HomeLanding() {
  const home = useCatalog("home", isHome);
  const catalog = useCatalog(PRODUCTS_PATH, isCatalogPage);
  const homeState = home.state;
  const catalogState = catalog.state;
  const { categories, products } = useMemo(() => ({
    categories: homeState.status === "ready" ? homeState.data.categories : [],
    products: catalogState.status === "ready" ? catalogState.data.data : [],
  }), [homeState, catalogState]);
  const slides = useMemo(() => buildHeroSlides(categories, products), [categories, products]);
  const tiles = useMemo(() => buildCategoryTiles(categories, products), [categories, products]);
  const promos = useMemo(() => buildPromos(categories, products), [categories, products]);
  const featured = useMemo(() => buildFeatured(homeState.status === "ready" ? homeState.data.featuredProducts : [], products),
    [homeState, products]);
  const loading = home.state.status === "loading" || catalog.state.status === "loading";
  const failed = home.state.status === "error" && catalog.state.status === "error";

  return (
    <div className="home-landing">
      {loading ? (
        <div className="hero-carousel hero-carousel--loading" role="status" aria-label="Cargando destacados">
          <span className="hero-skeleton__title" /><span className="hero-skeleton__line" /><span className="hero-skeleton__cta" />
        </div>
      ) : slides.length > 0 ? (
        <HeroCarousel slides={slides} />
      ) : (
        <section className="hero-carousel hero-carousel--static" aria-labelledby="inicio-title">
          <div className="hero-slide hero-slide--ink is-active">
            <div className="hero-slide__inner">
              <div className="hero-slide__copy">
                <p className="hero-slide__eyebrow">INKA ATHLETICS</p>
                <h1 id="inicio-title" className="hero-slide__title">El movimiento empieza contigo</h1>
                <p className="hero-slide__subtitle">Calzado, ropa y accesorios para cada entrenamiento.</p>
                <Link className="hero-slide__cta" href="/catalogo">Ver todo el catálogo<span aria-hidden="true">→</span></Link>
              </div>
              <div className="hero-slide__art" aria-hidden="true">
                <span className="hero-tile hero-tile--1 hero-tile--solo"><img src="/figma/hero-shoe.png" alt="" width="580" height="387" /></span>
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="container home-landing__body">
        {failed && <ErrorState message={home.state.status === "error" ? home.state.message : ""} onRetry={() => { home.retry(); catalog.retry(); }} home />}
        {!loading && <>
          <CategoryStrip tiles={tiles} />
          <PromoBlocks blocks={promos} />
          <FeaturedRail products={featured} />
          <BenefitsStrip />
        </>}
        {home.state.status === "ready" && home.state.source === "MOCK" && <MockNotice />}
      </div>
    </div>
  );
}
