import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import { formatCheckoutMoney, type CheckoutAddress, type CheckoutQuote } from "./fixtures";

type CartStatus = "loading" | "ready" | "empty" | "error";

type DeliveryAddressPickerProps = {
  addresses: CheckoutAddress[];
  selectedId: string;
  loading: boolean;
  disabled: boolean;
  onSelect: (addressId: string) => void;
};

export function DeliveryAddressPicker({ addresses, selectedId, loading, disabled, onSelect }: DeliveryAddressPickerProps) {
  return <>
    {loading ? <p role="status">Cargando tus direcciones…</p> : addresses.length === 0 ? <p>Aún no tienes direcciones guardadas.</p> :
      <fieldset className="checkout-addresses">
        <legend>Elige dónde recibir tu pedido</legend>
        {addresses.map((address) => <label className="checkout-address" key={address.addressId}>
          <input type="radio" name="address" checked={selectedId === address.addressId} disabled={disabled}
            onChange={() => onSelect(address.addressId)} />
          <span><strong>{address.label}</strong><br />{address.street}, {address.district}, {address.province}<br />
            <small>Teléfono terminado en {address.phone.slice(-3)}</small></span>
        </label>)}
      </fieldset>}
  </>;
}

type NewDeliveryAddressFormProps = {
  error: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function NewDeliveryAddressForm({ error, busy, onCancel, onSubmit }: NewDeliveryAddressFormProps) {
  return <form className="checkout-form" onSubmit={onSubmit}>
    <h3>Nueva dirección</h3>
    <TextField label="Etiqueta" name="label" required maxLength={80} />
    <TextField label="Dirección" name="street" required maxLength={180} />
    <TextField label="Departamento" name="department" required maxLength={100} />
    <TextField label="Provincia" name="province" required maxLength={100} />
    <TextField label="Distrito" name="district" required maxLength={100} />
    <TextField label="Referencia (opcional)" name="reference" maxLength={180} />
    <TextField label="Teléfono" name="phone" type="tel" required maxLength={40} />
    {error && <p role="alert" className="checkout-error">{error}</p>}
    <div className="checkout-actions">
      <Button type="button" variant="tertiary" disabled={busy} onClick={onCancel}>Cancelar</Button>
      <Button type="submit" loading={busy} disabled={busy}>Guardar dirección</Button>
    </div>
  </form>;
}

type AddressStepContainerProps = {
  backendMockEnabled: boolean;
  cartStatus: CartStatus;
  cartCount: number;
  cartError: string;
  addressLoading: boolean;
  addresses: CheckoutAddress[];
  selectedId: string;
  addingAddress: boolean;
  addressError: string;
  busy: boolean;
  onRetryCart: () => void;
  onSelectAddress: (addressId: string) => void;
  onAddAddress: () => void;
  onCancelAddress: () => void;
  onSaveAddress: (event: FormEvent<HTMLFormElement>) => void;
  onContinue: () => void;
};

export function AddressStepContainer(props: AddressStepContainerProps) {
  const { backendMockEnabled, cartStatus, cartCount, cartError, addressLoading, addresses, selectedId,
    addingAddress, addressError, busy, onRetryCart, onSelectAddress, onAddAddress, onCancelAddress,
    onSaveAddress, onContinue } = props;
  const selectedAddress = addresses.some((address) => address.addressId === selectedId);

  return <section className="checkout-card" aria-labelledby="address-title">
    <h2 id="address-title">Dirección de envío</h2>
    {backendMockEnabled && cartStatus === "loading" && <p role="status">Consultando tu carrito actual…</p>}
    {backendMockEnabled && cartStatus === "ready" && <p className="checkout-muted">Se encontraron {cartCount} productos para esta compra.</p>}
    {backendMockEnabled && cartStatus === "empty" && <p role="alert" className="checkout-error">Tu carrito está vacío o ya no tiene productos disponibles. <Link href="/carrito">Volver al carrito</Link></p>}
    {backendMockEnabled && cartStatus === "error" && <div role="alert" className="checkout-error"><p>{cartError}</p><Button variant="secondary" onClick={onRetryCart}>Reintentar consulta del carrito</Button></div>}
    {addingAddress ? <NewDeliveryAddressForm error={addressError} busy={busy} onCancel={onCancelAddress} onSubmit={onSaveAddress} /> : <>
      <DeliveryAddressPicker addresses={addresses} selectedId={selectedId} loading={addressLoading} disabled={busy}
        onSelect={onSelectAddress} />
      <div className="checkout-actions">
        <Button variant="secondary" disabled={busy || addressLoading} onClick={onAddAddress}>Agregar dirección</Button>
        <Button onClick={onContinue} loading={busy}
          disabled={!selectedAddress || busy || addressLoading || (backendMockEnabled && cartStatus !== "ready")}>Continuar</Button>
      </div>
    </>}
  </section>;
}

type CheckoutOrderSummaryProps = {
  quote: CheckoutQuote;
  address?: CheckoutAddress;
};

export function CheckoutOrderSummary({ quote, address }: CheckoutOrderSummaryProps) {
  return <>
    <p>{address?.label}: {address?.street}, {address?.district}</p>
    <h3>Productos ({quote.lines.length})</h3>
    <ul className="checkout-lines">{quote.lines.map((line) => <li key={line.sku}><span>{line.sku} × {line.quantity}</span></li>)}</ul>
    <dl className="checkout-totals">
      <div><dt>Subtotal</dt><dd>{formatCheckoutMoney(quote.subtotal)}</dd></div>
      <div><dt>Descuento</dt><dd>−{formatCheckoutMoney(quote.discount)}</dd></div>
      <div><dt>Envío</dt><dd>{formatCheckoutMoney(quote.shipping)}</dd></div>
      <div><dt>Plazo estimado de entrega</dt><dd>{quote.estimatedDays} días</dd></div>
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
