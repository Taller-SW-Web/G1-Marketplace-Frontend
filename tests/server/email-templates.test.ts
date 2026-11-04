import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmailOrderSummary, renderOrderConfirmationEmail, renderShipmentUpdateEmail, TransactionalEmailTemplate } from "../../src/features/orders/email-templates";

describe("server-only order email templates", () => {
  it("escapes dynamic order content and returns useful text when items are absent", () => {
    const result = renderOrderConfirmationEmail({
      orderId: "PED-2026-00001", orderState: "PAGADO", createdAt: "2026-10-10T10:00:00Z",
      total: { amount: 35, currency: "PEN" }, orderDetailUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00001",
      supportUrl: "https://help.example.test/contact", items: [{ name: "<script>alert(1)</script>", quantity: 1 }],
    });
    expect(result.subject).toContain("PED-2026-00001");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).not.toContain("<script>");
    expect(result.text).toContain("Ver mi pedido:");
    expect(result.html).toContain("Tu pedido fue confirmado");
  });

  it("cannot render C-001 for a created but unpaid order", () => {
    expect(() => renderOrderConfirmationEmail({
      orderId: "PED-2026-00001", orderState: "CREADO" as "PAGADO", createdAt: "2026-10-10T10:00:00Z",
      total: { amount: 35, currency: "PEN" }, orderDetailUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00001",
      supportUrl: "https://help.example.test/contact",
    })).toThrow("verified paid order");
  });

  it("omits an unavailable estimate and rejects a non-Marketplace CTA", () => {
    const result = renderShipmentUpdateEmail({ orderId: "PED-2026-00002", stateLabel: "Despachado", occurredAt: "2026-10-10T10:00:00Z", trackingUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00002/seguimiento" });
    expect(result.html).not.toContain("Entrega estimada");
    expect(() => renderShipmentUpdateEmail({ orderId: "PED-2026-00002", stateLabel: "Despachado", occurredAt: "2026-10-10T10:00:00Z", trackingUrl: "https://evil.example/" })).toThrow();
  });

  it("exposes the specified React server components without adding client scripts", () => {
    const summary = createElement(EmailOrderSummary, {
      summary: {
        orderId: "PED-2026-00003", orderState: "PAGADO", createdAt: "2026-10-10T10:00:00Z",
        total: { amount: 12, currency: "PEN" },
      },
      orderUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00003",
      supportUrl: "https://help.example.test/contact",
    });
    const markup = renderToStaticMarkup(createElement(TransactionalEmailTemplate, {
      payload: {
        orderId: "PED-2026-00003", orderState: "PAGADO", createdAt: "2026-10-10T10:00:00Z",
        total: { amount: 12, currency: "PEN" }, orderDetailUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00003",
        supportUrl: "https://help.example.test/contact",
      },
      payloadVersion: "C-001-v1", type: "C-001", children: summary,
    }));
    expect(markup).toContain("<html lang=\"es\">");
    expect(markup).toContain("Tu pedido fue confirmado");
    expect(markup).not.toMatch(/<script\b|onload=/i);
    expect(() => TransactionalEmailTemplate({
      payload: {
        orderId: "PED-2026-00003", orderState: "PAGADO", createdAt: "2026-10-10T10:00:00Z",
        total: { amount: 12, currency: "PEN" }, orderDetailUrl: "http://127.0.0.1:3000/mis-pedidos/PED-2026-00003",
        supportUrl: "https://help.example.test/contact",
      },
      payloadVersion: "C-002-v1", type: "C-001", children: summary,
    })).toThrow("Unsupported email template version");
  });
});
