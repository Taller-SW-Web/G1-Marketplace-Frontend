"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { SearchBox } from "@/features/catalog/SearchBox";
import { CategoryNavigation } from "@/features/catalog/CategoryNavigation";
import { ShellCounters } from "./ShellCounters";
import "./marketplace-shell.css";

export function Header() {
  const pathname = usePathname();

  return <MarketplaceHeader key={pathname} />;
}

function MarketplaceHeader() {
  const drawer = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const searchRegion = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 768px)");
    const closeOnTablet = () => {
      if (tablet.matches) {
        drawer.current?.close();
        setSearchOpen(false);
      }
    };
    tablet.addEventListener("change", closeOnTablet);
    return () => tablet.removeEventListener("change", closeOnTablet);
  }, []);

  useLayoutEffect(() => {
    if (searchOpen) searchRegion.current?.querySelector("input")?.focus();
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    searchTrigger.current?.focus();
  }

  function toggleSearch() {
    if (searchOpen) closeSearch();
    else setSearchOpen(true);
  }

  return (
    <>
      <a className="skip-link marketplace-skip" href="#contenido">Saltar al contenido</a>
      <header className="site-header marketplace-header">
        <div className="marketplace-container marketplace-header-row">
          <button ref={menuTrigger} className="marketplace-icon-button marketplace-mobile-only" type="button"
            aria-label="Abrir menú" aria-haspopup="dialog" aria-controls="marketplace-drawer" aria-expanded={drawerOpen}
            onClick={() => {
              drawer.current?.showModal();
              setDrawerOpen(true);
            }}>
            <img src="/figma/favorite-menu-22.svg" alt="" width="22" height="22" />
          </button>
          <Link href="/" className="brand marketplace-brand" aria-label="Inka Athletics, inicio">
            <img src="/figma/logo.png" alt="" width="150" height="61" />
          </Link>
          <div id="marketplace-search" ref={searchRegion} className="marketplace-search" data-open={searchOpen}
            onKeyDown={event => { if (event.key === "Escape" && searchOpen) closeSearch(); }}>
            <Suspense fallback={<div className="search-placeholder" />}>
              <SearchBox onNavigate={() => { if (searchOpen) closeSearch(); }} />
            </Suspense>
          </div>
          <div className="marketplace-actions">
            <div className="marketplace-desktop-account"><AccountMenu /></div>
            <button ref={searchTrigger} className="marketplace-icon-button marketplace-mobile-only" type="button"
              aria-label={searchOpen ? "Cerrar buscador" : "Abrir buscador"}
              aria-expanded={searchOpen} aria-controls="marketplace-search" onClick={toggleSearch}>
              <img src="/figma/search-20.svg" alt="" width="22" height="22" />
            </button>
            <ShellCounters />
          </div>
        </div>
        <div className="marketplace-desktop-nav">
          <div className="marketplace-container"><CategoryNavigation /></div>
        </div>
        <dialog ref={drawer} id="marketplace-drawer" className="marketplace-drawer" aria-labelledby="marketplace-drawer-title"
          onClose={() => {
            setDrawerOpen(false);
            if (menuTrigger.current?.getClientRects().length) menuTrigger.current.focus();
            else searchRegion.current?.querySelector("input")?.focus();
          }}
          onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
          <div className="marketplace-drawer-content">
            <div className="marketplace-drawer-heading">
              <h2 id="marketplace-drawer-title">Menú</h2>
              <button className="marketplace-icon-button" type="button" aria-label="Cerrar menú"
                onClick={() => drawer.current?.close()}>
                <img src="/figma/auth/close.svg" alt="" width="20" height="20" />
              </button>
            </div>
            {drawerOpen && <>
              <div className="marketplace-drawer-account"><AccountMenu onNavigate={() => drawer.current?.close()} /></div>
              <CategoryNavigation onNavigate={() => drawer.current?.close()} />
            </>}
          </div>
        </dialog>
      </header>
    </>
  );
}
