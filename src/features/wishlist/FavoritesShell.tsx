"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const path = usePathname();
  const favorites = path === "/favoritos" || path.startsWith("/demo/h3/favoritos/lista");
  if (!favorites) return <>{header}<main id="contenido">{children}</main>{footer}</>;
  return <>
    {header}
    <div className="favorites-shell favorites-surface">
      <nav className="favorites-breadcrumbs" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><img src="/figma/favorite-chevron-12.svg" width="12" height="12" alt="" /><span aria-current="page">Favoritos</span></nav>
      <main id="contenido">{children}</main>
    </div>
    {footer}
  </>;
}
