import { RegistrationForm } from "@/features/auth/RegistrationForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crea tu cuenta" };

export default function RegisterPage() {
  return <RegistrationForm termsUrl="/terminos" privacyUrl="/privacidad" />;
}
