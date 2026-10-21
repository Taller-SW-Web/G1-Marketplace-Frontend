import type { ReactNode } from "react";
export function AuthShell({ title, description, wide = false, compact = false, children }: { title: string; description: string; wide?: boolean; compact?: boolean; children: ReactNode }) {
  return <section className={`auth-page auth-page--account${wide ? " auth-page--registration" : ""}`} aria-labelledby="auth-title">
    <div className={`auth-card${wide ? " auth-card--wide" : ""}${compact ? " auth-card--compact" : ""}`}>
      <div className="auth-intro"><div className="auth-logo"><img src="/figma/logo.png" alt="Inka Athletics" width="210" height="158" /></div>
        <div className="auth-heading"><h1 id="auth-title">{title}</h1><p>{description}</p></div>
      </div>
      {children}
    </div>
  </section>;
}
