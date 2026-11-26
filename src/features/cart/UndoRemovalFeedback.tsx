'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/shared/ui/Button';
import type { UndoRemovalFeedbackProps } from './types';

/**
 * CMP-F018-002 · UndoRemovalFeedback (Overlay O-006)
 *
 * Feedback accesible con acción temporal para recuperar una línea retirada del carrito.
 * Conforme a SPEC UI O-006 y WCAG 2.1 AA:
 * - Ventana temporal de 5 segundos con indicador no exclusivo.
 * - Pausa automática de la cuenta regresiva al interactuar mediante hover o foco de teclado.
 * - Anuncio accesible con role="status" y aria-live="polite" (no roba foco al aparecer).
 * - Acción primaria "Deshacer" y acción secundaria "Cerrar".
 */
export function UndoRemovalFeedback({
  label,
  canUndo = true,
  remainingSeconds = 5,
  busy = false,
  onUndo,
  onDismiss,
}: UndoRemovalFeedbackProps) {
  const [secondsLeft, setSecondsLeft] = useState(remainingSeconds);
  const [prevRemainingSeconds, setPrevRemainingSeconds] = useState(remainingSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const onDismissRef = useRef(onDismiss);

  if (prevRemainingSeconds !== remainingSeconds) {
    setPrevRemainingSeconds(remainingSeconds);
    setSecondsLeft(remainingSeconds);
  }

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (isPaused || busy) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, busy]);

  return (
    <aside
      className="undo-removal-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="undo-removal-content">
        <p className="undo-removal-message">
          Quitaste <strong>{label}</strong> del carrito.
        </p>

        <div className="undo-removal-actions">
          {canUndo && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onUndo}
              aria-label={`Deshacer eliminación de ${label}`}
            >
              {busy ? 'Restaurando…' : `Deshacer (${secondsLeft}s)`}
            </Button>
          )}

          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={onDismiss}
            aria-label="Cerrar notificación de eliminación"
            className="undo-dismiss-btn"
          >
            ✕
          </Button>
        </div>
      </div>
      <div
        className="undo-removal-progress-bar"
        style={{
          width: `${(secondsLeft / remainingSeconds) * 100}%`,
          transition: isPaused ? 'none' : 'width 1s linear',
        }}
        aria-hidden="true"
      />
    </aside>
  );
}
