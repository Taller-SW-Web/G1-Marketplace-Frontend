import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { g7RecoveryUrl } from "@/features/auth/g7-recovery-url";

export const metadata: Metadata = { title: "Recupera tu contraseña", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function RecoverPasswordPage() {
  const target = g7RecoveryUrl(process.env.NEXT_PUBLIC_G7_RECOVERY_URL, process.env.NODE_ENV);
  if (target) redirect(target);
  return <AuthShell title="Recuperación no disponible" description="No pudimos abrir la recuperación de contraseña en este momento.">
    <p className="auth-small-copy">Inténtalo más tarde.</p>
    <Link className="auth-text-link" href="/login">Volver a iniciar sesión</Link>
  </AuthShell>;
}
