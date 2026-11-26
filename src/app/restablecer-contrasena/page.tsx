import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { g7RecoveryUrl } from "@/features/auth/g7-recovery-url";
import { LegacyResetNotice } from "@/features/auth/LegacyResetNotice";
export const metadata: Metadata = { title: "Restablecer contraseña", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function ResetPage() {
  const target = g7RecoveryUrl(process.env.NEXT_PUBLIC_G7_RECOVERY_URL, process.env.NODE_ENV);
  return <AuthShell title="Restablece tu contraseña en Seguridad" description="La recuperación de cuenta se realiza en la página de Seguridad.">
    <LegacyResetNotice />
    <p className="auth-small-copy">Si abriste un enlace anterior de Marketplace, solicita uno nuevo desde Seguridad.</p>
    {target && <a className="button button--primary button--md button--full" href={target} referrerPolicy="no-referrer">Ir a recuperación</a>}
    <Link className="auth-text-link" href="/login">Volver a iniciar sesión</Link>
  </AuthShell>;
}
