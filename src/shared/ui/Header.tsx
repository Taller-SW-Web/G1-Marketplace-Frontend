import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/features/catalog/SearchBox";
import { DesktopCategories, MobileMenu } from "@/features/catalog/ShellNavigation";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { PromotionBar } from "./PromotionBar";

export function Header({ reduced = false }: { reduced?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className={reduced ? "site-header h5-shell-header h5-shell-header--reduced" : "site-header h5-shell-header"}>
        {!reduced && <PromotionBar message="Descubre las ofertas del catálogo" />}
        <div className="header-content">
          {!reduced && <MobileMenu />}
          <Link href="/" className="brand" aria-label="Inka Athletics, inicio">
            <img src="/figma/logo.png" alt="Inka Athletics" width="1448" height="1086" />
          </Link>
          {!reduced && <>
            <DesktopCategories />
            <Suspense fallback={<div className="search-placeholder" />}>
              <SearchBox />
            </Suspense>
          </>}
          <div className="header-actions" role="group" aria-label="Cuenta y compras">
            <div className="h5-shell-account"><AccountMenu shellIcon /></div>
            {!reduced && <>
              <Link href="/favoritos" className="header-action h5-shell-favorites" aria-label="Favoritos">
                <img src="/figma/h5-shell/heart.svg" alt="" width="22" height="22" />
              </Link>
              <Link href="/carrito" className="header-action h5-shell-cart" aria-label="Carrito de compras">
                <img src="/figma/h5-shell/bag.svg" alt="" width="22" height="22" />
              </Link>
            </>}
          </div>
        </div>
      </header>
    </>
  );
}
