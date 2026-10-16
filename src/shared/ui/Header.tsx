import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/features/catalog/SearchBox";
import { CategoryNavigation } from "@/features/catalog/CategoryNavigation";

export function Header() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="header-content">
          <Link href="/" className="brand" aria-label="Inka Athletics, inicio">
            <img src="/figma/logo.png" alt="Inka Athletics" width="150" height="61" />
          </Link>
          <Suspense fallback={<div className="search-placeholder" />}>
            <SearchBox />
          </Suspense>
          <div className="header-actions" aria-label="Cuenta y compras">
            <button className="header-action account-action" disabled title="Próximamente" aria-label="Iniciar sesión, próximamente">
              <img className="mobile-icon" src="/figma/user-24.svg" alt="" width="24" height="24" />
              <span>Iniciar sesión</span>
            </button>
            <button className="header-action" disabled title="Próximamente" aria-label="Favoritos, próximamente">
              <img className="desktop-icon" src="/figma/heart-20.svg" alt="" width="20" height="20" />
              <img className="mobile-icon" src="/figma/heart-24.svg" alt="" width="24" height="24" />
              <span>Favoritos</span>
            </button>
            <Link href="/carrito" className="header-action" aria-label="Carrito de compras">
              <img className="desktop-icon" src="/figma/bag-20.svg" alt="" width="20" height="20" />
              <img className="mobile-icon" src="/figma/bag-24.svg" alt="" width="24" height="24" />
              <span>Carrito</span>
            </Link>
          </div>
        </div>
        <CategoryNavigation />
      </header>
    </>
  );
}
