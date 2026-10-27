import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import { formatCheckoutMoney } from "./fixtures";
import type { CheckoutOperation, Contact } from "./api";
import type { CheckoutQuote } from "./fixtures";

type PaymentSimulationFormProps = {
  consented: boolean;
  busy: boolean;
  disabled: boolean;
  hasPreparationAttempt: boolean;
  total: number;
  onConsentChange: (consented: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function PaymentSimulationForm({ consented, busy, disabled, hasPreparationAttempt, total, onConsentChange, onSubmit, onBack }: PaymentSimulationFormProps) {
  return <section className="checkout-card" aria-labelledby="prepare-title">
    <h2 id="prepare-title">Pago simulado</h2>
    <p>Al continuar, registraremos tu consentimiento. El pedido aún no existe y no se inicia un cobro real.</p>
    <label className="checkout-consent"><input type="checkbox" checked={consented} onChange={(event) => onConsentChange(event.target.checked)} />Entiendo que esta compra es una simulación y no habrá cobro real.</label>
    <p>Total estimado: <strong>{formatCheckoutMoney(total)}</strong></p>
    <div className="checkout-actions"><Button variant="tertiary" onClick={onBack}>Volver al resumen</Button><Button onClick={onSubmit} loading={busy} disabled={disabled}>{hasPreparationAttempt ? "Reintentar misma preparación" : "Registrar consentimiento"}</Button></div>
  </section>;
}

type PreparationOutcomeProps = Pick<PaymentSimulationFormProps, "consented" | "busy" | "hasPreparationAttempt" | "onConsentChange" | "onSubmit" | "onBack"> & { quote: CheckoutQuote; expired: boolean; quoteInvalid: boolean };

export function PreparationOutcome({ quote, consented, busy, expired, quoteInvalid, hasPreparationAttempt, onConsentChange, onSubmit, onBack }: PreparationOutcomeProps) {
  return <PaymentSimulationForm consented={consented} busy={busy} disabled={!consented || expired || quoteInvalid} hasPreparationAttempt={hasPreparationAttempt} total={quote.total} onConsentChange={onConsentChange} onSubmit={onSubmit} onBack={onBack} />;
}

type OrderCreationFormProps = {
  contact: Contact;
  busy: boolean;
  onContactChange: (contact: Contact) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export function OrderCreationForm({ contact, busy, onContactChange, onSubmit, onBack }: OrderCreationFormProps) {
  const change = (field: keyof Contact) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onContactChange({ ...contact, [field]: event.target.value } as Contact);
  return <form className="checkout-form" onSubmit={onSubmit}>
    <TextField label="Nombre completo" required minLength={2} maxLength={120} value={contact.fullName} onChange={change("fullName")} />
    <label className="checkout-label" htmlFor="documentType">Tipo de documento</label>
    <select id="documentType" value={contact.documentType} onChange={change("documentType")}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option></select>
    <TextField label="Número de documento" required minLength={5} maxLength={24} hint="Ingresa entre 5 y 24 caracteres. La misma longitud aplica a todos los tipos de documento." value={contact.documentNumber} onChange={change("documentNumber")} />
    <TextField label="Teléfono" type="tel" required minLength={5} maxLength={40} value={contact.phone} onChange={change("phone")} />
    <TextField label="Correo electrónico" type="email" required maxLength={254} value={contact.email} onChange={change("email")} />
    <div className="checkout-actions"><Button variant="tertiary" onClick={onBack}>Volver al resumen</Button><Button type="submit" loading={busy}>Crear pedido</Button></div>
  </form>;
}

export function OrderSubmissionStatus({ state, message, busy, onVerify, onContinue }: { state: "READY" | "UNCERTAIN" | "REJECTED"; message: string; busy: boolean; onVerify: () => void; onContinue: () => void }) {
  if (state === "UNCERTAIN") return <><p role="status" className="checkout-notice">{message}</p><div className="checkout-actions"><Button onClick={onVerify} loading={busy}>Verificar operación original</Button></div></>;
  if (state === "REJECTED") return <><p role="alert" className="checkout-error">{message || "La operación no se completó y no fue confirmada como pagada."}</p><div className="checkout-actions"><Button onClick={onContinue}>Seguir comprando</Button></div></>;
  return message ? <p role="status" className="checkout-notice">{message}</p> : null;
}

type OrderConfirmationSummaryProps = {
  orderId: string;
  operationId: string;
  operation: CheckoutOperation | null;
  quote: CheckoutQuote | null;
  backendMockEnabled: boolean;
  copyMessage: string;
  onCopy: () => void;
};

export function OrderConfirmationSummary({ orderId, operationId, operation, quote, backendMockEnabled, copyMessage, onCopy }: OrderConfirmationSummaryProps) {
  return <section className="checkout-card checkout-success" aria-labelledby="confirmed-title">
    <p className="checkout-success-tag">{backendMockEnabled ? "Estado verificado · SUCCEEDED/PAGADO" : "Resultado de fixture · SUCCEEDED/PAGADO"}</p>
    <h2 id="confirmed-title">¡Pedido confirmado!</h2>
    <p>{backendMockEnabled ? "El Backend MOCK confirmó el estado PAGADO. No hubo cobro real." : "Este escenario local simula una respuesta verificada de Ventas. No se llamó al Backend y no hubo cobro real."}</p>
    <dl className="checkout-totals"><div><dt>Código de pedido</dt><dd><code>{orderId}</code></dd></div><div><dt>Estado</dt><dd>PAGADO{backendMockEnabled ? "" : " (fixture)"}</dd></div><div className="checkout-total"><dt>Total confirmado</dt><dd>{formatCheckoutMoney(operation?.orderTotal ?? quote?.total ?? 0)}</dd></div>{operation?.orderCreatedAt && <div><dt>Fecha del pedido</dt><dd>{new Date(operation.orderCreatedAt).toLocaleString("es-PE")}</dd></div>}</dl>
    <h3>Resumen de productos</h3><ul className="checkout-lines" aria-label="Productos del pedido">{quote?.lines.map((line) => <li key={line.sku}>{line.sku} × {line.quantity}</li>)}</ul>
    <div className="checkout-actions"><Button variant="secondary" onClick={onCopy} aria-label={`Copiar código de pedido ${orderId}`}>Copiar código</Button>{backendMockEnabled && operation && <Link className="button button--secondary button--md" href={`/checkout/confirmado/${encodeURIComponent(orderId)}?operationId=${encodeURIComponent(operationId)}`}>Ver mi pedido</Link>}<Button onClick={() => window.location.assign("/")}>Seguir comprando</Button></div>
    {copyMessage && <p role="status" aria-live="polite">{copyMessage}</p>}<p className="checkout-muted">Operación de prueba {operationId.slice(0, 8)}…</p>
  </section>;
}

export function OrderConfirmationContainer(props: OrderConfirmationSummaryProps) {
  return <OrderConfirmationSummary {...props} />;
}
