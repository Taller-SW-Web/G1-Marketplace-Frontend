"use client";

import Link from "next/link";
import { Suspense, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { isHome } from "./api";
import { SearchBox } from "./SearchBox";
import { useCatalog } from "./useCatalog";

function categoryHref(id: string) {
  return `/catalogo?categoryIds=${encodeURIComponent(id)}`;
}

function CategoryPanel({ state, retry, onNavigate }: ReturnType<typeof useCatalogHome> & { onNavigate: () => void }) {
  return <>
    <h2>Explorar categorías</h2>
    {state.status === "loading" && <p role="status">Cargando categorías…</p>}
    {state.status === "error" && <>
      <p role="status">No pudimos cargar las categorías.</p>
      <button className="h5-shell-text-action" type="button" onClick={retry}>Reintentar categorías</button>
    </>}
    {state.status === "ready" && state.data.categories.length === 0 && <p>No hay categorías disponibles.</p>}
    <ul className="h5-shell-link-list">
      {state.status === "ready" && state.data.categories.map(({ categoryId, name }) => (
        <li key={categoryId}><Link href={categoryHref(categoryId)} onClick={onNavigate}>
          {name}<img src="/figma/h5-shell/chevron.svg" alt="" width="22" height="22" />
        </Link></li>
      ))}
      <li><Link href="/catalogo" onClick={onNavigate}>
        Todo el catálogo<img src="/figma/h5-shell/chevron.svg" alt="" width="22" height="22" />
      </Link></li>
    </ul>
  </>;
}

function useCatalogHome(enabled = true) {
  return useCatalog(enabled ? "home" : null, isHome);
}

export function DesktopCategories() {
  const catalog = useCatalogHome();
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) {
      if (event.target !== trigger.current || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => {
        const links = panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [];
        const index = event.key === "ArrowUp" ? links.length - 1 : 0;
        links[index]?.focus();
      });
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const links = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const index = links.findIndex(link => link === event.target);
    if (index < 0 && event.target !== trigger.current) return;
    const next = event.key === "ArrowDown" ? index + 1 : index < 0 ? links.length - 1 : index - 1;
    event.preventDefault();
    if (next < 0 || next >= links.length) trigger.current?.focus();
    else links[next]?.focus();
  }

  return (
    <nav className="h5-shell-desktop-nav" aria-label="Navegación principal" onKeyDown={onKeyDown}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {catalog.state.status === "ready" && catalog.state.data.categories.slice(0, 3).map(({ categoryId, name }) => (
        <Link key={categoryId} href={categoryHref(categoryId)} onClick={() => setOpen(false)}>{name}</Link>
      ))}
      <button ref={trigger} className="h5-shell-text-action" type="button" aria-expanded={open}
        aria-controls={id} onClick={() => setOpen(value => !value)}>Categorías</button>
      <div ref={panel} id={id} className="h5-shell-category-panel" hidden={!open}>
        <CategoryPanel {...catalog} onNavigate={() => setOpen(false)} />
      </div>
    </nav>
  );
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const catalog = useCatalogHome(open);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const titleId = useId();
  const close = () => dialog.current?.close();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return <>
    <button ref={trigger} type="button" className="header-action h5-shell-mobile-trigger" aria-label="Abrir menú"
      aria-haspopup="dialog" aria-controls={id} aria-expanded={open}
      onClick={() => {
        dialog.current?.showModal();
        setOpen(true);
        closeButton.current?.focus();
      }}>
      <img src="/figma/h5-shell/menu.svg" alt="" width="22" height="22" />
    </button>
    <dialog ref={dialog} id={id} className="h5-shell-drawer" aria-labelledby={titleId}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}
      onKeyDown={event => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          close();
        }
      }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="h5-shell-drawer-content">
        <div className="h5-shell-drawer-heading">
          <h2 id={titleId}>Menú</h2>
          <button ref={closeButton} type="button" className="h5-shell-text-action" onClick={close}>Cerrar menú</button>
        </div>
        <nav className="h5-shell-drawer-card" aria-label="Categorías y cuenta">
          <CategoryPanel {...catalog} onNavigate={close} />
          <div className="h5-shell-drawer-links" onClick={event => {
            if (event.target instanceof Element && event.target.closest("a")) close();
          }}>
            <AccountMenu shellIcon />
            <Link href="/favoritos" className="header-action">
              <img src="/figma/h5-shell/heart.svg" alt="" width="22" height="22" /> Favoritos
            </Link>
          </div>
        </nav>
        <div className="h5-shell-drawer-card">
          {open && <Suspense fallback={<div className="search-placeholder" />}><SearchBox onNavigate={close} /></Suspense>}
        </div>
      </div>
    </dialog>
  </>;
}
