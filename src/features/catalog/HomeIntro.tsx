import Link from "next/link";

/**
 * Portada editorial del inicio (V-005).
 *
 * Se renderiza en el servidor para que la imagen LCP aparezca en el HTML
 * inicial: el resto de `Home` es cliente porque consulta el catálogo, y sin
 * este corte la portada no existía hasta hidratar (FE #155, Lighthouse móvil).
 */
export function HomeIntro() {
  return (
    <section className="home-intro" aria-labelledby="inicio-title">
      <div className="intro-copy">
        <p className="eyebrow">ENCUENTRA TU PRÓXIMA META</p>
        <h1 id="inicio-title">
          EL MOVIMIENTO
          <br />
          EMPIEZA CONTIGO.
        </h1>
        <p className="intro-description">
          Ropa, calzado y accesorios para acompañarte en cada entrenamiento.
        </p>
        <Link className="button" href="/catalogo">
          Explorar catálogo
        </Link>
      </div>
      <div className="intro-art">
        <picture>
          <source srcSet="/figma/hero-shoe-1160.webp" type="image/webp" />
          <img
            src="/figma/hero-shoe.png"
            alt="Zapatilla deportiva negra y blanca"
            width="580"
            height="387"
            fetchPriority="high"
          />
        </picture>
      </div>
    </section>
  );
}
