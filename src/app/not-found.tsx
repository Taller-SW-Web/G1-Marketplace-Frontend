import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty-state">
      <p className="eyebrow">INKA ATHLETICS</p>
      <h1>No encontramos esta página</h1>
      <p>Puedes volver al catálogo y seguir explorando.</p>
      <Link href="/catalogo" className="button">
        Volver al catálogo
      </Link>
    </div>
  );
}
