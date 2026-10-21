import { RecoverPasswordForm } from "@/features/auth/RecoverPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recupera tu contraseña" };

export default function RecoverPasswordPage() {
  return <RecoverPasswordForm />;
}
