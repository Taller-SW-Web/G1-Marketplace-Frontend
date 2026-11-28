"use client";
import { useSyncExternalStore } from "react";
import "./status-pages.css";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export default function ErrorPage({ reset }: { reset: () => void }) {
  // Solo cambia el texto mostrado: sin conexión no es lo mismo que un fallo del servicio.
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false);
  return (
    <div className="container empty-state status-page">
      <span className="status-page__icon" aria-hidden="true">{offline ? "⌁" : "!"}</span>
      <h1>{offline ? "Sin conexión a internet" : "No pudimos cargar esta página"}</h1>
      <p role="alert">{offline ? "Revisa tu conexión. Cuando vuelvas a estar en línea, reintenta para continuar." : "Inténtalo nuevamente para continuar."}</p>
      <div className="status-page__actions">
        <button className="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
