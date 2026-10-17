import Link from "next/link";

export function AuthComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-card">
        <div className="auth-intro">
          <div className="auth-logo">
            <img src="/figma/logo.png" alt="Inka Athletics" width="210" height="158" />
          </div>
          <div className="auth-heading">
            <h1 id="auth-title">{title}</h1>
            <p>Esta función está planificada para {milestone} y aún no está disponible.</p>
          </div>
        </div>
        <Link className="auth-text-link" href="/login">Volver a iniciar sesión</Link>
      </div>
    </section>
  );
}
