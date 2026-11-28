"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import type { HeroSlide } from "./selection";

const AUTOPLAY_MS = 6000;
const SWIPE_PX = 48;

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function HeroImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="hero-tile__fallback" aria-hidden="true" />;
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async"
    fetchPriority={eager ? "high" : undefined} onError={() => setFailed(true)} />;
}

/** Carrusel principal (patrón APG): autoavance con pausa, flechas, puntos y deslizamiento táctil. */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  const pointerStart = useRef<number | null>(null);
  const count = slides.length;
  const autoplay = count > 1 && !reducedMotion && !userPaused && !hovered && !focused;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") go(index + 1);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, go]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    pointerStart.current = event.clientX;
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(delta) >= SWIPE_PX) go(index + (delta < 0 ? 1 : -1));
  }

  if (count === 0) return null;
  return (
    <section className={`hero-carousel${reducedMotion ? " is-static" : ""}`} aria-roledescription="carrusel" aria-label="Destacados de Inka Athletics"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <div className="hero-carousel__viewport" aria-live={autoplay ? "off" : "polite"}
        onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }}>
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          return (
            <div key={slide.id} className={`hero-slide hero-slide--${slide.theme}${active ? " is-active" : ""}`}
              role="group" aria-roledescription="diapositiva" aria-label={`${slideIndex + 1} de ${count}: ${slide.title}`}
              aria-hidden={!active} inert={!active}>
              <span className="hero-slide__glow hero-slide__glow--a" aria-hidden="true" />
              <span className="hero-slide__glow hero-slide__glow--b" aria-hidden="true" />
              <div className="hero-slide__inner">
                <div className="hero-slide__copy">
                  <p className="hero-slide__eyebrow">{slide.eyebrow}</p>
                  {slideIndex === 0 ? <h1 className="hero-slide__title">{slide.title}</h1> : <h2 className="hero-slide__title">{slide.title}</h2>}
                  <p className="hero-slide__subtitle">{slide.subtitle}</p>
                  <Link className="hero-slide__cta" href={slide.href}>{slide.cta}<span aria-hidden="true">→</span></Link>
                </div>
                <div className="hero-slide__art" aria-hidden="true">
                  {slide.products.map((product, productIndex) => (
                    <span key={product.productId} className={`hero-tile hero-tile--${productIndex + 1}`}>
                      {product.image && <HeroImage src={product.image.url} alt="" eager={slideIndex === 0} />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="hero-carousel__controls">
          <button type="button" className="hero-carousel__arrow" onClick={() => go(index - 1)} aria-label="Diapositiva anterior">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="hero-carousel__dots">
            {slides.map((slide, dotIndex) => (
              <button key={slide.id} type="button" className={`hero-carousel__dot${dotIndex === index ? " is-active" : ""}`}
                aria-label={`Ir a la diapositiva ${dotIndex + 1}: ${slide.title}`} aria-current={dotIndex === index ? "true" : undefined}
                onClick={() => go(dotIndex)}>
                <span className="hero-carousel__dot-bar" style={autoplay && dotIndex === index ? { animationDuration: `${AUTOPLAY_MS}ms` } : undefined} />
              </button>
            ))}
          </div>
          <button type="button" className="hero-carousel__arrow" onClick={() => go(index + 1)} aria-label="Diapositiva siguiente">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {!reducedMotion && (
            <button type="button" className="hero-carousel__pause" onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "Reanudar el carrusel" : "Pausar el carrusel"}>
              {userPaused
                ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
