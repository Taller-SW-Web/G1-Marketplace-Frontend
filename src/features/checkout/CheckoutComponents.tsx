import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import { formatCheckoutMoney, type CheckoutAddress } from "./fixtures";
import type { CheckoutOperation, Contact } from "./api";
import type { CheckoutQuote } from "./fixtures";
import { CheckoutOrderSummary } from "./CheckoutSteps";

const checkoutSteps = ["Dirección", "Resumen", "Pago", "Confirmación"];

export function CheckoutProgress({ currentStep }: { currentStep: number }) {
  return <nav className="checkout-progress-nav" aria-label="Progreso de compra">
    <ol className="checkout-progress">
      {checkoutSteps.map((label, index) => {
        const complete = index < currentStep;
        const current = index === currentStep;
        return <li key={label} className={`${complete ? "is-complete" : ""}${current ? " is-current" : ""}`.trim()}
          aria-current={current ? "step" : undefined}>
          <span className="checkout-progress-marker" aria-hidden="true">{complete ? "✓" : index + 1}</span>
          <span className="checkout-progress-label">{label}</span>
        </li>;
      })}
    </ol>
  </nav>;
}

export function CheckoutSummaryAside({ quote, address }: { quote: CheckoutQuote; address?: CheckoutAddress }) {
  return <aside className="checkout-summary-aside" aria-labelledby="checkout-aside-title">
    <h2 id="checkout-aside-title">Resumen de tu compra</h2>
    <CheckoutOrderSummary quote={quote} address={address} />
  </aside>;
}

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
    <h2 id="prepare-title">Confirma la simulación</h2>
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
  errors: ContactFieldErrors;
  busy: boolean;
  focusErrorRequest: number;
  onContactChange: (contact: Contact, changedField: ContactField) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export type ContactField = keyof Contact;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export function OrderCreationForm({ contact, errors, busy, focusErrorRequest, onContactChange, onSubmit, onBack }: OrderCreationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [localErrorFocusRequest, setLocalErrorFocusRequest] = useState(0);

  const clientErrors = Object.fromEntries((Object.keys(contact) as ContactField[])
    .map((field) => [field, validateContactField(field, contact[field])])
    .filter((entry): entry is [ContactField, string] => Boolean(entry[1]))) as ContactFieldErrors;
  const visibleErrors: ContactFieldErrors = Object.fromEntries((Object.keys(contact) as ContactField[])
    .map((field) => [field, errors[field] ?? ((touched[field] || submitAttempt > 0) ? clientErrors[field] : undefined)])
    .filter((entry): entry is [ContactField, string] => Boolean(entry[1]))) as ContactFieldErrors;
  const errorLabels: Record<ContactField, string> = {
    fullName: "Nombre completo", documentType: "Tipo de documento", documentNumber: "Número de documento",
    phone: "Teléfono", email: "Correo electrónico",
  };

  useEffect(() => {
    if (focusErrorRequest > 0) errorSummaryRef.current?.focus();
  }, [focusErrorRequest]);
  useEffect(() => {
    if (localErrorFocusRequest > 0) errorSummaryRef.current?.focus();
  }, [localErrorFocusRequest]);

  const change = (field: ContactField) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onContactChange({ ...contact, [field]: event.target.value } as Contact, field);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSubmitAttempt((attempt) => attempt + 1);
    setTouched(Object.fromEntries((Object.keys(contact) as ContactField[]).map((field) => [field, true])));
    if (Object.keys(clientErrors).length > 0) {
      setLocalErrorFocusRequest((request) => request + 1);
      return;
    }
    onSubmit(event);
  }

  const fieldId = (field: ContactField) => `checkout-contact-${field}`;

  return <form ref={formRef} className="checkout-form" onSubmit={submit} noValidate aria-busy={busy || undefined}>
    {Object.keys(visibleErrors).length > 0 && <div ref={errorSummaryRef} className="checkout-error-summary" role="alert"
      tabIndex={-1} aria-labelledby="checkout-contact-error-title">
      <h3 id="checkout-contact-error-title">Revisa los datos de contacto</h3>
      <ul>{(Object.keys(contact) as ContactField[]).filter((field) => visibleErrors[field]).map((field) =>
        <li key={field}><a href={`#${fieldId(field)}`}>{errorLabels[field]}: {visibleErrors[field]}</a></li>)}</ul>
    </div>}
    <TextField id={fieldId("fullName")} name="fullName" label="Nombre completo" autoComplete="name" required minLength={2} maxLength={120}
      value={contact.fullName} error={visibleErrors.fullName} onChange={change("fullName")}
      onBlur={() => setTouched((current) => ({ ...current, fullName: true }))} />
    <label className="checkout-label" htmlFor={fieldId("documentType")}>Tipo de documento</label>
    <select id={fieldId("documentType")} name="documentType" value={contact.documentType} onChange={change("documentType")}
      disabled={busy} aria-invalid={visibleErrors.documentType ? true : undefined}
      aria-describedby={visibleErrors.documentType ? `${fieldId("documentType")}-error` : undefined}
      aria-errormessage={visibleErrors.documentType ? `${fieldId("documentType")}-error` : undefined}
      onBlur={() => setTouched((current) => ({ ...current, documentType: true }))}>
      <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option>
    </select>
    {visibleErrors.documentType && <p id={`${fieldId("documentType")}-error`} className="field-error" role="alert">{visibleErrors.documentType}</p>}
    <TextField id={fieldId("documentNumber")} name="documentNumber" label="Número de documento" autoComplete="off" required minLength={5} maxLength={24}
      hint="Ingresa entre 5 y 24 caracteres. La misma longitud aplica a todos los tipos de documento."
      value={contact.documentNumber} error={visibleErrors.documentNumber} onChange={change("documentNumber")}
      onBlur={() => setTouched((current) => ({ ...current, documentNumber: true }))} />
    <TextField id={fieldId("phone")} name="phone" label="Teléfono" type="tel" autoComplete="tel" required minLength={5} maxLength={40} value={contact.phone}
      error={visibleErrors.phone} onChange={change("phone")} onBlur={() => setTouched((current) => ({ ...current, phone: true }))} />
    <TextField id={fieldId("email")} name="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={contact.email}
      error={visibleErrors.email} onChange={change("email")} onBlur={() => setTouched((current) => ({ ...current, email: true }))} />
    <p className="checkout-muted">No te pediremos datos de tarjeta. La confirmación sólo ocurre cuando Ventas informe el estado PAGADO.</p>
    <div className="checkout-actions"><Button variant="tertiary" onClick={onBack}>Volver al resumen</Button><Button type="submit" loading={busy}>Crear pedido</Button></div>
  </form>;
}

function validateContactField(field: ContactField, value: string): string | undefined {
  const normalized = value.trim();
  if (field === "documentType") return ["DNI", "RUC", "CE", "PASAPORTE"].includes(value) ? undefined : "Selecciona un tipo de documento válido.";
  if (!normalized) return "Completa este campo.";
  if (field === "fullName" && normalized.length < 2) return "Ingresa al menos 2 caracteres.";
  if (field === "documentNumber" && (normalized.length < 5 || normalized.length > 24)) return "Usa entre 5 y 24 caracteres.";
  if (field === "phone" && !/^\+?[\d\s-]{6,20}$/u.test(normalized)) return "Ingresa un teléfono válido.";
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) return "Ingresa un correo electrónico válido.";
  return undefined;
}

export function OrderSubmissionStatus({ state, message, busy, onVerify, onContinue, onRecover }: { state: "READY" | "UNCERTAIN" | "REJECTED"; message: string; busy: boolean; onVerify: () => void; onContinue: () => void; onRecover?: () => void }) {
  if (state === "UNCERTAIN") return <><p role="status" className="checkout-notice">{message}</p><div className="checkout-actions"><Button onClick={onVerify} loading={busy}>Verificar operación original</Button>{onRecover && <Button variant="secondary" onClick={onRecover} loading={busy}>Reintentar con la misma operación</Button>}</div></>;
  if (state === "REJECTED") return <><p role="alert" className="checkout-error">{message || "La operación no se completó y no fue confirmada como pagada."}</p><div className="checkout-actions"><Button onClick={onContinue}>Seguir comprando</Button></div></>;
  return message ? <p role="status" className="checkout-notice">{message}</p> : null;
}

type OrderConfirmationSummaryProps = {
  orderId: string;
  operationId: string;
  operation: CheckoutOperation | null;
  quote: CheckoutQuote | null;
  backendMockEnabled: boolean;
  bff?: boolean;
  copyMessage: string;
  onCopy: () => void;
};

export function OrderConfirmationSummary({ orderId, operationId, operation, quote, backendMockEnabled, bff = false, copyMessage, onCopy }: OrderConfirmationSummaryProps) {
  const confirmationTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    confirmationTitleRef.current?.focus();
  }, []);

  return <div className="checkout-confirmation" role="region" aria-labelledby="confirmed-title">
    <header className="checkout-confirmation-hero" aria-labelledby="confirmed-title">
      <span className="checkout-confirmation-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m5 12.5 4.2 4.2L19 7" /></svg></span>
      <p className="checkout-success-tag">{bff ? "Estado verificado con Ventas · PAGADO" : backendMockEnabled ? "Estado verificado · SUCCEEDED/PAGADO" : "Resultado de fixture · SUCCEEDED/PAGADO"}</p>
      <h2 ref={confirmationTitleRef} id="confirmed-title" tabIndex={-1}>¡Pedido confirmado!</h2>
      <p>{bff ? "Ventas confirmó el estado PAGADO. El pago lo simula Ventas: no hubo cobro real." : backendMockEnabled ? "El Backend MOCK confirmó el estado PAGADO. No hubo cobro real." : "Este escenario local simula una respuesta verificada de Ventas. No se llamó al Backend y no hubo cobro real."}</p>
    </header>
    <div className="checkout-confirmation-grid">
      <section className="checkout-card checkout-confirmation-details" aria-labelledby="confirmation-details-title">
        <h3 id="confirmation-details-title">Datos de tu pedido</h3>
        <div className="checkout-order-code"><div><span>Código de tu pedido</span><code>{orderId}</code></div>
          <Button variant="secondary" onClick={onCopy} aria-label={`Copiar código de pedido ${orderId}`}>Copiar código</Button></div>
        <dl className="checkout-confirmation-facts">
          <div><dt>Estado de la orden</dt><dd><span className="checkout-status-pill">PAGADO{backendMockEnabled || bff ? "" : " (fixture)"}</span></dd></div>
          {operation?.orderCreatedAt && <div><dt>Fecha de registro</dt><dd>{new Date(operation.orderCreatedAt).toLocaleString("es-PE")}</dd></div>}
          <div className="checkout-simulation-note"><dt>Simulación de pago</dt><dd>{bff ? "Pago simulado confirmado por Ventas" : backendMockEnabled ? "Pago simulado confirmado por Backend MOCK" : "Pago simulado confirmado por fixture"}<small>Sin cobro real ejecutado</small></dd></div>
        </dl>
        <p className="checkout-muted">Operación de prueba {operationId.slice(0, 8)}…</p>
      </section>
      <section className="checkout-card checkout-confirmation-items" aria-labelledby="confirmation-items-title">
        <h3 id="confirmation-items-title">Resumen de productos</h3>
        <ul className="checkout-lines" aria-label="Productos del pedido">{quote?.lines.map((line) => <li key={line.sku}><span>{line.sku} × {line.quantity}</span></li>)}</ul>
        {quote && <dl className="checkout-totals">
          <div><dt>Subtotal</dt><dd>{formatCheckoutMoney(quote.subtotal)}</dd></div>
          <div><dt>Envío</dt><dd>{formatCheckoutMoney(quote.shipping)}</dd></div>
          <div><dt>Descuento</dt><dd>−{formatCheckoutMoney(quote.discount)}</dd></div>
          <div className="checkout-total"><dt>Total confirmado</dt><dd>{formatCheckoutMoney(operation?.orderTotal ?? quote.total)}</dd></div>
        </dl>}
      </section>
    </div>
    <div className="checkout-actions checkout-confirmation-actions">
      {backendMockEnabled && operation && <Link className="button button--secondary button--md" href={`/checkout/confirmado/${encodeURIComponent(orderId)}?operationId=${encodeURIComponent(operationId)}`}>Ver mi pedido</Link>}
      <Button onClick={() => window.location.assign("/")}>Seguir comprando</Button>
    </div>
    {copyMessage && <p role="status" aria-live="polite" className="checkout-copy-status">{copyMessage}</p>}
  </div>;
}

export function OrderConfirmationContainer(props: OrderConfirmationSummaryProps) {
  return <OrderConfirmationSummary {...props} />;
}
