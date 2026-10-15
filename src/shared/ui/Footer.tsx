import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div>
          <span className="footer-brand">INKA ATHLETICS</span>
          <p>Equipamiento para acompañarte en cada meta.</p>
        </div>
        <nav aria-label="Navegación del pie">
          <Link href="/">Inicio</Link>
          <Link href="/catalogo">Catálogo</Link>
        </nav>
        <p className="footer-signature">HECHO PARA MOVERTE.</p>
      </div>
    </footer>
  );
}
