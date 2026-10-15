"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <h1>No pudimos cargar esta página</h1>
      <p role="alert">Inténtalo nuevamente para continuar.</p>
      <button className="button" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
