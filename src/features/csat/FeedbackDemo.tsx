"use client";
import { useState } from "react";
import { PostDeliveryFeedback, type ReasonCatalog, type FeedbackResult } from "./PostDeliveryFeedback";

// Demonstration-only labels/codes, not a homologated external reason catalog.
const catalog: ReasonCatalog = {
  GOOD: [{ code: 'ENTREGA_RAPIDA', label: 'Llegó a tiempo' }, { code: 'BUEN_ESTADO', label: 'Producto en buen estado' }],
  REGULAR: [{ code: 'COMUNICACION', label: 'Comunicación por mejorar' }, { code: 'EMPAQUE', label: 'Empaque por mejorar' }],
  BAD: [{ code: 'RETRASO', label: 'Entrega tardía' }, { code: 'DANOS', label: 'Producto dañado' }],
};
const options = { exito: 'Entrega elegible', error: 'Error al enviar', duplicado: 'Evaluación ya registrada', 'no-elegible': 'Elegibilidad cambió al enviar', pendiente: 'Pedido no entregado', logout: 'Sesión cerrada' };
export function FeedbackDemo() {
  const [scenario, setScenario] = useState<keyof typeof options>('exito');
  return <>
    <aside className="favorites-demo-controls"><p><strong>Demostración local de evaluación</strong> · Pedido, motivos y envíos simulados. No modifica cuentas reales.</p>
      <label htmlFor="feedback-scenario">Escenario</label><select id="feedback-scenario" value={scenario} onChange={event => setScenario(event.target.value as keyof typeof options)}>{Object.entries(options).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
      <p><a href="/demo/h3/favoritos/lista?estado=carrito">Volver a favoritos</a></p></aside>
    <h1>Tu pedido</h1><p>Pedido de demostración · PED-2026-00001</p>
    <section style={{ padding:24, border:'1px solid var(--border)', borderRadius:16, background:'white' }}><h2>{scenario === 'pendiente' ? 'Preparando tu pedido' : 'Pedido entregado'}</h2><p>{scenario === 'pendiente' ? 'La evaluación todavía no está disponible.' : 'La entrega ha finalizado. Puedes compartir tu experiencia.'}</p></section>
    {scenario === 'logout' && <p role="status">Sesión cerrada. No se muestran datos ni borradores de evaluación.</p>}
    <PostDeliveryFeedback key={scenario} orderId="PED-2026-00001" eligible={scenario !== 'pendiente'} identity={scenario === 'logout' ? null : 'demo-A'} catalog={catalog}
      submit={async (_draft, signal): Promise<FeedbackResult> => {
        await new Promise<void>((resolve,reject) => { const timer=setTimeout(resolve,700); signal.addEventListener('abort',()=> {clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true}); });
        if (scenario === 'error') throw new Error('Simulated provider failure');
        return scenario === 'duplicado' ? 'duplicate' : scenario === 'no-elegible' ? 'ineligible' : 'submitted';
      }} />
  </>;
}
