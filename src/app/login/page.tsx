import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Inicia sesión",
  description: "Vista de acceso de Inka Athletics para el corte de demostración H3.",
};

export default function LoginPage() {
  return <LoginForm />;
}
