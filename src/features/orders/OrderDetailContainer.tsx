"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { OrdersRequestError, readOrderDetail, reorderOrder, type ReorderResponse } from "./api";
import type { OrderDetail } from "./types";
import { HistoricalOrderLines } from "./HistoricalOrderLines";
import { OrderStateTimeline } from "./OrderStateTimeline";
import { OrderDeliverySummary } from "./OrderDeliverySummary";
import { ReorderAction, ReorderResultDialog } from "./ReorderAction";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);
}

export function OrderDetailContainer({ orderId, reorderEnabled = false }: { orderId: string; reorderEnabled?: boolean }) {
  const router = useRouter();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderResult, setReorderResult] = useState<ReorderResponse | null>(null);
  const [reordering, setReordering] = useState(false);
  const reorderKey = useRef<{ orderId: string; key: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); setError(null);
    readOrderDetail(orderId, controller.signal).then(setDetail).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof OrdersRequestError
        ? { code: reason.code, message: reason.message }
        : { code: "ORDER_UNAVAILABLE", message: "No pudimos cargar el detalle. Inténtalo nuevamente." });
    });
    return () => controller.abort();
  }, [orderId, retry]);

  async function handleReorder() {
    setReordering(true); setReorderError(null); setReorderResult(null);
    const key = reorderKey.current?.orderId === orderId
      ? reorderKey.current.key
      : crypto.randomUUID();
    reorderKey.current = { orderId, key };
    try {
      const result = await reorderOrder(orderId, key);
      reorderKey.current = null;
      setReorderResult(result);
    }
    catch (reason) {
      setReorderError(reason instanceof OrdersRequestError ? reason.message : "No pudimos volver a agregar los productos.");
    } finally { setReordering(false); }
  }

  return <main className="order-detail-page">
    <nav className="orders-breadcrumb" aria-label="Ruta de navegación">
      <Link href="/">Inicio</Link><span aria-hidden="true">›</span><Link href="/mis-pedidos">Mis pedidos</Link><span aria-hidden="true">›</span><span aria-current="page">Detalle</span>
    </nav>
    <header className="orders-heading"><h1>Detalle del pedido</h1><p>{orderId}</p></header>
    {!detail && !error && <p role="status" aria-live="polite">Cargando detalle del pedido…</p>}
    {error && <EmptyState className="orders-error" title={error.code === "ORDER_NOT_AVAILABLE" ? "Pedido no disponible" : "No pudimos cargar el pedido"} description={error.message} actions={<Button variant="primary" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>} />}
    {detail && <>
      <section className="order-detail-section" aria-labelledby="order-summary-title">
        <h2 id="order-summary-title">Resumen</h2>
        <dl className="order-detail-summary"><div><dt>Estado</dt><dd>{detail.state.replaceAll("_", " ")}</dd></div><div><dt>Fecha</dt><dd>{new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(new Date(detail.createdAt))}</dd></div><div><dt>Total histórico</dt><dd>{money(detail.total.amount, detail.total.currency)}</dd></div></dl>
      </section>
      <HistoricalOrderLines lines={detail.lines} />
      {detail.shipping && <OrderDeliverySummary shipping={detail.shipping} />}
      <OrderStateTimeline milestones={detail.milestones} />
      {!["CREADO", "PAGADO", "EN_PREPARACION", "ANULADO"].includes(detail.state) && <p><Link className="button button--secondary button--md" href={`/mis-pedidos/${encodeURIComponent(orderId)}/seguimiento`}>Ver seguimiento</Link></p>}
      {reorderEnabled && detail.state !== "CREADO" && detail.state !== "ANULADO" && <section className="order-detail-section">
        <ReorderAction busy={reordering} onReorder={handleReorder} />
        {reorderError && <p role="alert">{reorderError}</p>}
      </section>}
      {reorderResult && <ReorderResultDialog result={reorderResult} opened onViewCart={() => router.push("/carrito")} onClose={() => setReorderResult(null)} />}
    </>}
  </main>;
}
