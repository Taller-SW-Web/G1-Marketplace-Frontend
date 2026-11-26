import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, introduction, children }: { title: string; introduction: string; children: ReactNode }) {
  return <main id="contenido" className="legal-page">
    <article className="legal-document">
      <nav aria-label="Navegación legal" className="legal-nav"><Link href="/registro">Volver al registro</Link></nav>
      <p className="legal-eyebrow">Inka Athletics · Marketplace académico</p>
      <h1>{title}</h1>
      <p className="legal-version">Versión de demostración 0.1 · 1 de noviembre de 2026</p>
      <p className="legal-lead">{introduction}</p>
      <div className="legal-sections">{children}</div>
      <nav aria-label="Otros documentos" className="legal-bottom-nav">
        <Link href="/terminos">Términos de uso</Link>
        <Link href="/privacidad">Política de privacidad</Link>
      </nav>
    </article>
  </main>;
}
