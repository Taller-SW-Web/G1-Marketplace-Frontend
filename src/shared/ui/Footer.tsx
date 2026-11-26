import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <span className="footer-brand">INKA ATHLETICS</span>
        <div className="footer-links" aria-label="Información y ayuda">
          <button disabled title="Próximamente">Ayuda y contacto</button>
          <button disabled title="Próximamente">Envíos y devoluciones</button>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
        </div>
      </div>
      <p className="footer-copyright">© Inka Athletics · Deporte a tu ritmo.</p>
    </footer>
  );
}
