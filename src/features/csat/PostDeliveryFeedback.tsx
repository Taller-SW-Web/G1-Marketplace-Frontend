"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import styles from "./feedback.module.css";

export type Sentiment = "GOOD" | "REGULAR" | "BAD";
export type FeedbackDraft = { sentiment: Sentiment; reasons: string[]; comment: string };
export type FeedbackResult = "submitted" | "duplicate" | "ineligible";
export type ReasonCatalog = Record<Sentiment, ReadonlyArray<{ code: string; label: string }>>;

export function PostDeliveryInvitation({ onEvaluate, onDismiss }: { onEvaluate(): void; onDismiss(): void }) {
  return <section className={styles.invitation} aria-labelledby="delivery-invitation">
    <div><span className={styles.eyebrow}>TU OPINIÓN CUENTA</span><h2 id="delivery-invitation">¿Cómo fue la entrega de tu pedido?</h2>
      <p>Cuéntanos qué salió bien y qué podemos mejorar.</p></div>
    <div className={styles.actions}><Button onClick={onEvaluate}>Evaluar entrega</Button><Button variant="tertiary" onClick={onDismiss}>Ahora no</Button></div>
  </section>;
}

export function usePostDeliveryFeedback(submit: (draft: FeedbackDraft, signal: AbortSignal) => Promise<FeedbackResult>) {
  const [sentiment, setSentiment] = useState<Sentiment>();
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"editing" | "sending" | FeedbackResult>("editing");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  function changeSentiment(value: Sentiment) { setSentiment(value); setReasons([]); setError(""); }
  function clear() { request.current?.abort(); request.current = null; setSentiment(undefined); setReasons([]); setComment(""); setError(""); setState("editing"); }
  async function send() {
    if (!sentiment || request.current || comment.length > 1000) return;
    const active = new AbortController(); request.current = active; setState("sending"); setError("");
    try { const result = await submit({ sentiment, reasons, comment }, active.signal); if (!active.signal.aborted) { setState(result); setComment(""); setReasons([]); } }
    catch { if (!active.signal.aborted) { setState("editing"); setError("No pudimos confirmar el envío. Tus respuestas siguen aquí. Puedes intentarlo de nuevo cuando lo decidas."); } }
    finally { if (request.current === active) request.current = null; }
  }
  return { sentiment, reasons, comment, state, error, changeSentiment, setReasons, setComment, send, clear };
}

export function PostDeliveryFeedback({ orderId, eligible, identity, catalog, submit }: {
  orderId: string; eligible: boolean; identity: string | null; catalog: ReasonCatalog;
  submit(draft: FeedbackDraft, signal: AbortSignal): Promise<FeedbackResult>;
}) {
  // Remount the private draft whenever the owner or order changes.
  return identity ? <FeedbackSession key={`${identity}:${orderId}`} orderId={orderId} eligible={eligible} catalog={catalog} submit={submit} /> : null;
}

function FeedbackSession({ orderId, eligible, catalog, submit }: {
  orderId: string; eligible: boolean; catalog: ReasonCatalog; submit(draft: FeedbackDraft, signal: AbortSignal): Promise<FeedbackResult>;
}) {
  const form = usePostDeliveryFeedback(submit);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const busy = form.state === "sending";
  useEffect(() => {
    if (open && eligible) { dialog.current?.showModal(); title.current?.focus(); }
    else dialog.current?.close();
  }, [open, eligible]);
  if (!eligible) return null;
  if (form.state === "submitted" || form.state === "duplicate") return <section className={styles.confirmation} role="status"><span aria-hidden="true">✓</span><h2>Gracias por compartir tu experiencia</h2><p>{form.state === "duplicate" ? "Esta entrega ya tenía una evaluación registrada." : "Tu evaluación fue registrada."}</p></section>;
  if (form.state === "ineligible") return <p role="status">Este pedido ya no está habilitado para evaluar. No registramos una evaluación nueva.</p>;
  return <>
    {!hidden && <PostDeliveryInvitation onEvaluate={() => setOpen(true)} onDismiss={() => { setHidden(true); setOpen(false); }} />}
    {hidden && <p className={styles.muted}>Invitación oculta en esta vista. <Button variant="tertiary" onClick={() => { setHidden(false); setOpen(true); }}>Evaluar entrega</Button></p>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="feedback-title" onCancel={event => { event.preventDefault(); if (!busy) setOpen(false); }} onClose={() => setOpen(false)}>
      <form onSubmit={event => { event.preventDefault(); void form.send(); }}>
        <div className={styles.top}><span className={styles.eyebrow}>EVALUACIÓN POSTENTREGA</span><Button variant="tertiary" disabled={busy} aria-label="Cerrar evaluación" onClick={() => setOpen(false)}>×</Button></div>
        <h2 ref={title} tabIndex={-1} id="feedback-title">¿Cómo fue tu entrega?</h2><p className={styles.muted}>Pedido {orderId}. Tu opinión nos ayuda a mejorar.</p>
        <fieldset disabled={busy} className={styles.fieldset}><legend>Elige una respuesta</legend><div className={styles.sentiments}>
          {([['GOOD', 'Bien', '☺'], ['REGULAR', 'Regular', '○'], ['BAD', 'Mal', '☹']] as const).map(([value, label, icon]) => <label key={value} className={`${styles.choice} ${form.sentiment === value ? styles.selected : ''}`}>
            <input type="radio" name="sentiment" value={value} checked={form.sentiment === value} onChange={() => form.changeSentiment(value)} /><span aria-hidden="true">{icon}</span>{label}</label>)}
        </div></fieldset>
        {form.sentiment && <fieldset disabled={busy} className={styles.fieldset}><legend>¿Qué destacarías? <span className={styles.optional}>Opcional</span></legend><div className={styles.reasons}>
          {catalog[form.sentiment].map(reason => <label key={reason.code}><input type="checkbox" checked={form.reasons.includes(reason.code)} onChange={event => form.setReasons(event.target.checked ? [...form.reasons, reason.code] : form.reasons.filter(code => code !== reason.code))} />{reason.label}</label>)}
        </div></fieldset>}
        <label className={styles.comment}>¿Quieres contarnos algo más? <span className={styles.optional}>Opcional</span><textarea disabled={busy} value={form.comment} maxLength={1000} rows={4} aria-describedby="feedback-count" onChange={event => form.setComment(event.target.value)} /></label>
        <p id="feedback-count" className={styles.counter}>{form.comment.length}/1000 caracteres</p>
        {form.sentiment === 'BAD' && <p className={styles.muted}>Esta evaluación no crea un reclamo automáticamente.</p>}
        {form.error && <p role="alert" className={styles.error}>{form.error}</p>}
        <div className={styles.actions}><Button type="submit" disabled={!form.sentiment || busy} loading={busy} loadingLabel="Enviando evaluación">{busy ? 'Enviando…' : 'Enviar evaluación'}</Button><Button variant="tertiary" disabled={busy} onClick={() => setOpen(false)}>Ahora no</Button></div>
        <p className={styles.footnote}>Cerrar no envía respuestas ni registra un descarte permanente.</p>
      </form>
    </dialog>
  </>;
}
