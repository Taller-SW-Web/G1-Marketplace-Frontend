import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer marketplace-footer">
      <div className="marketplace-container">
        <div className="marketplace-footer-main">
          <div>
            <Link className="footer-brand" href="/">Inka Athletics</Link>
            <p>Deporte a tu ritmo.</p>
          </div>
          <nav aria-label="Explora Marketplace">
            <h2>Explora</h2>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/favoritos">Favoritos</Link>
            <Link href="/mis-pedidos">Mis pedidos</Link>
          </nav>
          <nav aria-label="Información legal">
            <h2>Información legal</h2>
            <Link href="/terminos">Términos de uso</Link>
            <Link href="/privacidad">Privacidad</Link>
          </nav>
        </div>
        <p className="marketplace-footer-copy">© Inka Athletics</p>
      </div>
    </footer>
  );
}
