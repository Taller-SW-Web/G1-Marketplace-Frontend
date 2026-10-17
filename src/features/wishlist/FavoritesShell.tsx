"use client";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SearchBox } from "@/features/catalog/SearchBox";
import { useWishlist } from "./WishlistProvider";

function FavoritesHeader() {
  const { session } = useWishlist();
  const preview = usePathname().startsWith("/demo/");
  return <header className="favorites-header">
    <div className="favorites-nav">
      <details className="favorites-menu"><summary aria-label="Abrir navegación"><img src="/figma/favorite-menu-22.svg" width="22" height="22" alt="" /></summary>
        <nav aria-label="Navegación móvil"><Link href="/">Inicio</Link><Link href="/catalogo">Catálogo</Link><Link href="/favoritos">Favoritos</Link></nav>
      </details>
      <Link href="/" className="brand favorites-brand" aria-label="Inka Athletics, inicio"><img src="/figma/logo.png" width="131" height="53" alt="Inka Athletics" /></Link>
      <div className="favorites-search"><Suspense fallback={<div className="search-placeholder" />}><SearchBox compact /></Suspense></div>
      <nav className="favorites-nav-actions" aria-label="Cuenta y compras">
        <Link href="/catalogo" className="favorites-catalog-link"><img src="/figma/favorite-grid-17.svg" width="17" height="17" alt="" /><span>Catálogo</span></Link>
        <Link href="/favoritos" aria-current="page" aria-label="Favoritos" className="favorites-current-link">
          <img className="favorites-nav-desktop" src="/figma/favorite-heart-17.svg" width="17" height="17" alt="" />
          <img className="favorites-nav-mobile" src="/figma/favorite-nav-heart-21.svg" width="21" height="21" alt="" /><span>Favoritos</span>
        </Link>
        <button type="button" className="favorites-account-link" disabled title="Próximamente"><img src="/figma/favorite-user-16.svg" width="16" height="16" alt="" /><span>{session.identity || preview ? "Mi cuenta" : "Iniciar sesión"}</span></button>
        <button type="button" className="favorites-nav-mobile favorites-cart-link" disabled title="Próximamente" aria-label="Carrito, próximamente"><img src="/figma/favorite-bag-21.svg" width="21" height="21" alt="" /></button>
      </nav>
    </div>
  </header>;
}
export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const path = usePathname();
  const favorites = path === "/favoritos" || path.startsWith("/demo/h3/favoritos/lista");
  if (!favorites) return <>{header}<main id="contenido">{children}</main>{footer}</>;
  return <div className="favorites-shell favorites-surface">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <FavoritesHeader />
    <nav className="favorites-breadcrumbs" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><img src="/figma/favorite-chevron-12.svg" width="12" height="12" alt="" /><span aria-current="page">Favoritos</span></nav>
    <main id="contenido">{children}</main>
  </div>;
}
