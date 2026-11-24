import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer h5-shell-footer">
      <div className="footer-content">
        <p className="footer-brand">Inka Athletics Marketplace</p>
        <div className="h5-shell-footer-groups">
          <nav aria-label="Compras">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/mis-pedidos">Mis pedidos</Link>
          </nav>
          <nav aria-label="Ayuda y políticas">
            <span>Ayuda con mi pedido</span>
            <span>Envíos y devoluciones</span>
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
