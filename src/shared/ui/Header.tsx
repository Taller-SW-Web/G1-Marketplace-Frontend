import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/features/catalog/SearchBox";

export function Header() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="brand-strip">
        <div className="container">
          <span>INKA ATHLETICS</span>
          <span>El movimiento empieza contigo.</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-content">
          <Link href="/" className="brand" aria-label="Inka Athletics, inicio">
            <img
              src="/brand/logo-ink.png"
              alt="Inka Athletics"
              width="120"
              height="90"
            />
          </Link>
          <Suspense fallback={<div className="search-placeholder" />}>
            <SearchBox />
          </Suspense>
          <Link href="/catalogo" className="catalog-nav">
            Explorar catálogo <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
    </>
  );
}
