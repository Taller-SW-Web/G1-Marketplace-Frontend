import { useEffect, useRef } from "react";
import { Button } from "@/shared/ui/Button";

export function ReorderAction({ busy, onReorder }: { busy: boolean; onReorder: () => void }) {
  return <section aria-labelledby="reorder-action-title">
    <h2 id="reorder-action-title">Agregar productos al carrito</h2>
    <p>Se volverán a revisar los productos, precios y disponibilidad actuales. Esto no crea una compra.</p>
    <Button variant="primary" disabled={busy} onClick={onReorder}>
      {busy ? "Agregando productos…" : "Agregar productos al carrito"}
    </Button>
  </section>;
}

export type ReorderResult = {
  added: Array<{ sku: string; quantity: number }>;
  adjustments: Array<{ sku: string; reason: string }>;
};

export function ReorderResultDialog({
  result,
  opened,
  onViewCart,
  onClose,
}: {
  result: ReorderResult;
  opened: boolean;
  onViewCart: () => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!opened) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [opened]);
  if (!opened) return null;
  const hasAddedLines = result.added.length > 0;
  const title = result.adjustments.length === 0
    ? "Productos agregados al carrito"
    : hasAddedLines ? "Resultado parcial del reordenado" : "No se agregaron productos";

  return <div className="reorder-dialog-backdrop">
    <section className="reorder-dialog" role="dialog" aria-modal="true" aria-labelledby="reorder-result-title" onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (controls.length === 0) { event.preventDefault(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }}>
      <h2 id="reorder-result-title" ref={titleRef} tabIndex={-1}>{title}</h2>
      <p>El carrito actual se actualizó según la disponibilidad y los precios vigentes. No se creó una compra.</p>
      {hasAddedLines && <section aria-labelledby="reorder-added-title">
        <h3 id="reorder-added-title">Agregados</h3>
        <ul>{result.added.map((line, index) => <li key={`${line.sku}-${index}`}>SKU {line.sku} · Cantidad agregada: {line.quantity}</li>)}</ul>
      </section>}
      {result.adjustments.length > 0 && <section aria-labelledby="reorder-adjustments-title">
        <h3 id="reorder-adjustments-title">Ajustes o productos no disponibles</h3>
        <ul>{result.adjustments.map((line, index) => <li key={`${line.sku}-${index}`}>SKU {line.sku} · Motivo informado: {line.reason}</li>)}</ul>
      </section>}
      <div className="reorder-dialog-actions">
        {hasAddedLines && <Button variant="primary" onClick={onViewCart}>Ver carrito</Button>}
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
    </section>
  </div>;
}
