"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import {
  applyFixtureCoupon,
  checkoutFixtureAddresses,
  checkoutFixtureCart,
  createFixtureQuote,
  formatCheckoutMoney,
  removeFixtureCoupon,
  type CheckoutAddress,
  type CheckoutQuote,
} from "./fixtures";
import { backendMockEnabled, checkoutApi, checkoutErrorMessage, CheckoutApiError, isVerifiedPaidOperation, type CheckoutOperation, type Contact } from "./api";
import "./checkout.css";

type Step = "address" | "summary" | "prepare" | "order" | "confirmed";
const progress = ["Dirección", "Resumen", "Preparación", "Pedido"];

export function CheckoutFlow() {
  const [step, setStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<CheckoutAddress[]>(backendMockEnabled ? [] : checkoutFixtureAddresses);
  const [selectedId, setSelectedId] = useState(backendMockEnabled ? "" : checkoutFixtureAddresses[0]?.addressId ?? "");
  const [addressLoading, setAddressLoading] = useState(backendMockEnabled);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [consented, setConsented] = useState(false);
  const [hasPreparationAttempt, setHasPreparationAttempt] = useState(false);
  const [operationId, setOperationId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [verifiedOrder, setVerifiedOrder] = useState<CheckoutOperation | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [orderSubmission, setOrderSubmission] = useState<"READY" | "UNCERTAIN" | "REJECTED">("READY");
  const orderKey = useRef<string | null>(null);
  const preparationKey = useRef<string | null>(null);
  const contactRef = useRef<Contact | null>(null);
  const submitting = useRef(false);
  const [contact, setContact] = useState<Contact>({ fullName: "", documentType: "DNI", documentNumber: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const cartVersion = Number(process.env.NEXT_PUBLIC_CHECKOUT_CART_VERSION ?? checkoutFixtureCart.version);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!backendMockEnabled) return;
    let active = true;
    checkoutApi.listAddresses().then((items) => {
      if (!active) return;
      setAddresses(items);
      setSelectedId(items[0]?.addressId ?? "");
    }).catch((error: unknown) => {
      if (active) setNotice(checkoutErrorMessage(error, "No se pudieron cargar las direcciones."));
    }).finally(() => { if (active) setAddressLoading(false); });
    return () => { active = false; };
  }, []);
  const selectedAddress = addresses.find((address) => address.addressId === selectedId);
  const expired = quote !== null && now > 0 && quote.expiresAt <= now;

  function continueToSummary() {
    if (!selectedAddress) return;
    setBusy(true);
    setNotice("");
    const loadQuote = backendMockEnabled
      ? checkoutApi.createQuote(selectedAddress.addressId, cartVersion)
      : new Promise((resolve) => window.setTimeout(() => resolve(createFixtureQuote(selectedAddress.addressId)), 180));
    loadQuote.then((nextQuote) => {
      setQuote(nextQuote as CheckoutQuote);
      setCouponMessage("");
      setStep("summary");
    }).catch((error: unknown) => {
      setNotice(checkoutErrorMessage(error, "No se pudo calcular el envío."));
    }).finally(() => setBusy(false));
  }

  function refreshQuote() {
    if (!selectedAddress || busy) return;
    setBusy(true);
    const refresh = backendMockEnabled
      ? checkoutApi.createQuote(selectedAddress.addressId, cartVersion)
      : new Promise<CheckoutQuote>((resolve) => window.setTimeout(() => resolve(createFixtureQuote(selectedAddress.addressId)), 180));
    refresh.then((next) => {
      setQuote(next);
      setCouponMessage("La cotización se actualizó.");
    }).catch((error: unknown) => setCouponMessage(checkoutErrorMessage(error, "No se pudo actualizar la cotización."))).finally(() => setBusy(false));
  }

  function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(data.entries());
    const fields = ["label", "street", "district", "province", "department", "phone"];
    if (fields.some((key) => !String(values[key] ?? "").trim())) {
      setAddressError("Completa los campos obligatorios.");
      return;
    }
    const address = {
      label: String(values.label), street: String(values.street), district: String(values.district),
      province: String(values.province), department: String(values.department),
      reference: String(values.reference || ""), phone: String(values.phone),
    };
    setBusy(true);
    const save = backendMockEnabled
      ? checkoutApi.createAddress(address)
      : Promise.resolve({ ...address, addressId: `ADR-MOCK-${String(addresses.length + 1).padStart(4, "0")}` });
    save.then((saved) => {
      setAddresses((current) => [...current, saved]);
      setSelectedId(saved.addressId);
      setAddressError("");
      setAddingAddress(false);
    }).catch((error: unknown) => setAddressError(checkoutErrorMessage(error, "No se pudo guardar la dirección."))).finally(() => setBusy(false));
  }

  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || expired) return;
    setBusy(true);
    const normalized = coupon.trim().toUpperCase();
    const apply = backendMockEnabled
      ? checkoutApi.applyBenefit(quote, normalized)
      : new Promise((resolve) => window.setTimeout(() => resolve(applyFixtureCoupon(quote, normalized)), 160));
    apply.then((next) => {
      if (next) {
        setQuote(next as CheckoutQuote);
        setCouponMessage("Cupón aplicado.");
      } else setCouponMessage("Ese cupón no se puede aplicar a esta compra.");
    }).catch((error: unknown) => setCouponMessage(checkoutErrorMessage(error, "No se pudo validar el cupón."))).finally(() => setBusy(false));
  }

  function removeCoupon() {
    if (!quote) return;
    if (backendMockEnabled) {
      setBusy(true);
      checkoutApi.removeBenefit(quote).then(setQuote).then(() => { setCoupon(""); setCouponMessage("Se actualizó el resumen sin el beneficio."); })
        .catch((error: unknown) => setCouponMessage(checkoutErrorMessage(error, "No se pudo quitar el cupón.")))
        .finally(() => setBusy(false));
      return;
    }
    setQuote(removeFixtureCoupon(quote));
    setCoupon("");
    setCouponMessage("Se actualizó el resumen sin el cupón.");
  }

  function prepare() {
    if (!quote || expired || !consented) return;
    setBusy(true);
    setNotice("");
    const key = preparationKey.current ?? crypto.randomUUID();
    preparationKey.current = key;
    setHasPreparationAttempt(true);
    const preparation = backendMockEnabled
      ? checkoutApi.prepare(quote.quoteId, cartVersion, key)
      : new Promise<CheckoutOperation>((resolve) => window.setTimeout(() => resolve({ checkoutOperationId: crypto.randomUUID(), state: "PREPARED" }), 200));
    preparation.then((operation) => {
      if (operation.state !== "PREPARED") throw new Error("PREPARATION_NOT_CONFIRMED");
      preparationKey.current = null;
      setHasPreparationAttempt(false);
      setOperationId(operation.checkoutOperationId);
      orderKey.current = null;
      setOrderSubmission("READY");
      setNotice("");
      setStep("order");
    }).catch((error: unknown) => setNotice(checkoutErrorMessage(error, "No se pudo preparar la compra. Intenta actualizar el resumen."))).finally(() => setBusy(false));
  }

  function finishVerifiedOrder(operation: CheckoutOperation) {
    if (isVerifiedPaidOperation(operation)) {
      setOrderId(operation.orderId);
      setVerifiedOrder(operation);
      setStep("confirmed");
      setNotice("");
      setOrderSubmission("READY");
      return true;
    }
    if (operation.state === "FAILED" || operation.orderState === "ANULADO") {
      setOrderSubmission("REJECTED");
      setNotice("La operación fue rechazada o anulada. No se mostrará como pedido pagado.");
      return true;
    }
    setOrderSubmission("UNCERTAIN");
    setNotice("El pedido aún no tiene un resultado final verificado. Consulta o reintenta la misma operación; no se creará otra.");
    return false;
  }

  function submitBackendOrder() {
    if (!operationId || !contactRef.current || !orderKey.current) return;
    setBusy(true);
    checkoutApi.createOrder(operationId, contactRef.current, orderKey.current)
      .then((operation) => { finishVerifiedOrder(operation); })
      .catch((error: unknown) => {
        setOrderSubmission("UNCERTAIN");
        setNotice(checkoutErrorMessage(error, "Resultado no confirmado. Verifica la operación original; no repitas con otra clave."));
      }).finally(() => setBusy(false));
  }

  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operationId || !quote || submitting.current || orderKey.current) return;
    submitting.current = true;
    orderKey.current = crypto.randomUUID();
    contactRef.current = contact;
    setBusy(true);
    setNotice("Estamos registrando tu pedido. La simulación de pago ocurre después de crear el pedido; no habrá cobro real.");
    if (backendMockEnabled) {
      submitting.current = false;
      setOrderSubmission("UNCERTAIN");
      submitBackendOrder();
      return;
    }
    window.setTimeout(() => {
      setBusy(false);
      submitting.current = false;
      setOrderId(`PED-MOCK-${String(Date.now()).slice(-5)}`);
      setVerifiedOrder(null);
      setStep("confirmed");
    }, 350);
  }

  function verifyOriginalOperation() {
    if (!operationId || orderSubmission !== "UNCERTAIN" || busy) return;
    setBusy(true);
    setNotice("Consultando la operación original…");
    if (backendMockEnabled) {
      checkoutApi.getOperation(operationId).then((operation) => {
        if (!finishVerifiedOrder(operation) && operation.state === "SUBMITTED" && operation.recoveryRequired) submitBackendOrder();
      }).catch((error: unknown) => {
        if (error instanceof CheckoutApiError && error.code === "ORDER_NOT_SUBMITTED") {
          submitBackendOrder();
          return;
        }
        setNotice(checkoutErrorMessage(error, "No se pudo verificar. Conservamos la operación original."));
      }).finally(() => setBusy(false));
      return;
    }
    window.setTimeout(() => {
      setOrderId(`PED-MOCK-${String(Date.now()).slice(-5)}`);
      setVerifiedOrder(null);
      setOrderSubmission("READY");
      setBusy(false);
      setStep("confirmed");
    }, 250);
  }

  async function copyOrderCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(orderId);
      setCopyMessage("Código de pedido copiado.");
    } catch {
      setCopyMessage("No pudimos copiarlo. Puedes seleccionar el código y copiarlo manualmente.");
    }
  }

  return (
    <main className="checkout-page container">
      <header className="checkout-heading">
        <p className="checkout-eyebrow">{backendMockEnabled ? "Backend MOCK · entorno local" : "Fixtures locales"}</p>
        <h1>Finaliza tu compra</h1>
        <p>Datos de prueba · no se realizan cobros reales</p>
      </header>
      {notice && step !== "order" && <p role="alert" className="checkout-error">{notice}</p>}
      <nav className="checkout-progress" aria-label="Progreso de compra">
        {progress.map((label, index) => {
          const current = ["address", "summary", "prepare", "order", "confirmed"].indexOf(step);
          return <span key={label} aria-current={current === index ? "step" : undefined} className={current >= index ? "is-active" : ""}>{index + 1}. {label}</span>;
        })}
      </nav>
      {step === "address" && <section className="checkout-card" aria-labelledby="address-title">
        <h2 id="address-title">Dirección de envío</h2>
        {!addingAddress ? <>
          {addressLoading ? <p role="status">Cargando tus direcciones…</p> : addresses.length === 0 ? <p>Aún no tienes direcciones guardadas.</p> : <fieldset className="checkout-addresses"><legend>Elige dónde recibir tu pedido</legend>{addresses.map((address) => <label className="checkout-address" key={address.addressId}><input type="radio" name="address" checked={selectedId === address.addressId} disabled={busy} onChange={() => { setSelectedId(address.addressId); setQuote(null); setOperationId(""); }} /><span><strong>{address.label}</strong><br />{address.street}, {address.district}, {address.province}<br /><small>Teléfono terminado en {address.phone.slice(-3)}</small></span></label>)}</fieldset>}
          <div className="checkout-actions"><Button variant="secondary" disabled={busy || addressLoading} onClick={() => { setAddingAddress(true); setAddressError(""); }}>Agregar dirección</Button><Button onClick={continueToSummary} loading={busy} disabled={!selectedAddress || busy || addressLoading}>Continuar</Button></div>
        </> : <form className="checkout-form" onSubmit={saveAddress}><h3>Nueva dirección</h3><TextField label="Etiqueta" name="label" required maxLength={80} /><TextField label="Dirección" name="street" required maxLength={180} /><TextField label="Departamento" name="department" required maxLength={100} /><TextField label="Provincia" name="province" required maxLength={100} /><TextField label="Distrito" name="district" required maxLength={100} /><TextField label="Referencia (opcional)" name="reference" maxLength={180} /><TextField label="Teléfono" name="phone" type="tel" required maxLength={40} />{addressError && <p role="alert" className="checkout-error">{addressError}</p>}<div className="checkout-actions"><Button variant="tertiary" onClick={() => setAddingAddress(false)}>Cancelar</Button><Button type="submit">Guardar dirección</Button></div></form>}
      </section>}
      {step === "summary" && quote && <section className="checkout-card" aria-labelledby="summary-title">
        <h2 id="summary-title">Resumen de envío</h2>
        <p>{selectedAddress?.label}: {selectedAddress?.street}, {selectedAddress?.district}</p>
        <h3>Productos ({quote.lines.length})</h3>
        <ul className="checkout-lines">{quote.lines.map((line) => <li key={line.sku}><span>{line.sku} × {line.quantity}</span></li>)}</ul>
        <dl className="checkout-totals">
          <div><dt>Subtotal</dt><dd>{formatCheckoutMoney(quote.subtotal)}</dd></div>
          <div><dt>Descuento</dt><dd>−{formatCheckoutMoney(quote.discount)}</dd></div>
          <div><dt>Envío</dt><dd>{formatCheckoutMoney(quote.shipping)}</dd></div>
          <div><dt>Plazo estimado de entrega</dt><dd>{quote.estimatedDays} días</dd></div>
          <div className="checkout-total"><dt>Total estimado</dt><dd>{formatCheckoutMoney(quote.total)}</dd></div>
        </dl>
        {quote.selectedBenefit ? <div className="checkout-coupon">
          <p>{quote.selectedBenefit.type === "COUPON" ? "Cupón" : quote.selectedBenefit.type === "PROMOTION" ? "Promoción" : "Beneficio"} aplicado: {quote.selectedBenefit.id}</p>
          <Button variant="tertiary" onClick={removeCoupon} disabled={busy}>Quitar beneficio</Button>
        </div> : <form className="checkout-coupon" onSubmit={applyCoupon}>
          <TextField label="Código promocional" value={coupon} onChange={(event) => setCoupon(event.target.value)} hint={backendMockEnabled ? "Ingresa tu código promocional" : "Prueba SAVE20 o DEPORTE20"} />
          <Button type="submit" variant="secondary" loading={busy}>Aplicar</Button>
        </form>}
        {couponMessage && <p role="status">{couponMessage}</p>}
        {expired && <p role="alert" className="checkout-error">La cotización venció. Actualiza el resumen para continuar.</p>}
        <p className="checkout-muted">Cotización {backendMockEnabled ? "Backend MOCK" : "de demostración"} · vence {new Date(quote.expiresAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
        <div className="checkout-actions">
          {expired && <Button variant="secondary" onClick={refreshQuote} loading={busy}>Actualizar resumen</Button>}
          <Button variant="tertiary" onClick={() => setStep("address")}>Volver a dirección</Button>
          <Button onClick={() => { setConsented(false); setStep("prepare"); }} disabled={expired || busy}>Continuar al pago simulado</Button>
        </div>
      </section>}
      {step === "prepare" && quote && <section className="checkout-card" aria-labelledby="prepare-title"><h2 id="prepare-title">Pago simulado</h2><p>Al continuar, registraremos tu consentimiento. El pedido aún no existe y no se inicia un cobro real.</p><label className="checkout-consent"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />Entiendo que esta compra es una simulación y no habrá cobro real.</label><p>Total estimado: <strong>{formatCheckoutMoney(quote.total)}</strong></p><div className="checkout-actions"><Button variant="tertiary" onClick={() => { preparationKey.current = null; setHasPreparationAttempt(false); setStep("summary"); }}>Volver al resumen</Button><Button onClick={prepare} loading={busy} disabled={!consented || expired}>{hasPreparationAttempt ? "Reintentar misma preparación" : "Registrar consentimiento"}</Button></div></section>}
      {step === "order" && <section className="checkout-card" aria-labelledby="order-title"><h2 id="order-title">Confirma y crea tu pedido</h2><p>La simulación de pago ocurrirá después de crear el pedido. No habrá cobro real.</p>{notice && <p role="status" className="checkout-notice">{notice}</p>}{orderSubmission === "UNCERTAIN" ? <div className="checkout-actions"><Button onClick={verifyOriginalOperation} loading={busy}>Verificar operación original</Button></div> : orderSubmission === "REJECTED" ? <><p role="alert" className="checkout-error">El pago simulado fue rechazado y el pedido no se confirmó. No vuelvas a enviar esta operación.</p><div className="checkout-actions"><Button onClick={() => window.location.assign("/catalogo")}>Seguir comprando</Button></div></> : <form className="checkout-form" onSubmit={createOrder}><TextField label="Nombre completo" required minLength={2} maxLength={120} value={contact.fullName} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} /><label className="checkout-label" htmlFor="documentType">Tipo de documento</label><select id="documentType" value={contact.documentType} onChange={(event) => setContact({ ...contact, documentType: event.target.value as Contact["documentType"] })}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option></select><TextField label="Número de documento" required minLength={5} maxLength={24} value={contact.documentNumber} onChange={(event) => setContact({ ...contact, documentNumber: event.target.value })} /><TextField label="Teléfono" type="tel" required minLength={5} maxLength={40} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /><TextField label="Correo electrónico" type="email" required maxLength={254} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /><div className="checkout-actions"><Button variant="tertiary" onClick={() => setStep("summary")}>Volver al resumen</Button><Button type="submit" loading={busy}>Crear pedido</Button></div></form>}</section>}
      {step === "confirmed" && <section className="checkout-card checkout-success" aria-labelledby="confirmed-title">
        <p className="checkout-success-tag">{backendMockEnabled ? "Estado verificado · SUCCEEDED/PAGADO" : "Resultado de fixture · SUCCEEDED/PAGADO"}</p>
        <h2 id="confirmed-title">¡Pedido confirmado!</h2>
        <p>{backendMockEnabled ? "El Backend MOCK confirmó el estado PAGADO. No hubo cobro real." : "Este escenario local simula una respuesta verificada de Ventas. No se llamó al Backend y no hubo cobro real."}</p>
        <dl className="checkout-totals">
          <div><dt>Código de pedido</dt><dd><code>{orderId}</code></dd></div>
          <div><dt>Estado</dt><dd>PAGADO{backendMockEnabled ? "" : " (fixture)"}</dd></div>
          <div className="checkout-total"><dt>Total confirmado</dt><dd>{formatCheckoutMoney(verifiedOrder?.orderTotal ?? quote?.total ?? 0)}</dd></div>
          {verifiedOrder?.orderCreatedAt && <div><dt>Fecha del pedido</dt><dd>{new Date(verifiedOrder.orderCreatedAt).toLocaleString("es-PE")}</dd></div>}
        </dl>
        <div className="checkout-actions">
          <Button variant="secondary" onClick={copyOrderCode} aria-label={`Copiar código de pedido ${orderId}`}>Copiar código</Button>
          <Button onClick={() => window.location.assign("/")}>Seguir comprando</Button>
        </div>
        {copyMessage && <p role="status" aria-live="polite">{copyMessage}</p>}
        <p className="checkout-muted">Operación de prueba {operationId.slice(0, 8)}…</p>
      </section>}
    </main>
  );
}
