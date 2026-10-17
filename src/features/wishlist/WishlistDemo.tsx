"use client";

import { Button } from "@/shared/ui/Button";
import { FavoriteControl } from "./FavoriteControl";
import { useWishlist } from "./WishlistProvider";
import Link from "next/link";
import type { Identity } from "./types";

export function WishlistDemo() {
  const { session, sessionBusy, sessionMessage, selectIdentity, mutate, items } = useWishlist();
  return <div className="container wishlist-demo">
    <p className="wishlist-eyebrow">AVANCE PREPARATORIO · H3 · DIEGO</p>
    <h1>Favoritos de prueba</h1>
    <Link className="text-link" href="/demo/h3/favoritos/lista">Ver diseño de la lista de favoritos</Link>
    <aside className="wishlist-notice" aria-label="Alcance de la demostración">
      <strong>Sesión y elegibilidad de productos: MOCK.</strong> Next.js, NestJS y PostgreSQL: reales locales al ejecutar la prueba conectada.
      <p>No es un listado personal ni autenticación real. Sin GET, el estado comienza desconocido tras recargar o cambiar identidad.</p>
    </aside>
    <section className="wishlist-session" aria-labelledby="sandbox-heading">
      <h2 id="sandbox-heading">Simulación de sesión</h2>
      <label htmlFor="sandbox-identity">Identidad ficticia</label>
      <select id="sandbox-identity" value={session.identity ?? "none"} disabled={sessionBusy}
        onChange={event => { void selectIdentity(event.target.value === "none" ? null : event.target.value as Identity); }}>
        <option value="none">Sin sesión</option><option value="A">Cliente de prueba A</option><option value="B">Cliente de prueba B</option>
      </select>
      <Button variant="tertiary" disabled={sessionBusy || !session.identity} onClick={() => { void selectIdentity(session.identity); }}>Renovar sesión de prueba</Button>
      <p role="status">{sessionBusy ? "Comprobando sesión…" : session.identity ? `Cliente de prueba ${session.identity} activo.` : "Sin sesión activa."}</p>
      {sessionMessage && <p role="alert">{sessionMessage}</p>}
      <p className="wishlist-hint">Tokens válidos por 15 minutos. Si vencen, genera otros en el backend y reinicia Next. Renovar este selector no renueva el JWT.</p>
    </section>
    <div className="wishlist-demo-grid">
      <section className="wishlist-demo-card" aria-labelledby="test-product-heading">
        <div className="wishlist-product-art" aria-hidden="true">♡</div>
        <p className="wishlist-eyebrow">PRODUCTO FICTICIO · PRD-1</p>
        <h2 id="test-product-heading">Producto de demostración</h2>
        <p>Activo en el adaptador de prueba. Sin precio ni disponibilidad comercial real.</p>
        <FavoriteControl productId="PRD-1" />
      </section>
      <section className="wishlist-demo-card" aria-labelledby="sync-heading">
        <h2 id="sync-heading">El mismo producto, otro control</h2>
        <p>Ambas instancias comparten el estado confirmado por el servidor.</p>
        <FavoriteControl productId="PRD-1" announce={false} />
        <details className="wishlist-test-actions"><summary>Acciones idempotentes de prueba</summary>
          <p>Estas acciones permiten repetir POST/DELETE incluso cuando el toggle ya cambió.</p>
          <Button variant="tertiary" disabled={!session.identity || sessionBusy || !!items["PRD-1"]?.pending}
            onClick={() => { void mutate("PRD-1", "save"); }}>Repetir POST de PRD-1</Button>
          <Button variant="tertiary" disabled={!session.identity || sessionBusy || !!items["PRD-1"]?.pending}
            onClick={() => { void mutate("PRD-1", "remove"); }}>Repetir DELETE de PRD-1</Button>
        </details>
      </section>
    </div>
    <section aria-labelledby="negative-heading"><h2 id="negative-heading">Escenarios negativos del sandbox</h2>
      <div className="wishlist-demo-grid">{[
        ["PRD-INACTIVE", "Producto inactivo", "Debe responder 404; no se guarda."],
        ["PRD-MISSING", "Producto inexistente", "Debe responder 404; no se guarda."],
        ["PRD-UNAVAILABLE", "Proveedor no disponible", "Debe responder 503; permite reintentar."],
      ].map(([id, name, description]) => <section className="wishlist-demo-card" key={id} aria-label={name}>
        <h3>{name}</h3><p>{id} · {description}</p><FavoriteControl productId={id} />
      </section>)}</div>
    </section>
    <p className="wishlist-notice">Quitar se confirma únicamente con HTTP 204. Deshacer no forma parte de este corte: G-UNDO sigue abierto.</p>
  </div>;
}
