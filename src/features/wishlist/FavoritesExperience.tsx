"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FavoritesList } from "./FavoritesList";
import { FavoritesHeading } from "./FavoritesHeading";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import type { FavoritesController, FavoritesState, Notice } from "./FavoritesController";

export function FavoritesLoading() {
  return <div className="favorites-list">
    <FavoritesHeading description="Estamos cargando tus productos guardados." />
    <LoadingState label="Cargando tus favoritos" className="favorites-loading">
      <div className="favorites-progress" />
      {[0, 1, 2].map(index => <div className="favorites-skeleton" key={index}>
        <Skeleton className="favorites-skeleton-image" />
        <div className="favorites-skeleton-copy"><Skeleton variant="line" /><Skeleton variant="line" /><Skeleton variant="line" /></div>
        <Skeleton className="favorites-skeleton-action" />
      </div>)}
    </LoadingState>
  </div>;
}

function NoticeView({ notice, controller }: { notice: Notice; controller: FavoritesController }) {
  const action = () => {
    if (!notice.productId) return;
    if (notice.action === "remove") void controller.remove(notice.productId, true);
    if (notice.action === "restore") void controller.restore(notice.productId);
  };
  const icon = notice.kind === "success" ? "check" : notice.kind === "error" ? "alert" : "info";
  return <div className={`favorites-notice favorites-notice--${notice.kind}`}>
    <img src={`/figma/favorite-${icon}-20.svg`} width="20" height="20" alt="" />
    <div role={notice.kind === "error" ? "alert" : "status"}><strong>{notice.title}</strong><p>{notice.message}</p></div>
    {notice.action === "catalog" ? <Link className="text-link" href="/catalogo">Explorar productos</Link>
      : notice.action && <Button variant="tertiary" disabled={!!notice.productId && ["removing", "restoring"].includes(controller.getSnapshot().pending[notice.productId])} onClick={action}>
        {notice.title.includes("sin confirmar") || notice.title.includes("confirmar") ? "Comprobar resultado" : "Reintentar"}
      </Button>}
    {!notice.action && <Button variant="tertiary" aria-label={`Cerrar aviso: ${notice.title}`} onClick={() => controller.dismiss(notice.id, true)}>×</Button>}
  </div>;
}

export function FavoritesExperience({ state, controller, returnPath = "/favoritos" }: {
  state: FavoritesState; controller: FavoritesController; returnPath?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.focus) return;
    const card = [...(root.current?.querySelectorAll<HTMLElement>("[data-favorite-id]") ?? [])].find(node => node.dataset.favoriteId === state.focus!.productId);
    const target = card?.querySelector<HTMLElement>("h3") ?? root.current?.querySelector<HTMLElement>(".favorites-empty h2") ?? root.current?.querySelector<HTMLElement>("#favorites-title");
    target?.setAttribute("tabindex", "-1"); target?.focus();
  }, [state.focus]);
  const feedback = <>
    {state.queryError && state.items.length > 0 && <div className="favorites-notice favorites-notice--error"><p role="alert">{state.queryError} Tus productos visibles se conservan.</p><Button onClick={() => void controller.load()}>Reintentar consulta</Button></div>}
    {state.notices.map(notice => <NoticeView key={notice.id} notice={notice} controller={controller} />)}
  </>;
  if (state.expired) return <div ref={root}><FavoritesHeading description="Tu sesión terminó." /><EmptyState className="favorites-empty" title="Inicia sesión para continuar" description="Ocultamos tus favoritos para proteger tu información." actions={<Button disabled title="Próximamente">Iniciar sesión</Button>} /></div>;
  if (state.status === "loading") return <FavoritesLoading />;
  if (state.status === "error" && !state.items.length) return <div className="favorites-list" ref={root}>
    <FavoritesHeading description="No pudimos consultar la disponibilidad de tus productos." />
    <EmptyState className="favorites-empty favorites-query-error" title="No pudimos cargar tus favoritos" description={state.queryError}
      icon={<img src="/figma/favorite-cloud-off-32.svg" width="32" height="32" alt="" />}
      actions={<Button onClick={() => void controller.load()}>Reintentar</Button>} />
  </div>;
  return <div ref={root}>
    <FavoritesList products={state.items} pending={state.pending} feedback={feedback} returnPath={returnPath}
      onRemove={product => void controller.remove(product.productId)} />
    <div className="favorites-toasts" aria-label="Eliminaciones recientes">
      {state.undos.slice(0, 3).map(undo => {
        const id = undo.product.productId;
        const pending = state.pending[id];
        return <div key={id} className="favorites-undo" onMouseEnter={() => controller.pauseUndo(id, true)}
          onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) controller.pauseUndo(id, false); }}
          onFocusCapture={() => controller.pauseUndo(id, true)}
          onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !event.currentTarget.matches(":hover")) controller.pauseUndo(id, false); }}>
          <span className="favorites-undo-icon"><img src="/figma/favorite-undo-17.svg" width="17" height="17" alt="" /></span>
          <div><strong role="status">{pending === "restoring" ? "Restaurando…" : undo.cannotRestore ? "Producto no restaurado" : undo.failed ? "Restauración pendiente" : "Eliminado de favoritos"}</strong><p>{undo.product.name}</p>
            {!undo.failed && <small>Disponible 5 s; se pausa al interactuar.</small>}</div>
          {!undo.cannotRestore && <Button variant="tertiary" disabled={pending === "restoring"} onClick={() => void controller.restore(id)}>{undo.failed ? "Reintentar" : "Deshacer"}</Button>}
          <Button variant="tertiary" disabled={!!pending} aria-label={`Cerrar eliminación de ${undo.product.name}`} onClick={() => controller.closeUndo(id)}><img src="/figma/favorite-close-15.svg" width="15" height="15" alt="" /></Button>
        </div>;
      })}
      {state.undos.length > 3 && <p className="sr-only">Hay {state.undos.length - 3} avisos pendientes. Su tiempo todavía no ha comenzado.</p>}
    </div>
  </div>;
}
