import "server-only";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type CurrencyAmount = { amount: number; currency: string };
export type OrderConfirmationEmail = {
  orderId: string;
  orderState: "PAGADO";
  createdAt: string;
  total: CurrencyAmount;
  orderDetailUrl: string;
  supportUrl: string;
  items?: Array<{ name: string; quantity: number }>;
};
export type ShipmentUpdateEmail = {
  orderId: string;
  stateLabel: string;
  occurredAt: string;
  trackingUrl: string;
  estimatedDelivery?: string;
  publicMessage?: string;
};
export type RenderedEmail = { subject: string; html: string; text: string };

export type MinimalOrderEmailDTO = {
  orderId: string;
  orderState: "PAGADO";
  createdAt: string;
  total: CurrencyAmount;
  items?: Array<{ name: string; quantity: number }>;
};
export type EmailTemplatePayload = OrderConfirmationEmail | ShipmentUpdateEmail;
export type EmailTemplateType = "C-001" | "C-002";

function safeUrl(value: string, sameOrigin = true) {
  const url = new URL(value);
  const configuredOrigin = process.env.G1_WEB_ORIGIN ?? (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3000" : "");
  if (url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Email URL must be a safe internal HTTPS URL");
  }
  if (sameOrigin && (!configuredOrigin || url.origin !== configuredOrigin)) throw new Error("Email CTA must use the configured Marketplace origin");
  return url.toString();
}
function safeHeader(value: string) {
  const clean = value.trim();
  if (!clean || clean.length > 180 || /[\r\n]/.test(clean)) throw new Error("Invalid email subject field");
  return clean;
}
function localDate(value: string, time = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid email date");
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "America/Lima" }).format(date);
}
function amount(value: CurrencyAmount) {
  if (!Number.isFinite(value.amount) || value.amount < 0 || !/^[A-Z]{3}$/.test(value.currency)) throw new Error("Invalid historical total");
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: value.currency }).format(value.amount);
}
function assertOrderId(value: string) {
  const orderId = safeHeader(value);
  if (!/^[A-Za-z0-9-]{1,100}$/.test(orderId)) throw new Error("Invalid order ID");
  return orderId;
}

/** Server-rendered C-001 order summary. React escapes every dynamic text node. */
export function EmailOrderSummary({ summary, orderUrl, supportUrl }: {
  summary: MinimalOrderEmailDTO;
  orderUrl: string;
  supportUrl: string;
}) {
  const orderId = assertOrderId(summary.orderId);
  if (summary.orderState !== "PAGADO") throw new Error("Order confirmation requires a verified paid order");
  const safeOrderUrl = safeUrl(orderUrl);
  const safeSupportUrl = safeUrl(supportUrl, false);
  const total = amount(summary.total);
  const date = localDate(summary.createdAt);
  const items = (summary.items ?? []).slice(0, 10);
  if (items.some((item) => !item.name.trim() || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("Invalid email item");
  }
  return createElement("section", null,
    createElement("h1", null, "Tu pedido fue confirmado"),
    createElement("p", null, "Gracias por comprar con nosotros. Puedes revisar el estado y los detalles de tu pedido cuando quieras."),
    createElement("p", null,
      createElement("strong", null, "Pedido:"), " ", orderId, createElement("br"),
      createElement("strong", null, "Estado:"), " Confirmado", createElement("br"),
      createElement("strong", null, "Fecha:"), " ", date, createElement("br"),
      createElement("strong", null, "Total:"), " ", total),
    items.length > 0 ? createElement("section", null,
      createElement("h2", null, "Productos"),
      createElement("ul", null, ...items.map((item, index) => createElement("li", { key: `${index}-${item.quantity}` }, `${item.name} · Cantidad: ${item.quantity}`)))) : null,
    createElement("p", null, createElement("a", { href: safeOrderUrl }, "Ver mi pedido")),
    createElement("p", null, "Si no reconoces este pedido, ", createElement("a", { href: safeSupportUrl }, "comunícate con nuestros canales oficiales de ayuda"), "."));
}

/** Server-only, non-interactive email document shared by C-001 and C-002. */
export function TransactionalEmailTemplate({ payload, payloadVersion, type, children }: {
  payload: EmailTemplatePayload;
  payloadVersion: string;
  type: EmailTemplateType;
  children: ReactNode;
}) {
  const expectedVersion = type === "C-001" ? "C-001-v1" : "C-002-v1";
  if (payloadVersion !== expectedVersion) throw new Error("Unsupported email template version");
  if ((type === "C-001" && !("orderState" in payload)) || (type === "C-002" && !("stateLabel" in payload))) {
    throw new Error("Email template payload does not match its type");
  }
  const preheader = type === "C-001" ? "Tu compra fue confirmada. Consulta aquí sus detalles." : "Consulta el estado y la fecha estimada de tu entrega.";
  return createElement("html", { lang: "es" },
    createElement("head", null,
      createElement("meta", { charSet: "utf-8" }),
      createElement("meta", { name: "viewport", content: "width=device-width" }),
      createElement("title", null, "Marketplace")),
    createElement("body", null,
      createElement("div", { style: { display: "none", maxHeight: 0, overflow: "hidden" } }, preheader),
      createElement("main", { style: { maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "Arial, sans-serif", color: "#17212b" } },
        createElement("header", null, createElement("strong", null, "Inka Athletics · Marketplace")),
        children,
        createElement("footer", null, createElement("p", null, "Recibes este mensaje por una actividad de tu cuenta de Marketplace.")))));
}

/** Server-only C-002 renderer. This does not subscribe to events or send email. */
export function ShipmentEmailTemplate({ payload, trackingUrl }: { payload: ShipmentUpdateEmail; trackingUrl?: string }) {
  const orderId = assertOrderId(payload.orderId);
  const stateLabel = safeHeader(payload.stateLabel);
  const safeTrackingUrl = safeUrl(trackingUrl ?? payload.trackingUrl);
  const occurred = localDate(payload.occurredAt, true);
  const estimated = payload.estimatedDelivery ? localDate(payload.estimatedDelivery) : undefined;
  const message = payload.publicMessage?.trim();
  return createElement("section", null,
    createElement("h1", null, "Tu pedido tiene una actualización"),
    createElement("p", null,
      createElement("strong", null, "Pedido:"), " ", orderId, createElement("br"),
      createElement("strong", null, "Estado:"), " ", stateLabel, createElement("br"),
      createElement("strong", null, "Actualizado el:"), " ", occurred),
    estimated ? createElement("p", null, createElement("strong", null, "Entrega estimada:"), " ", estimated) : null,
    message ? createElement("p", null, message) : null,
    createElement("p", null, createElement("a", { href: safeTrackingUrl }, "Ver seguimiento")),
    createElement("p", null, "Consulta el seguimiento para ver la información más reciente."));
}

/** Deterministic C-001 render. Rendering content does not enqueue or send an email. */
export function renderOrderConfirmationEmail(input: OrderConfirmationEmail): RenderedEmail {
  const orderId = assertOrderId(input.orderId);
  const total = amount(input.total);
  if (input.orderState !== "PAGADO") throw new Error("Order confirmation requires a verified paid order");
  const orderUrl = safeUrl(input.orderDetailUrl);
  const supportUrl = safeUrl(input.supportUrl, false);
  const date = localDate(input.createdAt);
  const subject = `Tu pedido ${orderId} fue confirmado`;
  const html = `<!doctype html>${renderToStaticMarkup(createElement(TransactionalEmailTemplate, {
    payload: input, payloadVersion: "C-001-v1", type: "C-001",
    children: createElement(EmailOrderSummary, { summary: input, orderUrl, supportUrl }),
  }))}`;
  const text = `${subject}\n\nTu pedido fue confirmado. Gracias por comprar con nosotros.\nPedido: ${orderId}\nEstado: Confirmado\nFecha: ${date}\nTotal: ${total}${input.items?.length ? `\nProductos:\n${input.items.slice(0, 10).map((item) => `- ${item.name} · Cantidad: ${item.quantity}`).join("\n")}` : ""}\nVer mi pedido: ${orderUrl}\nAyuda: ${supportUrl}`;
  return { subject, html, text };
}

/** Deterministic C-002 render. Rendering content does not enqueue or send an email. */
export function renderShipmentUpdateEmail(input: ShipmentUpdateEmail): RenderedEmail {
  const orderId = assertOrderId(input.orderId);
  const stateLabel = safeHeader(input.stateLabel);
  const trackingUrl = safeUrl(input.trackingUrl);
  const occurred = localDate(input.occurredAt, true);
  const estimated = input.estimatedDelivery ? localDate(input.estimatedDelivery) : undefined;
  const message = input.publicMessage?.trim();
  const subject = `Actualización de tu pedido ${orderId}: ${stateLabel}`;
  const html = `<!doctype html>${renderToStaticMarkup(createElement(TransactionalEmailTemplate, {
    payload: input, payloadVersion: "C-002-v1", type: "C-002",
    children: createElement(ShipmentEmailTemplate, { payload: input, trackingUrl }),
  }))}`;
  const text = `${subject}\n\nTu pedido tiene una actualización.\nPedido: ${orderId}\nEstado: ${stateLabel}\nActualizado el: ${occurred}${estimated ? `\nEntrega estimada: ${estimated}` : ""}${message ? `\n${message}` : ""}\nVer seguimiento: ${trackingUrl}`;
  return { subject, html, text };
}
