"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import {
  AddressStepContainer,
  CheckoutOrderSummary,
  CheckoutQuoteContainer,
  CouponForm,
  SelectedBenefit,
} from "./CheckoutSteps";
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
import { backendMockEnabled, checkoutApi, checkoutErrorMessage, CheckoutApiError, isVerifiedPaidOperation, type CheckoutCartSnapshot, type CheckoutOperation, type Contact } from "./api";
import "./checkout.css";

type Step = "address" | "summary" | "prepare" | "order" | "confirmed";
const progress = ["Dirección", "Resumen", "Preparación", "Pedido"];
const contextFailureCodes = new Set([
  "QUOTE_EXPIRED",
  "REVALIDATION_CHANGED",
  "CHECKOUT_CONTEXT_CHANGED",
  "STOCK_NOT_AVAILABLE",
  "OPERATION_NOT_PREPARED",
  "PREPARATION_CONTEXT_UNAVAILABLE",
  "PREPARATION_FAILED",
]);

export function CheckoutFlow() {
  const [step, setStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<CheckoutAddress[]>(backendMockEnabled ? [] : checkoutFixtureAddresses);
  const [selectedId, setSelectedId] = useState(backendMockEnabled ? "" : checkoutFixtureAddresses[0]?.addressId ?? "");
  const [addressLoading, setAddressLoading] = useState(backendMockEnabled);
  const [cartSnapshot, setCartSnapshot] = useState<CheckoutCartSnapshot | null>(backendMockEnabled ? null : {
    cartId: null,
    version: checkoutFixtureCart.version,
    items: checkoutFixtureCart.lines,
  });
  const [cartStatus, setCartStatus] = useState<"loading" | "ready" | "empty" | "error">(backendMockEnabled ? "loading" : "ready");
  const [cartError, setCartError] = useState("");
  const [cartReloadKey, setCartReloadKey] = useState(0);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const quoteRef = useRef<CheckoutQuote | null>(null);
  const quoteRequest = useRef(0);
  const [quoteInvalid, setQuoteInvalid] = useState(false);
  const [stockUnavailable, setStockUnavailable] = useState(false);
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
  const preparationKey = useRef<{ quoteId: string; cartVersion: number; key: string } | null>(null);
  const benefitRequest = useRef(0);
  const preparationAttempt = useRef(0);
  const contactRef = useRef<Contact | null>(null);
  const submitting = useRef(false);
  const [contact, setContact] = useState<Contact>({ fullName: "", documentType: "DNI", documentNumber: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
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
      if (!active) return;
      if (error instanceof CheckoutApiError && error.status === 401) {
        setAddresses([]);
        setSelectedId("");
      }
      setNotice(checkoutErrorMessage(error, "No se pudieron cargar las direcciones."));
    }).finally(() => { if (active) setAddressLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!backendMockEnabled) return;
    let active = true;
    checkoutApi.getCurrentCart().then((snapshot) => {
      if (!active) return;
      setCartSnapshot(snapshot);
      setCartStatus(snapshot.items.length > 0 ? "ready" : "empty");
    }).catch((error: unknown) => {
      if (!active) return;
      setCartStatus("error");
      setCartError(checkoutErrorMessage(error, "No pudimos consultar el carrito."));
    });
    return () => { active = false; };
  }, [cartReloadKey]);
  const selectedAddress = addresses.find((address) => address.addressId === selectedId);
  const expired = quote !== null && now > 0 && quote.expiresAt <= now;

  function replaceQuote(next: CheckoutQuote | null) {
    quoteRef.current = next;
    setQuote(next);
  }

  function invalidateQuote() {
    quoteRequest.current += 1;
    benefitRequest.current += 1;
    replaceQuote(null);
    setCouponMessage("");
    setQuoteInvalid(false);
    setStockUnavailable(false);
    setOperationId("");
    setConsented(false);
    preparationKey.current = null;
    setHasPreparationAttempt(false);
    orderKey.current = null;
    contactRef.current = null;
  }

  function retryCartLoad() {
    setCartStatus("loading");
    setCartError("");
    setCartReloadKey((key) => key + 1);
  }

  function returnToAddress() {
    quoteRequest.current += 1;
    benefitRequest.current += 1;
    setBusy(false);
    setStep("address");
  }

  async function quoteCurrentCart(addressId: string): Promise<CheckoutQuote> {
    if (!backendMockEnabled) return createFixtureQuote(addressId);
    const snapshot = await checkoutApi.getCurrentCart();
    setCartSnapshot(snapshot);
    if (snapshot.items.length === 0) {
      setCartStatus("empty");
      throw new CheckoutApiError(409, "CART_EMPTY");
    }
    setCartStatus("ready");
    return checkoutApi.createQuote(addressId, snapshot.version);
  }

  async function continueToSummary() {
    if (!selectedAddress || busy || (backendMockEnabled && cartStatus !== "ready")) return;
    setBusy(true);
    setNotice("");
    const requestId = ++quoteRequest.current;
    const addressId = selectedAddress.addressId;
    try {
      const nextQuote = await quoteCurrentCart(addressId);
      if (requestId !== quoteRequest.current || selectedId !== addressId) return;
      replaceQuote(nextQuote as CheckoutQuote);
      setQuoteInvalid(false);
      setStockUnavailable(false);
      preparationKey.current = null;
      setHasPreparationAttempt(false);
      setCouponMessage("");
      setStep("summary");
    } catch (error: unknown) {
      if (error instanceof CheckoutApiError && error.status === 401) {
        setAddresses([]);
        setSelectedId("");
        invalidateQuote();
      }
      setNotice(checkoutErrorMessage(error, "No se pudo calcular el envío."));
    } finally {
      setBusy(false);
    }
  }

  async function refreshQuote() {
    if (!selectedAddress || busy) return;
    setBusy(true);
    const requestId = ++quoteRequest.current;
    const addressId = selectedAddress.addressId;
    benefitRequest.current += 1;
    try {
      const next = await quoteCurrentCart(addressId);
      if (requestId !== quoteRequest.current || selectedId !== addressId) return;
      replaceQuote(next);
      setQuoteInvalid(false);
      setStockUnavailable(false);
      preparationKey.current = null;
      setHasPreparationAttempt(false);
      setOperationId("");
      setConsented(false);
      orderKey.current = null;
      contactRef.current = null;
      setCouponMessage("La cotización se actualizó.");
    } catch (error: unknown) {
      setCouponMessage(checkoutErrorMessage(error, "No se pudo actualizar la cotización."));
    } finally {
      setBusy(false);
    }
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
    const requestId = ++quoteRequest.current;
    const save = backendMockEnabled
      ? checkoutApi.createAddress(address)
      : Promise.resolve({ ...address, addressId: `ADR-MOCK-${String(addresses.length + 1).padStart(4, "0")}` });
    save.then((saved) => {
      if (requestId !== quoteRequest.current) return;
      invalidateQuote();
      setAddresses((current) => [...current, saved]);
      setSelectedId(saved.addressId);
      setAddressError("");
      setAddingAddress(false);
    }).catch((error: unknown) => {
      if (error instanceof CheckoutApiError && error.status === 401) {
        setAddresses([]);
        setSelectedId("");
        invalidateQuote();
      }
      setAddressError(checkoutErrorMessage(error, "No se pudo guardar la dirección."));
    }).finally(() => setBusy(false));
  }

  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || quoteInvalid || expired) return;
    setBusy(true);
    const requestId = ++benefitRequest.current;
    const sourceQuote = quote;
    const normalized = coupon.trim().toUpperCase();
    const apply = backendMockEnabled
      ? checkoutApi.applyBenefit(quote, normalized)
      : new Promise((resolve) => window.setTimeout(() => resolve(applyFixtureCoupon(quote, normalized)), 160));
    apply.then((next) => {
      if (requestId !== benefitRequest.current || quoteRef.current !== sourceQuote) return;
      if (next) {
        replaceQuote(next as CheckoutQuote);
        setQuoteInvalid(false);
        setStockUnavailable(false);
        preparationKey.current = null;
        setHasPreparationAttempt(false);
        setCouponMessage("Cupón aplicado.");
      } else setCouponMessage("Ese cupón no se puede aplicar a esta compra.");
    }).catch((error: unknown) => {
      if (requestId === benefitRequest.current && quoteRef.current === sourceQuote) {
        setCouponMessage(checkoutErrorMessage(error, "No se pudo validar el cupón."));
      }
    }).finally(() => {
      if (requestId === benefitRequest.current) setBusy(false);
    });
  }

  function removeCoupon() {
    if (!quote || quoteInvalid) return;
    const requestId = ++benefitRequest.current;
    const sourceQuote = quote;
    if (backendMockEnabled) {
      setBusy(true);
      checkoutApi.removeBenefit(quote).then((next) => {
        if (requestId !== benefitRequest.current || quoteRef.current !== sourceQuote) return;
        replaceQuote(next);
        preparationKey.current = null;
        setHasPreparationAttempt(false);
        setCoupon("");
        setCouponMessage("Se actualizó el resumen sin el beneficio.");
      }).catch((error: unknown) => {
        if (requestId === benefitRequest.current && quoteRef.current === sourceQuote) {
          setCouponMessage(checkoutErrorMessage(error, "No se pudo quitar el cupón."));
        }
      }).finally(() => { if (requestId === benefitRequest.current) setBusy(false); });
      return;
    }
    replaceQuote(removeFixtureCoupon(quote));
    preparationKey.current = null;
    setHasPreparationAttempt(false);
    setCoupon("");
    setCouponMessage("Se actualizó el resumen sin el cupón.");
  }

  function prepare() {
    if (!quote || quoteInvalid || expired || !consented || busy) return;
    setBusy(true);
    setNotice("");
    const existingPreparation = preparationKey.current;
    const key = existingPreparation?.quoteId === quote.quoteId &&
      existingPreparation.cartVersion === quote.cartVersion
      ? existingPreparation.key
      : crypto.randomUUID();
    preparationKey.current = { quoteId: quote.quoteId, cartVersion: quote.cartVersion, key };
    setHasPreparationAttempt(true);
    const attempt = ++preparationAttempt.current;
    const preparation = backendMockEnabled
      ? checkoutApi.prepare(quote.quoteId, quote.cartVersion, key)
      : new Promise<CheckoutOperation>((resolve) => window.setTimeout(() => resolve({ checkoutOperationId: crypto.randomUUID(), state: "PREPARED" }), 200));
    preparation.then((operation) => {
      if (attempt !== preparationAttempt.current) return;
      if (operation.state !== "PREPARED") throw new Error("PREPARATION_NOT_CONFIRMED");
      preparationKey.current = null;
      setHasPreparationAttempt(false);
      setOperationId(operation.checkoutOperationId);
      orderKey.current = null;
      setOrderSubmission("READY");
      setNotice("");
      setStep("order");
    }).catch((error: unknown) => {
      if (attempt !== preparationAttempt.current) return;
      if (error instanceof CheckoutApiError && error.status === 409 && ["REVALIDATION_CHANGED", "QUOTE_EXPIRED", "STOCK_NOT_AVAILABLE"].includes(error.code)) {
        preparationKey.current = null;
        setHasPreparationAttempt(false);
        setOperationId("");
        setConsented(false);
        setQuoteInvalid(true);
        setStockUnavailable(error.code === "STOCK_NOT_AVAILABLE");
        setStep("summary");
        setNotice("");
        return;
      }
      setNotice(checkoutErrorMessage(error, "No se pudo preparar la compra. Intenta actualizar el resumen."));
    }).finally(() => {
      if (attempt === preparationAttempt.current) setBusy(false);
    });
  }

  function returnToSummaryDuringPreparation() {
    preparationAttempt.current += 1;
    setBusy(false);
    setNotice("");
    setStep("summary");
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
    if (operation.state === "FAILED" && operation.failureCode && contextFailureCodes.has(operation.failureCode)) {
      preparationKey.current = null;
      setHasPreparationAttempt(false);
      setOperationId("");
      setConsented(false);
      orderKey.current = null;
      contactRef.current = null;
      setQuoteInvalid(true);
      setStockUnavailable(operation.failureCode === "STOCK_NOT_AVAILABLE");
      setStep("summary");
      setOrderSubmission("READY");
      setNotice("");
      return true;
    }
    if (operation.orderState === "ANULADO" || operation.failureCode === "PAGO_NO_COMPLETADO") {
      setOrderSubmission("REJECTED");
      setNotice("La operación fue rechazada o anulada. No se mostrará como pedido pagado.");
      return true;
    }
    if (operation.state === "FAILED") {
      setOrderSubmission("REJECTED");
      setNotice("La operación no se completó y no fue confirmada como pagada.");
      return true;
    }
    setOrderSubmission("UNCERTAIN");
    setNotice("El pedido aún no tiene un resultado final verificado. Consulta o reintenta la misma operación; no se creará otra.");
    return false;
  }

  function submitBackendOrder(): Promise<void> {
    if (!operationId || !contactRef.current || !orderKey.current) return Promise.resolve();
    return checkoutApi.createOrder(operationId, contactRef.current, orderKey.current)
      .then((operation) => { finishVerifiedOrder(operation); })
      .catch((error: unknown) => {
        if (error instanceof CheckoutApiError && error.status === 400 && error.code === "CONTACT_VALIDATION_ERROR") {
          setOrderSubmission("READY");
          setNotice(checkoutErrorMessage(error, "Revisa los datos de contacto e inténtalo de nuevo."));
          return;
        }
        setOrderSubmission("UNCERTAIN");
        setNotice(checkoutErrorMessage(error, "Resultado no confirmado. Verifica la operación original; no repitas con otra clave."));
      });
  }

  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operationId || !quote || submitting.current || busy) return;
    submitting.current = true;
    orderKey.current ??= crypto.randomUUID();
    contactRef.current = contact;
    setBusy(true);
    setNotice("Estamos registrando tu pedido. La simulación de pago ocurre después de crear el pedido; no habrá cobro real.");
    if (backendMockEnabled) {
      submitting.current = false;
      setOrderSubmission("UNCERTAIN");
      void submitBackendOrder().finally(() => setBusy(false));
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
        if (operation.state === "PREPARED") {
          setOrderSubmission("READY");
          setNotice("La operación está preparada. Puedes revisar o corregir tus datos de contacto y continuar.");
          return;
        }
        if (!finishVerifiedOrder(operation) && operation.state === "SUBMITTED" && operation.recoveryRequired) {
          return submitBackendOrder();
        }
        return undefined;
      }).catch((error: unknown) => {
        if (error instanceof CheckoutApiError && error.code === "ORDER_NOT_SUBMITTED") {
          return submitBackendOrder();
        }
        setNotice(checkoutErrorMessage(error, "No se pudo verificar. Conservamos la operación original."));
        return undefined;
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
      {step === "address" && <AddressStepContainer
        backendMockEnabled={backendMockEnabled}
        cartStatus={cartStatus}
        cartCount={cartSnapshot?.items.reduce((total, item) => total + item.quantity, 0) ?? 0}
        cartError={cartError}
        addressLoading={addressLoading}
        addresses={addresses}
        selectedId={selectedId}
        addingAddress={addingAddress}
        addressError={addressError}
        busy={busy}
        onRetryCart={retryCartLoad}
        onSelectAddress={(addressId) => { setSelectedId(addressId); invalidateQuote(); }}
        onAddAddress={() => { setAddingAddress(true); setAddressError(""); }}
        onCancelAddress={() => setAddingAddress(false)}
        onSaveAddress={saveAddress}
        onContinue={continueToSummary}
      />}
      {step === "summary" && quote && <CheckoutQuoteContainer quote={quote} backendMockEnabled={backendMockEnabled}
        expired={expired} invalid={quoteInvalid} stockUnavailable={stockUnavailable}>
        <CheckoutOrderSummary quote={quote} address={selectedAddress} />
        {quote.selectedBenefit ? <SelectedBenefit benefit={quote.selectedBenefit} busy={busy} disabled={quoteInvalid}
          message={couponMessage} onRemove={removeCoupon} /> : <CouponForm value={coupon} busy={busy}
          disabled={quoteInvalid || expired} hint={backendMockEnabled ? "Ingresa tu código promocional" : "Prueba SAVE20 o DEPORTE20"}
          message={couponMessage} onChange={setCoupon} onSubmit={applyCoupon} />}
        <div className="checkout-actions">
          {(expired || quoteInvalid) && <Button variant="secondary" onClick={refreshQuote} loading={busy}>Actualizar resumen</Button>}
          {stockUnavailable && <Link className="button button--secondary button--md" href="/carrito">Revisar carrito</Link>}
          <Button variant="tertiary" onClick={returnToAddress}>Volver a dirección</Button>
          <Button onClick={() => { setConsented(false); setStep("prepare"); }} disabled={expired || quoteInvalid || busy}>Continuar al pago simulado</Button>
        </div>
      </CheckoutQuoteContainer>}
       {step === "prepare" && quote && <section className="checkout-card" aria-labelledby="prepare-title"><h2 id="prepare-title">Pago simulado</h2><p>Al continuar, registraremos tu consentimiento. El pedido aún no existe y no se inicia un cobro real.</p><label className="checkout-consent"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />Entiendo que esta compra es una simulación y no habrá cobro real.</label><p>Total estimado: <strong>{formatCheckoutMoney(quote.total)}</strong></p><div className="checkout-actions"><Button variant="tertiary" onClick={returnToSummaryDuringPreparation}>Volver al resumen</Button><Button onClick={prepare} loading={busy} disabled={!consented || expired || quoteInvalid}>{hasPreparationAttempt ? "Reintentar misma preparación" : "Registrar consentimiento"}</Button></div></section>}
      {step === "order" && <section className="checkout-card" aria-labelledby="order-title"><h2 id="order-title">Confirma y crea tu pedido</h2><p>La simulación de pago ocurrirá después de crear el pedido. No habrá cobro real.</p>{notice && orderSubmission !== "REJECTED" && <p role="status" className="checkout-notice">{notice}</p>}{orderSubmission === "UNCERTAIN" ? <div className="checkout-actions"><Button onClick={verifyOriginalOperation} loading={busy}>Verificar operación original</Button></div> : orderSubmission === "REJECTED" ? <><p role="alert" className="checkout-error">{notice || "La operación no se completó y no fue confirmada como pagada."}</p><div className="checkout-actions"><Button onClick={() => window.location.assign("/catalogo")}>Seguir comprando</Button></div></> : <form className="checkout-form" onSubmit={createOrder}><TextField label="Nombre completo" required minLength={2} maxLength={120} value={contact.fullName} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} /><label className="checkout-label" htmlFor="documentType">Tipo de documento</label><select id="documentType" value={contact.documentType} onChange={(event) => setContact({ ...contact, documentType: event.target.value as Contact["documentType"] })}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option></select><TextField label="Número de documento" required minLength={5} maxLength={24} hint="Ingresa entre 5 y 24 caracteres. La misma longitud aplica a todos los tipos de documento." value={contact.documentNumber} onChange={(event) => setContact({ ...contact, documentNumber: event.target.value })} /><TextField label="Teléfono" type="tel" required minLength={5} maxLength={40} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /><TextField label="Correo electrónico" type="email" required maxLength={254} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /><div className="checkout-actions"><Button variant="tertiary" onClick={() => setStep("summary")}>Volver al resumen</Button><Button type="submit" loading={busy}>Crear pedido</Button></div></form>}</section>}
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
        <h3>Resumen de productos</h3>
        <ul className="checkout-lines" aria-label="Productos del pedido">
          {quote?.lines.map((line) => <li key={line.sku}>{line.sku} × {line.quantity}</li>)}
        </ul>
        <div className="checkout-actions">
          <Button variant="secondary" onClick={copyOrderCode} aria-label={`Copiar código de pedido ${orderId}`}>Copiar código</Button>
          {backendMockEnabled && verifiedOrder && <Link className="button button--secondary button--md" href={`/checkout/confirmado/${encodeURIComponent(orderId)}?operationId=${encodeURIComponent(operationId)}`}>Ver mi pedido</Link>}
          <Button onClick={() => window.location.assign("/")}>Seguir comprando</Button>
        </div>
        {copyMessage && <p role="status" aria-live="polite">{copyMessage}</p>}
        <p className="checkout-muted">Operación de prueba {operationId.slice(0, 8)}…</p>
      </section>}
    </main>
  );
}
