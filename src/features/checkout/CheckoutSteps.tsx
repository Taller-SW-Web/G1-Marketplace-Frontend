import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import { LoadingState, Skeleton } from "../../shared/ui/Skeleton";
import { formatCheckoutMoney, type CheckoutAddress, type CheckoutQuote } from "./fixtures";
import {
  addressFieldLimits,
  addressFieldOrder,
  maskPhone,
  validateAddressField,
  type DeliveryAddressDraft,
  type DeliveryAddressField,
  type DeliveryAddressFieldErrors,
} from "./address-validation";

export type { DeliveryAddressDraft, DeliveryAddressField, DeliveryAddressFieldErrors } from "./address-validation";

type CartStatus = "loading" | "ready" | "empty" | "error";

type DeliveryAddressPickerProps = {
  addresses: CheckoutAddress[];
  selectedId: string;
  loading: boolean;
  disabled: boolean;
  onSelect: (addressId: string) => void;
};

export function DeliveryAddressPicker({ addresses, selectedId, loading, disabled, onSelect }: DeliveryAddressPickerProps) {
  if (loading) {
    return <LoadingState label="Cargando tus direcciones…" className="checkout-address-skeletons">
      {[0, 1].map((key) => <div className="checkout-address checkout-address--skeleton" key={key}>
        <Skeleton variant="circle" className="checkout-skeleton-radio" />
        <div><Skeleton variant="line" className="checkout-skeleton-line short" /><Skeleton variant="line" className="checkout-skeleton-line" /></div>
      </div>)}
    </LoadingState>;
  }
  if (addresses.length === 0) return <p>Aún no tienes direcciones guardadas.</p>;
  return <fieldset className="checkout-addresses">
    <legend>Direcciones guardadas</legend>
    {addresses.map((address) => {
      const selected = selectedId === address.addressId;
      return <label className={`checkout-address${selected ? " is-selected" : ""}`} key={address.addressId}>
        <input type="radio" name="address" checked={selected} disabled={disabled}
          onChange={() => onSelect(address.addressId)} />
        <span className="checkout-address-body">
          <strong>{address.label || "Dirección"}</strong>
          <span>{address.street}, {address.district}, {address.province}</span>
          {/* The BFF (BE #331) does not return phone: omit the whole block, visual and accessible. */}
          <small className="checkout-muted">{address.department}{address.phone && <> · <span aria-hidden="true">Tel. {maskPhone(address.phone)}</span>
            <span className="sr-only">Teléfono terminado en {address.phone.slice(-3)}</span></>}</small>
        </span>
      </label>;
    })}
  </fieldset>;
}

type NewDeliveryAddressFormProps = {
  values: DeliveryAddressDraft;
  error: string;
  fieldErrors: DeliveryAddressFieldErrors;
  busy: boolean;
  firstAddress: boolean;
  onChange: (field: DeliveryAddressField, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const fieldCopy: Record<DeliveryAddressField, { label: string; hint?: string; type?: string; autoComplete?: string; required: boolean }> = {
  label: { label: "Etiqueta (opcional)", hint: "Un nombre breve para reconocerla, por ejemplo «Casa».", required: false },
  street: { label: "Dirección", hint: "Calle o avenida, número y, si aplica, dpto. o interior.", autoComplete: "address-line1", required: true },
  department: { label: "Departamento", autoComplete: "address-level1", required: true },
  province: { label: "Provincia", autoComplete: "address-level2", required: true },
  district: { label: "Distrito", autoComplete: "address-level3", required: true },
  reference: { label: "Referencia (opcional)", hint: "Ayuda para encontrar el lugar. No incluyas datos personales.", required: false },
  phone: { label: "Teléfono", hint: "Contacto para la entrega. Solo números, por ejemplo 987654321.", type: "tel", autoComplete: "tel", required: true },
};

export function NewDeliveryAddressForm({ values, error, fieldErrors, busy, firstAddress, onChange, onCancel, onSave }: NewDeliveryAddressFormProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [touched, setTouched] = useState<Partial<Record<DeliveryAddressField, boolean>>>({});
  const [submitAttempt, setSubmitAttempt] = useState(0);
  useLayoutEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => {
    if (submitAttempt === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitAttempt, fieldErrors]);

  // Server errors (400) win; otherwise inline help appears once the buyer leaves the field
  // or tries to save, and disappears as soon as the value becomes valid.
  const shownError = (field: DeliveryAddressField) =>
    fieldErrors[field] ?? (touched[field] ? validateAddressField(field, values[field]) : undefined);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTouched(Object.fromEntries(addressFieldOrder.map((field) => [field, true])));
    setSubmitAttempt((attempt) => attempt + 1);
    onSave();
  }

  const field = (name: DeliveryAddressField) => {
    const copy = fieldCopy[name];
    return <TextField key={name} label={copy.label} name={name} type={copy.type} autoComplete={copy.autoComplete}
      required={copy.required} aria-required={copy.required} maxLength={addressFieldLimits[name]} disabled={busy}
      value={values[name]} hint={copy.hint} error={shownError(name)}
      onChange={(event) => onChange(name, event.target.value)}
      onBlur={() => setTouched((current) => current[name] ? current : { ...current, [name]: true })} />;
  };

  return <form ref={formRef} className="checkout-form" onSubmit={submit} noValidate aria-busy={busy || undefined}>
    <h3 ref={headingRef} tabIndex={-1}>Nueva dirección</h3>
    {firstAddress && <p>Aún no tienes direcciones guardadas. Registra una para continuar con tu compra.</p>}
    <p className="checkout-muted">Todos los campos son obligatorios, salvo la etiqueta y la referencia.</p>
    {field("label")}
    {field("street")}
    <div className="checkout-form-row">{field("department")}{field("province")}{field("district")}</div>
    {field("reference")}
    {field("phone")}
    {error && <div role="alert" className="checkout-error checkout-error-box"><p>{error}</p><p>Tus datos se conservaron; puedes intentarlo de nuevo.</p></div>}
    <div className="checkout-actions">
      {!firstAddress && <Button type="button" variant="tertiary" disabled={busy} onClick={onCancel}>Cancelar</Button>}
      <Button type="submit" loading={busy} loadingLabel="Guardando dirección…" disabled={busy}>Guardar y usar esta dirección</Button>
    </div>
  </form>;
}

type AddressStepContainerProps = {
  backendMockEnabled: boolean;
  cartStatus: CartStatus;
  cartCount: number;
  cartError: string;
  addressLoading: boolean;
  addressLoadError: string;
  addressRequiresAuthentication: boolean;
  addresses: CheckoutAddress[];
  selectedId: string;
  addingAddress: boolean;
  addressDraft: DeliveryAddressDraft;
  addressError: string;
  addressFieldErrors: DeliveryAddressFieldErrors;
  addressStatusMessage: string;
  busy: boolean;
  onRetryCart: () => void;
  onRetryAddresses: () => void;
  onSelectAddress: (addressId: string) => void;
  onAddressDraftChange: (field: DeliveryAddressField, value: string) => void;
  onAddAddress: () => void;
  onCancelAddress: () => void;
  onSaveAddress: () => void;
  onContinue: () => void;
};

export function AddressStepContainer(props: AddressStepContainerProps) {
  const { backendMockEnabled, cartStatus, cartCount, cartError, addressLoading, addressLoadError,
    addressRequiresAuthentication, addresses, selectedId, addingAddress, addressDraft, addressError, addressFieldErrors,
    addressStatusMessage, busy, onRetryCart, onRetryAddresses, onSelectAddress, onAddressDraftChange,
    onAddAddress, onCancelAddress, onSaveAddress, onContinue } = props;
  const selectedAddress = addresses.some((address) => address.addressId === selectedId);
  const addAddressButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterCancel = useRef(false);
  useEffect(() => {
    if (!addingAddress && restoreFocusAfterCancel.current) {
      addAddressButtonRef.current?.focus();
      restoreFocusAfterCancel.current = false;
    }
  }, [addingAddress]);

  function cancelAddressForm() {
    restoreFocusAfterCancel.current = true;
    onCancelAddress();
  }

  const cartBlocked = backendMockEnabled && cartStatus !== "ready";

  return <section className="checkout-card checkout-address-step" aria-labelledby="address-title">
    <div className="checkout-address-main">
      <h2 id="address-title">¿Dónde entregamos tu pedido?</h2>
      {addressStatusMessage && <p role="status" className="checkout-success-box">{addressStatusMessage}</p>}
      {addressLoadError ? <div role="alert" className="checkout-error checkout-error-box">
        <p>{addressLoadError}</p>
        {addressRequiresAuthentication
          ? <Link className="button button--secondary button--md" href="/login?returnTo=%2Fcheckout">Iniciar sesión</Link>
          : <Button variant="secondary" disabled={busy || addressLoading} onClick={onRetryAddresses}>Reintentar carga de direcciones</Button>}
      </div> : addingAddress ? <NewDeliveryAddressForm values={addressDraft} error={addressError} fieldErrors={addressFieldErrors}
        busy={busy} firstAddress={addresses.length === 0} onChange={onAddressDraftChange}
        onCancel={cancelAddressForm} onSave={onSaveAddress} /> : <>
          <DeliveryAddressPicker addresses={addresses} selectedId={selectedId} loading={addressLoading} disabled={busy}
            onSelect={onSelectAddress} />
          {!addressLoading && <Button ref={addAddressButtonRef} className="checkout-add-address" variant="secondary"
            disabled={busy} onClick={onAddAddress}>Agregar nueva dirección</Button>}
        </>}
    </div>
    <aside className="checkout-cart-summary" aria-labelledby="cart-summary-title">
      <h3 id="cart-summary-title">Tu pedido</h3>
      {backendMockEnabled && cartStatus === "loading" && <p role="status">Consultando tu carrito actual…</p>}
      {cartStatus === "ready" && <p>Se encontraron {cartCount} productos para esta compra.</p>}
      {backendMockEnabled && cartStatus === "empty" && <p role="alert" className="checkout-error">Tu carrito está vacío o ya no tiene productos disponibles. No puedes continuar hasta revisarlo.</p>}
      {backendMockEnabled && cartStatus === "error" && <div role="alert" className="checkout-error"><p>{cartError}</p><Button variant="secondary" onClick={onRetryCart}>Reintentar consulta del carrito</Button></div>}
      <p className="checkout-muted">El envío y el total se calculan en el siguiente paso.</p>
    </aside>
    <div className="checkout-actions checkout-address-actions">
      <Link className="button button--tertiary button--md" href="/carrito">Volver al carrito</Link>
      {!addingAddress && !addressLoadError && <Button onClick={onContinue} loading={busy}
        disabled={!selectedAddress || busy || addressLoading || cartBlocked}>Continuar al resumen</Button>}
    </div>
  </section>;
}


/** Fecha aproximada a partir del plazo de la cotización (Baymard: fecha concreta, no solo plazo). */
function estimatedArrival(days: number) {
  if (!Number.isFinite(days) || days < 0) return "";
  const date = new Date(Date.now() + days * 86_400_000);
  return `Llegada aprox. ${new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Lima" }).format(date)}`;
}

type CheckoutOrderSummaryProps = {
  quote: CheckoutQuote;
  address?: CheckoutAddress;
};

export function CheckoutOrderSummary({ quote, address }: CheckoutOrderSummaryProps) {
  return <>
    <p className="checkout-summary-address"><span className="checkout-summary-address__label">Entrega en</span>{address?.label ? `${address.label}: ` : ""}{address?.street}, {address?.district}</p>
    <h3>Productos ({quote.lines.length})</h3>
    <ul className="checkout-lines">{quote.lines.map((line) => <li key={line.sku}><span>{line.sku} × {line.quantity}</span></li>)}</ul>
    <dl className="checkout-totals">
      <div><dt>Subtotal</dt><dd>{formatCheckoutMoney(quote.subtotal)}</dd></div>
      <div><dt>Descuento</dt><dd>−{formatCheckoutMoney(quote.discount)}</dd></div>
      <div><dt>Envío</dt><dd>{formatCheckoutMoney(quote.shipping)}</dd></div>
      <div><dt>Plazo estimado de entrega</dt><dd>{quote.estimatedDays} días<small className="checkout-eta">{estimatedArrival(quote.estimatedDays)}</small></dd></div>
      <div className="checkout-total"><dt>Total estimado</dt><dd>{formatCheckoutMoney(quote.total)}</dd></div>
    </dl>
  </>;
}

type CheckoutQuoteContainerProps = {
  quote: CheckoutQuote;
  backendMockEnabled: boolean;
  expired: boolean;
  invalid: boolean;
  stockUnavailable: boolean;
  children: ReactNode;
};

export function CheckoutQuoteContainer({ quote, backendMockEnabled, expired, invalid, stockUnavailable, children }: CheckoutQuoteContainerProps) {
  return <section className="checkout-card" aria-labelledby="summary-title">
    <h2 id="summary-title">Resumen de envío</h2>
    {children}
    {(expired || invalid) && <p role="alert" className="checkout-error">{stockUnavailable ?
      "La disponibilidad cambió. Revisa tu carrito o actualiza el resumen antes de continuar." :
      invalid ? "La cotización fue invalidada. Actualiza el resumen para continuar." :
        "La cotización venció. Actualiza el resumen para continuar."}</p>}
    <p className="checkout-muted">Cotización {backendMockEnabled ? "Backend MOCK" : "de demostración"} · vence {new Date(quote.expiresAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
  </section>;
}

type CouponFormProps = {
  value: string;
  busy: boolean;
  disabled: boolean;
  hint: string;
  message: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CouponForm({ value, busy, disabled, hint, message, onChange, onSubmit }: CouponFormProps) {
  return <>
    <form className="checkout-coupon" onSubmit={onSubmit}>
      <TextField label="Código promocional" value={value} onChange={(event) => onChange(event.target.value)} hint={hint} />
      <Button type="submit" variant="secondary" loading={busy} disabled={disabled || busy}>Aplicar</Button>
    </form>
    {message && <p role="status">{message}</p>}
  </>;
}

type SelectedBenefitProps = {
  benefit: NonNullable<CheckoutQuote["selectedBenefit"]>;
  busy: boolean;
  disabled: boolean;
  message: string;
  onRemove: () => void;
};

export function SelectedBenefit({ benefit, busy, disabled, message, onRemove }: SelectedBenefitProps) {
  const kind = benefit.type === "COUPON" ? "Cupón" : benefit.type === "PROMOTION" ? "Promoción" : "Beneficio";
  return <div className="checkout-coupon">
    <p>{kind} aplicado: {benefit.id}</p>
    <Button type="button" variant="tertiary" onClick={onRemove} loading={busy} disabled={busy || disabled}>Quitar beneficio</Button>
    {message && <p role="status">{message}</p>}
  </div>;
}
