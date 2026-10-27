import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";
import { authWebEnabled } from "@/features/auth/server";

export const metadata: Metadata = {
  title: "Inicia sesión",
  description: "Accede a tu cuenta de Inka Athletics.",
};

export default function LoginPage() {
  return <LoginForm realAuth={authWebEnabled()} />;
}
