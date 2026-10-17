"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { backendMockEnabled, checkoutApi, checkoutErrorMessage, isVerifiedPaidOperation, type CheckoutOperation } from "./api";
import { formatCheckoutMoney } from "./fixtures";

type LookupState = "loading" | "paid" | "pending" | "failed" | "error" | "fixture";

export function OrderConfirmationLookup({ orderId, operationId }: { orderId: string; operationId?: string }) {
  const [state, setState] = useState<LookupState>(backendMockEnabled ? (operationId ? "loading" : "error") : "fixture");
  const [operation, setOperation] = useState<CheckoutOperation | null>(null);
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!backendMockEnabled || !operationId) return;
    let active = true;
    checkoutApi.getOperation(operationId).then((result) => {
      if (!active) return;
      if (result.orderId && result.orderId !== orderId) {
        setState("error");
        setMessage("No pudimos verificar este pedido para la operación indicada.");
        return;
      }
      setOperation(result);
      if (isVerifiedPaidOperation(result) && result.orderId === orderId) {
        setState("paid");
      } else if (result.state === "FAILED" || result.orderState === "ANULADO") {
        setState("failed");
      } else {
        setState("pending");
      }
    }).catch((error: unknown) => {
      if (!active) return;
      setState("error");
      setMessage(checkoutErrorMessage(error, "No pudimos verificar el estado del pedido."));
    });
    return () => { active = false; };
  }, [operationId, orderId, reloadKey]);

  async function copyOrderCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(orderId);
      setMessage("Código de pedido copiado.");
    } catch {
      setMessage("No pudimos copiarlo. Puedes seleccionar el código y copiarlo manualmente.");
    }
  }

  return (
    <main className="checkout-page container">
      <header className="checkout-heading">
        <p className="checkout-eyebrow">{backendMockEnabled ? "Consulta verificada · entorno local" : "Fixture local"}</p>
        <h1>Estado del pedido</h1>
      </header>
      <section className="checkout-card" aria-live="polite">
        {state === "loading" && <p role="status">Consultando el estado del pedido…</p>}
        {state === "paid" && operation && <div className="checkout-success">
          <p className="checkout-success-tag">Estado verificado · SUCCEEDED/PAGADO</p>
          <h2>¡Pedido confirmado!</h2>
          <p>Ventas confirmó el pago simulado. No hubo cobro real.</p>
          <dl className="checkout-totals">
            <div><dt>Código de pedido</dt><dd><code>{orderId}</code></dd></div>
            <div><dt>Estado</dt><dd>PAGADO</dd></div>
            <div className="checkout-total"><dt>Total confirmado</dt><dd>{formatCheckoutMoney(operation.orderTotal!)}</dd></div>
            <div><dt>Fecha del pedido</dt><dd>{new Date(operation.orderCreatedAt!).toLocaleString("es-PE")}</dd></div>
          </dl>
          <div className="checkout-actions">
            <Button variant="secondary" onClick={copyOrderCode} aria-label={`Copiar código de pedido ${orderId}`}>Copiar código</Button>
            <Button onClick={() => window.location.assign("/catalogo")}>Seguir comprando</Button>
          </div>
        </div>}
        {state === "pending" && <div>
          <h2>Estamos verificando tu pedido</h2>
          <p role="status">El pedido aún no tiene un resultado final confirmado. No se mostrará como compra pagada.</p>
          <Button variant="secondary" onClick={() => { setState("loading"); setReloadKey((key) => key + 1); }}>Verificar pedido</Button>
        </div>}
        {state === "failed" && <div>
          <h2>No se confirmó el pago simulado</h2>
          <p role="alert">Ventas informó que el pedido fue anulado. No vuelvas a enviar esta operación.</p>
          <Button onClick={() => window.location.assign("/catalogo")}>Seguir comprando</Button>
        </div>}
        {state === "error" && <div>
          <h2>No pudimos verificar el pedido</h2>
          <p role="alert">{message || "No hay una operación verificable asociada a este código."}</p>
          {operationId && <Button variant="secondary" onClick={() => { setState("loading"); setReloadKey((key) => key + 1); }}>Reintentar verificación</Button>}
        </div>}
        {state === "fixture" && <div>
          <h2>Este resultado es una fixture local</h2>
          <p>No se creó un pedido real ni hay un estado de Ventas que podamos verificar.</p>
        </div>}
        {message && state === "paid" && <p role="status">{message}</p>}
        <p><Link href="/checkout">Volver a Checkout</Link></p>
      </section>
    </main>
  );
}
