import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";
import { authWebEnabled } from "@/features/auth/server";
import { g7RecoveryUrl } from "@/features/auth/g7-recovery-url";

export const metadata: Metadata = {
  title: "Inicia sesión",
  description: "Accede a tu cuenta de Inka Athletics.",
};

export default function LoginPage() {
  return <LoginForm realAuth={authWebEnabled()}
    recoveryUrl={g7RecoveryUrl(process.env.NEXT_PUBLIC_G7_RECOVERY_URL, process.env.NODE_ENV)} />;
}
